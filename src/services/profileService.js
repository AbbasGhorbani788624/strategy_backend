const { findById, update } = require("../repositories/userRepository");
const { createBadRequestError, deleteImage } = require("../utils");

const updateProfileService = async (currentUser, targetUserId, profileData) => {
  const user = await findById(targetUserId);

  if (!user) {
    createBadRequestError("کاربر پیدا نشد", 404);
  }

  const isSelf = currentUser.id === targetUserId;

  if (currentUser.role === "MEMBER") {
    if (!isSelf) {
      throw createBadRequestError(
        "شما فقط می‌توانید پروفایل خودتان را ویرایش کنید",
        403,
      );
    }
  } else if (currentUser.role === "COMPANY") {
    if (!isSelf && user.companyId !== currentUser.companyId) {
      throw createBadRequestError(
        "شما فقط می‌توانید پروفایل اعضای شرکت خود را ویرایش کنید",
        403,
      );
    }
  }

  const { username, email, phoneNumber, avatar, fullName, profile } =
    profileData;

  if (avatar && user.avatar) {
    deleteImage(user.avatar);
  }

  const updateData = {
    username,
    email,
    phoneNumber,
    avatar,
    fullname: fullName,
    profile,
    profileCompleted: !!(username && email && phoneNumber && fullName),
  };

  const updatedUser = update(targetUserId, updateData);

  return updatedUser;
};

module.exports = { updateProfileService };
