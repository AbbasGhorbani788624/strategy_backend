const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { roleGuard } = require("../middleware/roleGuard");
const {
  createFollowUpForm,
  getActiveFollowUpForm,
  createProjectFollowUpRequest,
  getMyFollowUpsController,
} = require("../controllers/followupsController");

router.get("/", auth, getMyFollowUpsController);

//گرفتن فرم فعال پیگیری
router.get("/forms/active", auth, getActiveFollowUpForm);

//ارسال درخواست پیگیری برای پروژه
router.post("/:id/follow-ups", auth, createProjectFollowUpRequest);

//جزئیات یک پیگیری برای کاربر
router.get("/follow-ups/:id", auth);

module.exports = router;
