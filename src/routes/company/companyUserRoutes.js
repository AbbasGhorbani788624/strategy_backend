const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const { roleGuard } = require("../../middleware/roleGuard");
const {
  createCompanyUser,
  deleteCompanyUser,
} = require("../../controllers/companyUserController");
const {
  createCompanyuserSchema,
} = require("../../validations/createCompanyUserValidation");
const {
  getCompanyMemebers,
  updateCompany,
} = require("../../controllers/companyController");
const {
  createCompanySchema,
} = require("../../validations/creatCompanyValidation");

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

module.exports = router;
