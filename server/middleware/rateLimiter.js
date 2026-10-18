const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV === 'development';

const createCustomLimiter = (options) => {
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, opts) => {
      const retryAfterHeader = res.getHeader('Retry-After');
      const retryAfterSeconds = retryAfterHeader
        ? parseInt(retryAfterHeader, 10)
        : Math.ceil(opts.windowMs / 1000);

      const msg = typeof opts.message === 'object' && opts.message !== null
        ? opts.message.message
        : (opts.message || 'Too many attempts. Please pause a moment before trying again.');

      res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        isRateLimit: true,
        message: msg,
        retryAfter: retryAfterSeconds || 60,
        windowSeconds: Math.ceil(opts.windowMs / 1000)
      });
    },
    ...options
  });
};

const generalLimiter = createCustomLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: isDev ? 10000 : (parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 2000),
  message: { message: 'Too many requests to the store. Please pause a moment before browsing again.' },
  skip: (req) => {
    if (isDev) return true;
    const ip = req.ip || req.connection?.remoteAddress || '';
    if (ip === '127.0.0.1' || ip === '::1' || ip.includes('127.0.0.1')) return true;
    return false;
  }
});

const orderLimiter = createCustomLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.ORDER_RATE_LIMIT_MAX) || 20,
  message: { message: 'Too many orders submitted in a short time. Please wait 15 minutes before placing another order.' }
});

const authLimiter = createCustomLimiter({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 15,
  message: { message: 'Too many sign-in attempts detected. To protect your account, please wait before trying again.' }
});

module.exports = { generalLimiter, orderLimiter, authLimiter };
