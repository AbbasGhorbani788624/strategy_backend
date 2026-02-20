import type { Request, Response, NextFunction } from "express";
const { errorResponse } = require("../utils/responses");

type Role = "SUPER_ADMIN" | "COMPANY" | "MEMBER";

exports.roleGuard = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
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
