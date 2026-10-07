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
  listProjectPlanCollaborators,
  grantProjectPlanCollaborator,
  updateProjectPlanCollaborator,
  revokeProjectPlanCollaborator,
  listSharedProjectPlans,
} = require("../controllers/projectPlanController");
const {
  listPlansQuerySchema,
  createActionSchema,
  bulkUpdateActionCompletionsSchema,
  lockPlanSchema,
} = require("../validations/projectPlanValidation");
const {
  grantCollaboratorSchema,
  patchCollaboratorSchema,
} = require("../validations/strategyPlanCollaboratorValidation");

const companyOnly = roleGuard(["COMPANY", "SUPER_ADMIN"]);
const planAccessRoles = roleGuard(["COMPANY", "MEMBER", "SUPER_ADMIN"]);

router.use(auth, planAccessRoles);

router.get("/shared-with-me", listSharedProjectPlans);

router.get("/", companyOnly, listPlansQuerySchema, listProjectPlans);

router.get(
  "/:planId/collaborators",
  listProjectPlanCollaborators,
);

router.post(
  "/:planId/collaborators",
  grantCollaboratorSchema,
  grantProjectPlanCollaborator,
);

router.patch(
  "/:planId/collaborators/:userId",
  patchCollaboratorSchema,
  updateProjectPlanCollaborator,
);

router.delete(
  "/:planId/collaborators/:userId",
  revokeProjectPlanCollaborator,
);

router.get("/:planId", getProjectPlanDetails);

router.patch(
  "/:planId/actions/completions",
  bulkUpdateActionCompletionsSchema,
  bulkUpdatePlanActionCompletions,
);

router.patch(
  "/:planId/actions/descriptions",
  bulkUpdateActionCompletionsSchema,
  bulkUpdatePlanActionCompletions,
);

router.post(
  "/:planId/actions",
  createActionSchema,
  createPlanAction,
);

router.post("/:planId/lock", lockPlanSchema, lockProjectPlan);

router.delete("/:planId", companyOnly, deleteProjectPlan);

module.exports = router;
