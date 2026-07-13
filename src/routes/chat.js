// routes/chat.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { createChat, getChat } = require("../controllers/chatController");


router.post("/", auth, createChat);
router.get("/", auth, getChat);

module.exports = router;