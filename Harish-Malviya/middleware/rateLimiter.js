const rateLimit = require('express-rate-limit');

/**
 * Strict rate limiter for ticket booking to prevent scalpers and bot spam.
 * Limit: 10 booking requests per 1 minute (60,000 ms)
 */
const bookingRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 10, // Limit each IP to 10 requests per windowMs
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  statusCode: 429,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many booking attempts. Rate limit of 10 requests per minute exceeded. Please try again later.'
    });
  }
});

module.exports = {
  bookingRateLimiter
};
