const profileService = require("../services/profileService");
const { errorResponse, successResponse } = require("../utils/responses");

exports.updateProfile = async (req, res) => {
  try {
    const currentUser = req.user; // کاربر لاگین شده
    const targetUserId = req.body.userId || currentUser.id; // اگر SUPER_ADMIN بخواد کاربر دیگه رو آپدیت کنه
    const profileData = req.body;

    const updatedUser = await profileService.updateProfile(
      currentUser,
      targetUserId,
      profileData,
    );

    const safeUpdatedUser = { ...updatedUser };
    delete safeUpdatedUser.password;

    return successResponse(res, 200, safeUpdatedUser);
  } catch (err) {
    console.error(err);
    const status = err.statusCode || 500;
    return errorResponse(
      res,
      status,
      err.message || "خطا در بروزرسانی پروفایل",
    );
  }
};
