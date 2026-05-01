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
  getAllFeedbackRequests,
  respondToFeedbackRequest,
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

//دریافت شرکت
router.get("/id", auth, roleGuard(["SUPER_ADMIN"]), getCompany);

//حذف شرکت
router.delete("/id", auth, roleGuard(["SUPER_ADMIN"]), deleteCompany);

//دربافت درخواستهای پیگیری
router.get(
  "/feedback-requests",
  auth,
  roleGuard(["SUPER_ADMIN"]),
  getAllFeedbackRequests,
);

//جواب دادن به درخواست  پیگیری
router.post(
  "/feedback-requests/:id",
  auth,
  roleGuard(["SUPER_ADMIN"]),
  respondToFeedbackRequest,
);

module.exports = router;
