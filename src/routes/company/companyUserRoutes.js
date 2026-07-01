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
  getCompanyMemebers,
  updateCompany,
  postCompanyBasicInfo,
  getCompanyProfileController,
} = require("../../controllers/companyController");

const {
  create,
  update,
  remove,
} = require("../../controllers/companySectionController");

const { multerStorage } = require("../../utils/fileMulterConfig");
const {
  updateCompanySchema,
} = require("../../validations/updateCompanySchema");
const {
  createCompanyuserSchema,
} = require("../../validations/createCompanyUserValidation");
const upload = multerStorage();

//دریافت کاربران شرکت ها
router.get(
  "/members",
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
  updateCompanySchema,
  updateCompany,
);

//گرفتن لیست همکاران
router.get("/colleague/:id", auth, usersColleague);

router.post(
  "/company-basic-info",
  auth,
  roleGuard(["SUPER_ADMIN", "COMPANY"]),
  postCompanyBasicInfo,
);

router.get("/company-profile", auth, getCompanyProfileController);

router.post(
  "/:section",
  auth,
  roleGuard(["SUPER_ADMIN", "COMPANY"]),
  upload.any(),
  create,
);

router.patch(
  "/:section/:id",
  auth,
  roleGuard(["SUPER_ADMIN", "COMPANY"]),
  upload.any(),
  update,
);

router.delete("/:section/:id", auth, remove);

module.exports = router;
