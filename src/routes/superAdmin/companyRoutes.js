// routes/companyRoutes.js
const express = require("express");
const router = express.Router();

const auth = require("../../middleware/auth");
const { roleGuard } = require("../../middleware/roleGuard");
const {
  createCompanyWithAdmin,
  getAllCompany,
  deleteCompany,
  getCompany,
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

//دریافت همه شرکت ها
router.get("/", auth, roleGuard(["SUPER_ADMIN"]), getAllCompany);

//حذف شرکت
router.get("/id", auth, roleGuard(["SUPER_ADMIN"]), getCompany);

//دریافت شرکت
router.delete("/id", auth, roleGuard(["SUPER_ADMIN"]), deleteCompany);

module.exports = router;
