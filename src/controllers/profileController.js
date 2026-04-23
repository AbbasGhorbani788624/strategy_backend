const { updateProfileService } = require("../services/profileService");
const { successResponse } = require("../utils/responses");

exports.updateProfile = async (req, res, next) => {
  try {
    const currentUser = req.user; // کاربر لاگین شده
    const targetUserId = req.body.userId || currentUser.id;
    const profileData = req.body;

    if (req.file) {
      profileData.avatar = req.file.filename;
    }
    const updatedUser = await updateProfileService(
      currentUser,
      targetUserId,
      profileData,
    );

    const safeUpdatedUser = { ...updatedUser };
    delete safeUpdatedUser.password;

    return successResponse(res, 200, safeUpdatedUser);
  } catch (err) {
    console.error(err);
    next();
  }
};
