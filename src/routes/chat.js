// routes/chat.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  createChat,
  getChat,
  getChatJobStatus,
} = require("../controllers/chatController");

router.post("/", auth, createChat);
router.get("/jobs/:jobId", auth, getChatJobStatus);
router.get("/", auth, getChat);

module.exports = router;