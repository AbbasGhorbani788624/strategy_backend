const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  generateSummary,
  sendMessageToChat,
} = require("../controllers/chatController");

router.post("/generate-summary", auth, generateSummary);
router.post("/", auth, sendMessageToChat);

module.exports = router;
