import type { Request, Response, NextFunction } from "express";

const { errorResponse } = require("../utils/responses");
const jwt = require("jsonwebtoken");
const prisma = require("../prismaClient");

exports.auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.access_token;
    if (!token) {
      return errorResponse(res, 401, "توکن ارائه نشده است!");
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET_KEY);
    } catch (err) {
      return errorResponse(res, 401, "توکن نامعتبر یا منقضی شده است!");
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      return errorResponse(res, 404, "کاربری یافت نشد!");
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};
