// routes/companyRoutes.js
const express = require("express");
const router = express.Router();

const auth = require("../../middleware/auth");
const { roleGuard } = require("../../middleware/roleGuard");
const {
  createCompanyWithAdmin,
} = require("../../controllers/companyController");
const {
  createCompanySchema,
} = require("../../validations/creatCompanyValidation");

//ساخت اکانت شرکت
router.post(
  "/create",
  auth,
  roleGuard(["SUPER_ADMIN"]),
  createCompanySchema,
  createCompanyWithAdmin,
);

// ویرایش اکانت شرکت

// حذف شخصی از افراد شرکت

module.exports = router;
