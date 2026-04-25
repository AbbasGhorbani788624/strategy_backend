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

// ویرایش اکانت شرکت
//  اگر به تعداد کاربران  قرار داده شده اکانت ساخته شده بود  و میخواستیم تعداد رو عوض کنیم باید ارور بده  که  کاربرانی بیشتر از حد  تعیین شده وجود دارد
router.put(
  "/:id",
  auth,
  roleGuard(["SUPER_ADMIN", "COMPANY"]),
  createCompanySchema,
  updateCompany,
);

module.exports = router;
