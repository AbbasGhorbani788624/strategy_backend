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

// ساخت کاربران شرکت توسط ادمین ان
router.post(
  "/",
  auth,
  roleGuard(["COMPANY"]),
  createCompanyuserSchema,
  createCompanyUser,
);
//اگر پروژه داشت با نزار حذف کنه یا ابشاری حذف کنه
router.delete("/:id", auth, roleGuard(["COMPANY"]), deleteCompanyUser);

module.exports = router;
