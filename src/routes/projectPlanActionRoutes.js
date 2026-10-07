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

router.use(auth, roleGuard(["COMPANY", "MEMBER", "SUPER_ADMIN"]));

router.get(
  "/:actionId/progress-history",
  getActionProgressHistory,
);

router.patch(
  "/:actionId/progress",
  updateProgressSchema,
  updateActionProgress,
);

router.patch(
  "/:actionId",
  updateActionSchema,
  updatePlanAction,
);

router.delete("/:actionId", deletePlanAction);

module.exports = router;
