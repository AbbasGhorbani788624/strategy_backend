const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const { roleGuard } = require("../../middleware/roleGuard");
const { upsertCompanyAdminData } = require("../../controllers/companyAdmin");
const {
  companyAdminSchema,
} = require("../../validations/companyAdminValidation");

router.post(
  "/companies/:companyId/admin-data",
  auth,
  roleGuard(["SUPER_ADMIN"]),
  companyAdminSchema,
  upsertCompanyAdminData,
);
module.exports = router;
