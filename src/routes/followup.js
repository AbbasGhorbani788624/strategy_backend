const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { roleGuard } = require("../middleware/roleGuard");
const {
  createFollowUpForm,
  getActiveFollowUpForm,
  createProjectFollowUpRequest
} = require("../controllers/followupsController");
const { followupSchema } = require("../validations/followup/creratefollowup");

//گرفتن فرم فعال پیگیری
router.get("/forms/active", auth, getActiveFollowUpForm);

//ارسال درخواست پیگیری برای پروژه
router.post("/:id/follow-ups", auth,createProjectFollowUpRequest);

//لیست پیگیری‌های خود کاربر
router.get("/follow-ups", auth);

//جزئیات یک پیگیری برای کاربر
router.get("/follow-ups/:id", auth);

//ساخت فرم پیگیری
router.post(
  "/admin/forms",
  auth,
  roleGuard(["SUPER_ADMIN"]),
  followupSchema,
  createFollowUpForm,
);

//لیست فرم‌های پیگیری
router.get("/admin/forms", auth, roleGuard(["SUPER_ADMIN"]));

//ویرایش فرم پیگیری
router.put("/admin/forms/:id", auth, roleGuard(["SUPER_ADMIN"]));

//حذف فرم پیگیری
router.get("/admin/forms/:id", auth, roleGuard(["SUPER_ADMIN"]));

//لیست درخواست‌های پیگیری
router.get("/admin/follow-ups", auth, roleGuard(["SUPER_ADMIN"]));

//جزئیات درخواست پیگیری
router.get("/admin/follow-ups/:id", auth, roleGuard(["SUPER_ADMIN"]));

//پاسخ به درخواست پیگیری
router.post("/admin/follow-ups/:id/answer", auth, roleGuard(["SUPER_ADMIN"]));

module.exports = router;
