const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { roleGuard } = require("../middleware/roleGuard");
const {
  createFollowUpForm,
  getActiveFollowUpForm,
  createProjectFollowUpRequest,
} = require("../controllers/followupsController");

//گرفتن فرم فعال پیگیری
router.get("/forms/active", auth, getActiveFollowUpForm);

//ارسال درخواست پیگیری برای پروژه
router.post("/:id/follow-ups", auth, createProjectFollowUpRequest);

//لیست پیگیری‌های خود کاربر
router.get("/follow-ups", auth);

//جزئیات یک پیگیری برای کاربر
router.get("/follow-ups/:id", auth);

module.exports = router;
