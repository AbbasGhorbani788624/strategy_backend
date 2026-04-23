const prisma = require("../prismaClient");
const path = require("path");
const fs = require("fs");

const createBadRequestError = (message, statusCode) => {
  const err = new Error(message);
  err.statusCode = statusCode || 400;
  throw err;
};

const deleteImage = (filename) => {
  const filePath = path.resolve(
    __dirname,
    "..",
    "..",
    "uploads",
    "profiles",
    filename,
  );

  fs.unlink(filePath, (unlinkErr) => {
    if (unlinkErr) {
      console.error(`Error deleting file  at ${filePath}:`, unlinkErr);
    }
  });
};

const findUserAndDeleteImage = async (id) => {
  const user = await prisma.user.findById(id);
  if (!user) {
    throw createBadRequestError("چنین کاربری وجود ندارد");
  }
  const profileImage = user.avatar;
  if (profileImage) {
    deleteImage(profileImage);
  }
};

module.exports = { createBadRequestError, deleteImage, findUserAndDeleteImage };
