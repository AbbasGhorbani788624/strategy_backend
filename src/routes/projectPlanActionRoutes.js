const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { roleGuard } = require("../middleware/roleGuard");
const {
  updatePlanAction,
  deletePlanAction,
  updateActionProgress,
  getActionProgressHistory,
} = require("../controllers/projectPlanController");
const {
  updateActionSchema,
  updateProgressSchema,
} = require("../validations/projectPlanValidation");

const companyOnly = roleGuard(["COMPANY", "SUPER_ADMIN"]);

router.get(
  "/:actionId/progress-history",
  auth,
  companyOnly,
  getActionProgressHistory,
);

router.patch(
  "/:actionId/progress",
  auth,
  companyOnly,
  updateProgressSchema,
  updateActionProgress,
);

router.patch(
  "/:actionId",
  auth,
  companyOnly,
  updateActionSchema,
  updatePlanAction,
);

router.delete("/:actionId", auth, companyOnly, deletePlanAction);

module.exports = router;
