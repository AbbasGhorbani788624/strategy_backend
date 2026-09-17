const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { roleGuard } = require("../middleware/roleGuard");
const {
  listProjectPlans,
  getProjectPlanDetails,
  createPlanAction,
  lockProjectPlan,
  deleteProjectPlan,
  bulkUpdatePlanActionCompletions,
} = require("../controllers/projectPlanController");
const {
  listPlansQuerySchema,
  createActionSchema,
  bulkUpdateActionCompletionsSchema,
  lockPlanSchema,
} = require("../validations/projectPlanValidation");

const companyOnly = roleGuard(["COMPANY", "SUPER_ADMIN"]);

router.get("/", auth, companyOnly, listPlansQuerySchema, listProjectPlans);

router.get("/:planId", auth, companyOnly, getProjectPlanDetails);

router.patch(
  "/:planId/actions/completions",
  auth,
  companyOnly,
  bulkUpdateActionCompletionsSchema,
  bulkUpdatePlanActionCompletions,
);

router.patch(
  "/:planId/actions/descriptions",
  auth,
  companyOnly,
  bulkUpdateActionCompletionsSchema,
  bulkUpdatePlanActionCompletions,
);

router.post(
  "/:planId/actions",
  auth,
  companyOnly,
  createActionSchema,
  createPlanAction,
);

router.post("/:planId/lock", auth, companyOnly, lockPlanSchema, lockProjectPlan);

router.delete("/:planId", auth, companyOnly, deleteProjectPlan);

module.exports = router;
