// routes/companyRoutes.js
const express = require("express");
const router = express.Router();

const auth = require("../../middleware/auth");
const { roleGuard } = require("../../middleware/roleGuard");
const {
  createCompanyWithAdmin,
  updateCompanyWithAdmin,
} = require("../../controllers/companyController");
const {
  createCompanySchema,
} = require("../../validations/creatCompanyValidation");

//ساخت اکانت شرکت
router.post(
  "/",
  auth,
  roleGuard(["SUPER_ADMIN"]),
  createCompanySchema,
  createCompanyWithAdmin,
);

// ویرایش اکانت شرکت

//  اگر به تعداد کاربران  قرار داده شده اکانت ساخته شده بود  و میخواستیم تعداد رو عوض کنیم باید ارور بده  که  کاربرانی بیشتر از حد  تعیین شده وجود دارد
router.put(
  "/:id",
  auth,
  roleGuard(["SUPER_ADMIN"]),
  createCompanySchema,
  updateCompanyWithAdmin,
);

module.exports = router;
