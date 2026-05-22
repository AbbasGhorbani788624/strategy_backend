const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const multerStorage = () => {
  const BASE_DIR = path.resolve(__dirname, "..", "..", "uploads", "file");

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      if (!fs.existsSync(BASE_DIR)) {
        fs.mkdirSync(BASE_DIR, { recursive: true });
      }
      cb(null, BASE_DIR);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + crypto.randomUUID();
      cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  });

  const allowedMimes = [
    "application/pdf", // PDF
    "application/msword", // Word 97-2003
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // Word 2007+
    "application/vnd.ms-excel", // Excel 97-2003
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // Excel 2007+
    "image/jpeg", // JPG / JPEG
    "image/png", // PNG
    "image/gif", // GIF
    "image/webp", // WEBP
  ];

  return multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(
          new Error(
            "فرمت فایل نامعتبر است. فقط PDF، Word و Excel مجاز می‌باشد.",
          ),
          false,
        );
      }
    },
  });
};

module.exports = { multerStorage };
