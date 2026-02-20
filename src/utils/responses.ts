import type { Response } from "express";

const errorResponse = (
  res: Response,
  statusCode: number,
  message: string,
  data?: any,
): Response => {
  return res
    .status(statusCode)
    .json({ status: statusCode, success: false, error: message, data });
};

const successResponse = (
  res: Response,
  statusCode: number = 200,
  data?: any,
): Response => {
  return res
    .status(statusCode)
    .json({ status: statusCode, success: true, data });
};

module.exports = { errorResponse, successResponse };
