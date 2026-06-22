const {
  getUserNotificationsService,
  markNotificationAsReadService,
} = require("../services/notificationService");

exports.getUserNotificationsController = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;

    const notifications = await getUserNotificationsService(currentUserId);

    return res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

exports.markNotificationAsReadController = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const { id } = req.params;

    const notification = await markNotificationAsReadService(id, currentUserId);

    return res.status(200).json({
      success: true,
      message: "اعلان خوانده شد.",
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};
