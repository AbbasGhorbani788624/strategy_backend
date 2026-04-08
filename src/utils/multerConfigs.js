const multer = require("multer");
const fs = require("fs");
const path = require("path");

const profilePictureUploader = () => {
  const BASE_DIR = path.resolve(__dirname, "..", "..", "uploads", "profiles");

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const userDir = path.join(BASE_DIR, `usersprofile`);

      fs.mkdirSync(userDir, { recursive: true });
      cb(null, userDir);
    },

    filename: (req, file, cb) => {
      cb(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
      const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("فقط عکس (jpg, png, webp) مجاز است"), false);
      }
    },
  });
};

module.exports = { profilePictureUploader };
