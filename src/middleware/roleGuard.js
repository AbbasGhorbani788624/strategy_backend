const { errorResponse } = require("../utils/responses");

const roleGuard = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return errorResponse(res, 401, "احراز هویت نشده است");
      }

      if (!allowedRoles.includes(req.user.role)) {
        return errorResponse(res, 403, "دسترسی غیرمجاز");
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = { roleGuard };
