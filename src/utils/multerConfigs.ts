import type { Request } from "express";

const multer = require("multer");
const fs = require("fs");
const path = require("path");

export const profilePictureUploader = (userId: number | string) => {
  const BASE_DIR = path.resolve(__dirname, "..", "..", "uploads", "profiles");

  const storage = multer.diskStorage({
    destination: (req: Request, file, cb) => {
      //ساخت پوشه جدت برای هرکاربر
      const userDir = path.join(BASE_DIR, `user_${userId}`);

      fs.mkdirSync(userDir, { recursive: true });
      cb(null, userDir);
    },

    filename: (req: Request, file, cb) => {
      cb(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: 4 * 1024 * 1024 }, // 4MB
    fileFilter: (req: Request, file, cb) => {
      const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("فقط عکس (jpg, png, webp) مجاز است"), false);
      }
    },
  });
};
