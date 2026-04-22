const { findById, update } = require("../repositories/userRepository");
const { createBadRequestError } = require("../utils");

// اپدیت پروفایل با دسترسی بر اساس نقش
const props = ["companyId", "profile", "username"];

const updateProfileService = async (currentUser, targetUserId, profileData) => {
  const user = await findById(targetUserId, props);
  if (!user) {
    createBadRequestError("کاربر پیدا نشد", 404);
  }

  // چک دسترسی
  if (currentUser.role === "MEMBER" && targetUserId !== currentUser.id) {
    createBadRequestError(
      "شما فقط می‌توانید پروفایل خودتان را ویرایش کنید",
      403,
    );
  }

  if (
    currentUser.role === "COMPANY" &&
    user.companyId !== currentUser.companyId
  ) {
    createBadRequestError(
      "شما فقط می‌توانید پروفایل اعضای شرکت خود را ویرایش کنید",
      403,
    );
  }

  // محاسبه profileCompleted
  let profileCompleted = false;

  if (user.role === "SUPER_ADMIN") {
    user.profile = {
      avatar: profileData.avatar,
      fullName: profileData.full_name,
      username: user.username,
    };
    profileCompleted = true;
  } else {
    user.profile = {
      ...user.profile,
      ...profileData,
    };

    // اطلاعات اصلی مورد نیاز پروفایل
    const requiredFields = ["full_name", "email", "phone"];
    profileCompleted = requiredFields.every((f) => user.profile[f]);
  }

  const updateData = {
    profile: user.profile,
    profileCompleted,
  };

  // آپدیت username و password اگر ارسال شده
  if (profileData.username) updateData.username = profileData.username;
  if (profileData.password) {
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(profileData.password, salt);
    updateData.password = hashed;
  }

  return await update(targetUserId, updateData);
};

module.exports = { updateProfileService };
