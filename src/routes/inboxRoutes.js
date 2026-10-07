const express = require("express");
const auth = require("../middleware/auth");
const {
  listFormDelegationInbox,
  getFormDelegationInboxItem,
} = require("../controllers/formCollaborationController");
const {
  listProjectAccessInbox,
  listStrategyPlanAccessInbox,
  listProjectPlanAccessInbox,
} = require("../controllers/inboxController");
const {
  inboxFormQuerySchema,
  inboxDirectionQuerySchema,
} = require("../validations/inboxQueryValidation");

const router = express.Router();

router.get(
  "/form-delegations",
  auth,
  inboxFormQuerySchema,
  listFormDelegationInbox,
);
router.get(
  "/form-delegations/:delegationId",
  auth,
  getFormDelegationInboxItem,
);

router.get(
  "/project-access",
  auth,
  inboxDirectionQuerySchema,
  listProjectAccessInbox,
);
router.get(
  "/strategy-plan-access",
  auth,
  inboxDirectionQuerySchema,
  listStrategyPlanAccessInbox,
);
router.get(
  "/project-plan-access",
  auth,
  inboxDirectionQuerySchema,
  listProjectPlanAccessInbox,
);

module.exports = router;
