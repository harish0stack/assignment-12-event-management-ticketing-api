const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No authorization header provided.'
      });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization format. Format must be: Bearer <token>'
      });
    }

    const token = parts[1];
    const secret = process.env.JWT_SECRET || 'supersecret_jwt_key_event_management_2026_harish_malviya';

    const decoded = jwt.verify(token, secret);
    req.user = decoded; // Contains id, email, role, name
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please log in again.'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid or malformed token.'
    });
  }
};

module.exports = auth;
