/**
 * In-memory IP-based rate limiter for the login route.
 * Max 10 attempts per IP per 5-minute window.
 * In production, replace with Redis-backed solution for multi-instance deployments.
 */

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes

const loginAttempts = new Map(); // IP -> { count, windowStart }

function loginRateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record || now - record.windowStart > WINDOW_MS) {
    // Start a fresh window
    loginAttempts.set(ip, { count: 1, windowStart: now });
    return next();
  }

  record.count += 1;
  if (record.count > MAX_ATTEMPTS) {
    const retryAfterSec = Math.ceil((WINDOW_MS - (now - record.windowStart)) / 1000);
    res.set('Retry-After', retryAfterSec);
    return res.status(429).json({
      success: false,
      message: `Too many login attempts. Please wait ${retryAfterSec} seconds before trying again.`
    });
  }

  next();
}

// Periodically sweep stale entries to prevent memory growth (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of loginAttempts.entries()) {
    if (now - record.windowStart > WINDOW_MS) {
      loginAttempts.delete(ip);
    }
  }
}, 10 * 60 * 1000);

module.exports = { loginRateLimiter };
