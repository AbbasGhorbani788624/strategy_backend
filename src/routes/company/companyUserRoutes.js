const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const { roleGuard } = require("../../middleware/roleGuard");
const {
  createCompanyUser,
  deleteCompanyUser,
  usersColleague,
} = require("../../controllers/companyUserController");
const {
  createCompanyuserSchema,
} = require("../../validations/createCompanyUserValidation");
const {
  getCompanyMemebers,
  updateCompany,
  deleteRecord,
  patchCompany,
} = require("../../controllers/companyController");

const {
  createCompanySchema,
} = require("../../validations/creatCompanyValidation");

const { multerStorage } = require("../../utils/fileMulterConfig");
const upload = multerStorage().fields([{ name: "files", maxCount: 50 }]);

//دریافت کاربران شرکت ها
router.get(
  "/:id/members",
  auth,
  roleGuard(["SUPER_ADMIN", "COMPANY"]),
  getCompanyMemebers,
);

// ساخت کاربران شرکت توسط ادمین ان اون شرکت
router.post(
  "/",
  auth,
  roleGuard(["COMPANY"]),
  createCompanyuserSchema,
  createCompanyUser,
);

// حذف کاربر
router.delete(
  "/:id",
  auth,
  roleGuard(["COMPANY", "SUPER_ADMIN"]),
  deleteCompanyUser,
);

// ویرایش اکانت شرکت
router.put(
  "/:id",
  auth,
  roleGuard(["SUPER_ADMIN", "COMPANY"]),
  createCompanySchema,
  updateCompany,
);
//اضافه و تغییر پروفایل شرکت
router.patch(
  "/",
  auth,
  roleGuard(["SUPER_ADMIN", "COMPANY"]),
  upload,
  patchCompany,
);

//حذف رکورد  از پروفایل شرکت
router.delete(
  "/",
  auth,
  roleGuard(["SUPER_ADMIN", "COMPANY"]),
  upload,
  deleteRecord,
);

//گرفتن لیست همکاران
router.get("/colleague", auth, usersColleague);

module.exports = router;
