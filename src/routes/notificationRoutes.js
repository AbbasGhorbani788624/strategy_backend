const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { roleGuard } = require("../middleware/roleGuard");
const {
  getUserNotificationsController,
  markNotificationAsReadController,
} = require("../controllers/notificationController");

//گرفتن notification
router.get("/", auth, getUserNotificationsController);
//read کردن notif
router.patch("/:id/read", auth, markNotificationAsReadController);

module.exports = router;
