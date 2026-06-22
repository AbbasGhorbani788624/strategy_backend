const prisma = require("../prismaClient");
const { createBadRequestError } = require("../utils");

const markNotificationAsReadService = async (notificationId, currentUserId) => {
  if (!notificationId) {
    createBadRequestError("شناسه اعلان الزامی است.", 400);
  }

  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    createBadRequestError("اعلان یافت نشد.", 404);
  }

  if (notification.userId !== currentUserId) {
    createBadRequestError("اجازه دسترسی به این اعلان را ندارید.", 403);
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
};

const getUserNotificationsService = async (currentUserId) => {
  return prisma.notification.findMany({
    where: { userId: currentUserId },
    orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
  });
};

module.exports = {
  markNotificationAsReadService,
  getUserNotificationsService,
};
