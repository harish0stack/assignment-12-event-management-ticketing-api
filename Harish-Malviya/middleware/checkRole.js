/**
 * Role-Based Access Control middleware
 * @param  {...string} allowedRoles - Array or list of allowed roles (e.g. 'Organizer', 'Attendee')
 */
const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. User authentication required.'
      });
    }

    const userRole = String(req.user.role).toLowerCase();
    const hasRole = allowedRoles.some(
      (role) => String(role).toLowerCase() === userRole
    );

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. This action requires one of the following roles: [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`
      });
    }

    next();
  };
};

module.exports = checkRole;
