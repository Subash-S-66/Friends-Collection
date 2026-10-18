const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');

// Connect to MongoDB
connectDB();

const app = express();

// Security Hardening: Hide tech stack details & configure trust proxy
app.disable('x-powered-by');
app.set('trust proxy', 1);

// Security Headers via Helmet
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// CORS Configuration
const clientUrlClean = process.env.CLIENT_URL ? process.env.CLIENT_URL.replace(/\/$/, '') : null;
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  clientUrlClean
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin)) {
      return callback(null, true);
    }
    try {
      const hostname = new URL(origin).hostname;
      if (hostname.endsWith('.vercel.app')) {
        return callback(null, true);
      }
    } catch (e) {
      // invalid URL format
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Global Rate Limiting
app.use('/api/', generalLimiter);

// Body Parsing with size protection & raw body capture for payment webhooks
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// NoSQL Injection Sanitization (Strips operators starting with $ or containing .)
const sanitizeInput = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeInput);
  const sanitized = {};
  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      continue; // strip dangerous MongoDB operators
    }
    sanitized[key] = sanitizeInput(val);
  }
  return sanitized;
};

app.use((req, res, next) => {
  if (req.body) req.body = sanitizeInput(req.body);
  if (req.query) req.query = sanitizeInput(req.query);
  if (req.params) req.params = sanitizeInput(req.params);
  next();
});

// HTTP Parameter Pollution (HPP) Protection
app.use((req, res, next) => {
  if (req.query) {
    for (const [k, v] of Object.entries(req.query)) {
      if (Array.isArray(v) && ['category', 'subcategory', 'gender', 'sort', 'tag', 'search', 'page', 'limit'].includes(k)) {
        req.query[k] = v[v.length - 1]; // normalize to latest string
      }
    }
  }
  next();
});

// Ultra-Fast Gzip/Brotli Compression
app.use(compression({ threshold: 1024 }));

// Serve uploaded files with high-speed caching & fallback
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d',
  etag: true
}));
app.use('/uploads', (req, res) => {
  const isBanner = req.path && req.path.toLowerCase().includes('banner');
  const fallbackFile = isBanner ? 'banner.jpg' : 'card.png';
  res.sendFile(path.join(__dirname, 'uploads', fallbackFile));
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/banners', require('./routes/banners'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/cart', require('./routes/cart'));

const mongoose = require('mongoose');

// Helper to format uptime into human-readable duration
function getFormattedUptime(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

// Enterprise Health Check Handler
const healthCheckHandler = (req, res) => {
  const dbState = mongoose.connection.readyState;
  const isDbConnected = dbState === 1;

  const dbStateNames = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  const uptimeSeconds = Math.floor(process.uptime());
  const mem = process.memoryUsage();

  const healthData = {
    status: isDbConnected ? 'ok' : 'degraded',
    service: 'Friends Collections API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: uptimeSeconds,
      formatted: getFormattedUptime(uptimeSeconds)
    },
    database: {
      status: dbStateNames[dbState] || 'unknown',
      connected: isDbConnected,
      host: mongoose.connection.host || 'Atlas Cluster'
    },
    system: {
      memoryHeapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      memoryHeapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      memoryRssMB: Math.round(mem.rss / 1024 / 1024),
      nodeVersion: process.version
    }
  };

  // Return 503 if database connection is down, otherwise 200 OK
  const statusCode = isDbConnected ? 200 : 503;
  res.status(statusCode).json(healthData);
};

// Health Check Routes (compatible with AWS, Render, Docker, Kubernetes, and uptime monitors)
app.get('/health', healthCheckHandler);
app.get('/healthz', healthCheckHandler);
app.get('/api/health', healthCheckHandler);
app.get('/api/healthz', healthCheckHandler);

// Serve static client build if present (for full-stack deployment on Render)
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
if (require('fs').existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath, { maxAge: '1d', etag: true }));
  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/uploads') ||
      req.path.startsWith('/health')
    ) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Friends Collections Server running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV}`);
  console.log(`   API: http://localhost:${PORT}/api`);
  console.log(`   Frontend: ${process.env.CLIENT_URL || 'Integrated SPA'}\n`);
});
