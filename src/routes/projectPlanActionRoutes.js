const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { roleGuard } = require("../middleware/roleGuard");
const {
  updatePlanAction,
  deletePlanAction,
} = require("../controllers/projectPlanController");
const {
  updateActionSchema,
} = require("../validations/projectPlanValidation");

const companyOnly = roleGuard(["COMPANY", "SUPER_ADMIN"]);

router.patch(
  "/:actionId",
  auth,
  companyOnly,
  updateActionSchema,
  updatePlanAction,
);

router.delete("/:actionId", auth, companyOnly, deletePlanAction);

module.exports = router;
