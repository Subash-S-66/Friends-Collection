const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV === 'development';

const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: isDev ? 10000 : (parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 2000),
  message: { message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // In development mode or localhost requests, do not rate-limit browsing
    if (isDev) return true;
    const ip = req.ip || req.connection?.remoteAddress || '';
    if (ip === '127.0.0.1' || ip === '::1' || ip.includes('127.0.0.1')) return true;
    return false;
  }
});

const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.ORDER_RATE_LIMIT_MAX) || 20,
  message: { message: 'Too many orders placed. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 15,
  message: { message: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { generalLimiter, orderLimiter, authLimiter };
