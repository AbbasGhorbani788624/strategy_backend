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
  postCompanyBasicInfo,
  getCompanyProfileController,
  putCompanyManagers,
  getCompanyRevenueCentersController,
  syncCompanyRevenueCentersController,
  getCompanyShareholdersController,
  syncCompanyShareholdersController,
  syncOrganizationUnitsController,
  syncCompanyLicenseCertificatesController,
  syncCompanyMemberships,
  saveCompanyProductServicesController,
  syncCompanyMarkets,
  syncCompanyKeyCustomers,
  syncCompanyResourceCapabilities,
  putCompanyBalanceSheets,
  putCompanyIncomeStatements,
} = require("../../controllers/companyController");

const { multerStorage } = require("../../utils/fileMulterConfig");
const {
  updateCompanySchema,
} = require("../../validations/updateCompanySchema");
const upload = multerStorage();

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
  updateCompanySchema,
  updateCompany,
);

//گرفتن لیست همکاران
router.get("/colleague", auth, usersColleague);

///
router.post(
  "/company-basic-info",
  auth,
  roleGuard(["SUPER_ADMIN", "COMPANY"]),
  postCompanyBasicInfo,
);

//////
router.post(
  "/company-managers",
  auth,
  roleGuard(["SUPER_ADMIN", "COMPANY"]),
  upload.array("resumeFiles"),
  putCompanyManagers,
);

router.post(
  "/revenue-centers",
  auth,
  roleGuard(["SUPER_ADMIN", "COMPANY"]),
  syncCompanyRevenueCentersController,
);

router.post(
  "/shareholders",
  auth,
  roleGuard(["SUPER_ADMIN", "COMPANY"]),
  syncCompanyShareholdersController,
);

router.post(
  "/organization-units",
  auth,
  roleGuard(["SUPER_ADMIN", "COMPANY"]),
  upload.array("structureFiles"),
  syncOrganizationUnitsController,
);

router.post(
  "/license-certificates",
  auth,
  roleGuard(["SUPER_ADMIN", "COMPANY"]),
  upload.array("attachmentFiles"),
  syncCompanyLicenseCertificatesController,
);

router.post(
  "/memberships",
  auth,
  roleGuard(["SUPER_ADMIN", "COMPANY"]),
  syncCompanyMemberships,
);

router.post(
  "/product-services",
  auth,
  roleGuard(["SUPER_ADMIN", "COMPANY"]),
  saveCompanyProductServicesController,
);

router.post(
  "/markets",
  auth,
  roleGuard(["SUPER_ADMIN", "COMPANY"]),
  syncCompanyMarkets,
);

router.post(
  "/key-customers",
  auth,
  roleGuard(["SUPER_ADMIN", "COMPANY"]),
  syncCompanyKeyCustomers,
);

router.post(
  "/resource-capabilities",
  auth,
  roleGuard(["SUPER_ADMIN", "COMPANY"]),
  syncCompanyResourceCapabilities,
);

router.post(
  "/balance/balance-sheets",
  auth,
  roleGuard(["SUPER_ADMIN", "COMPANY"]),
  upload.array("balanceFiles"),
  putCompanyBalanceSheets,
);

router.post(
  "/income/income-statements",
  auth,
  roleGuard(["SUPER_ADMIN", "COMPANY"]),
  upload.array("incomeFiles"),
  putCompanyIncomeStatements,
);

router.get(
  "/company-profile",
  auth,
  roleGuard(["SUPER_ADMIN", "COMPANY"]),
  getCompanyProfileController,
);

module.exports = router;
