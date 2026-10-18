/**
 * High-Performance In-Memory Cache with TTL & Pattern Invalidation
 * Designed for ultra-fast response times (<1ms) on high-traffic storefront endpoints
 */

const cacheStore = new Map();

// Default cleanup interval: 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cacheStore.entries()) {
    if (entry.expiresAt <= now) {
      cacheStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Express middleware to cache GET requests for a specified number of seconds
 * @param {number} ttlSeconds - Cache duration in seconds (default: 60)
 */
const cacheMiddleware = (ttlSeconds = 60) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Don't cache admin or authenticated user profile routes
    if (req.originalUrl.includes('/admin') || req.originalUrl.includes('/me') || req.headers.authorization) {
      return next();
    }

    const key = req.originalUrl;
    const now = Date.now();
    const cached = cacheStore.get(key);

    if (cached && cached.expiresAt > now) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}`);
      return res.json(cached.data);
    }

    // Intercept res.json to capture and cache response
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheStore.set(key, {
          data,
          expiresAt: now + ttlSeconds * 1000
        });
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}`);
      }
      return originalJson(data);
    };

    next();
  };
};

/**
 * Invalidate cache entries matching a substring or prefix
 * @param {string} prefix - Key substring or prefix to invalidate
 */
const invalidateCache = (prefix = '') => {
  if (!prefix) {
    cacheStore.clear();
    return;
  }
  for (const key of cacheStore.keys()) {
    if (key.includes(prefix)) {
      cacheStore.delete(key);
    }
  }
};

module.exports = {
  cacheMiddleware,
  invalidateCache,
  clearAllCache: () => cacheStore.clear()
};
