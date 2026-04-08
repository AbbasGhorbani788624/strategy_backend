const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  generateSummary,
  sendMessageToChat,
} = require("../controllers/chatController");

//ساخت  summary برای نشان دادن  در چت
router.post("/generate-summary", auth, generateSummary);

//فرستادن پیام داخل چت
router.post("/", auth, sendMessageToChat);

module.exports = router;
