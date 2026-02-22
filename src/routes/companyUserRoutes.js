const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { roleGuard } = require("../middleware/roleGuard");
const { createCompanyUser } = require("../controllers/companyUserController");
const {
  createCompanyuserSchema,
} = require("../validations/createCompanyUserValidation");

// ساخت کاربران شرکت توسط ادمین ان
router.post(
  "/",
  auth,
  roleGuard(["COMPANY"]),
  createCompanyuserSchema,
  createCompanyUser,
);

module.exports = router;
