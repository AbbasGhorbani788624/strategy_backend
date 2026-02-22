const userRepo = require("../repositories/userRepository");

// اپدیت پروفایل با دسترسی بر اساس نقش
const props = ["companyId", "profile", "username"];

const updateProfile = async (currentUser, targetUserId, profileData) => {
  const user = await userRepo.findById(targetUserId, props);
  if (!user) {
    const err = new Error("کاربر پیدا نشد");
    err.statusCode = 404;
    throw err;
  }

  // چک دسترسی
  if (currentUser.role === "MEMBER" && targetUserId !== currentUser.id) {
    const err = new Error("شما فقط می‌توانید پروفایل خودتان را ویرایش کنید");
    err.statusCode = 403;
    throw err;
  }

  if (
    currentUser.role === "COMPANY" &&
    user.companyId !== currentUser.companyId
  ) {
    const err = new Error(
      "شما فقط می‌توانید پروفایل اعضای شرکت خود را ویرایش کنید",
    );
    err.statusCode = 403;
    throw err;
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

  return await userRepo.update(targetUserId, updateData);
};

module.exports = { updateProfile };
