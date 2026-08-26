const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { roleGuard } = require("../middleware/roleGuard");
const {
  createStrategyPlan,
  translateStrategyAnalysis,
  getActiveStrategyPlan,
  getStrategyPlanByProject,
  getStrategyPlan,
  validateStrategyMap,
  approveStrategyMap,
  validateStrategyKpis,
  validateStrategyTable,
  approveStrategyKpis,
  approveStrategyTable,
  listStrategyPlanMeasures,
  syncStrategyPlanMeasures,
  validateStrategyMapByActive,
  approveStrategyMapByActive,
  validateStrategyKpisByActive,
  validateStrategyTableByActive,
  approveStrategyKpisByActive,
  approveStrategyTableByActive,
  listStrategyPlanMeasuresByActive,
  syncStrategyPlanMeasuresByActive,
  validateStrategyMapByProject,
  approveStrategyMapByProject,
  validateStrategyKpisByProject,
  validateStrategyTableByProject,
  approveStrategyKpisByProject,
  approveStrategyTableByProject,
  listStrategyPlanMeasuresByProject,
  syncStrategyPlanMeasuresByProject,
} = require("../controllers/strategyPlanController");
const {
  createStrategyPlanSchema,
} = require("../validations/createStrategyPlanValidation");
const {
  validateStrategyMapSchema,
} = require("../validations/validateStrategyMapValidation");
const {
  approveStrategyMapSchema,
} = require("../validations/approveStrategyMapValidation");
const {
  validateStrategyKpiSchema,
} = require("../validations/validateStrategyKpiValidation");
const {
  validateStrategyTableSchema,
} = require("../validations/validateStrategyTableValidation");
const {
  approveStrategyKpiSchema,
} = require("../validations/approveStrategyKpiValidation");
const {
  approveStrategyTableSchema,
} = require("../validations/approveStrategyTableValidation");
const {
  strategyPlanByProjectQuerySchema,
} = require("../validations/strategyPlanByProjectQueryValidation");
const {
  strategyPlanMeasuresListQuerySchema,
} = require("../validations/strategyPlanListQueryValidation");
const {
  strategyTranslationSchema,
} = require("../validations/strategyTranslationValidation");

// POST — ترجمه؛ body: { projectId }
router.post(
  "/strategy-translation",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  strategyTranslationSchema,
  translateStrategyAnalysis,
);

// POST — شروع flow؛ body: { projectId, framework, restart: true }
router.post(
  "/",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  createStrategyPlanSchema,
  createStrategyPlan,
);

// GET — plan فعال شرکت (از companyId توکن)؛ query: framework
router.get(
  "/active",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  strategyPlanByProjectQuerySchema,
  getActiveStrategyPlan,
);

router.post(
  "/active/map/validate",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  strategyPlanByProjectQuerySchema,
  validateStrategyMapSchema,
  validateStrategyMapByActive,
);

router.post(
  "/active/map/approve",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  strategyPlanByProjectQuerySchema,
  approveStrategyMapSchema,
  approveStrategyMapByActive,
);

router.post(
  "/active/kpis/validate",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  strategyPlanByProjectQuerySchema,
  validateStrategyKpiSchema,
  validateStrategyKpisByActive,
);

router.post(
  "/active/kpis/approve",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  strategyPlanByProjectQuerySchema,
  approveStrategyKpiSchema,
  approveStrategyKpisByActive,
);

router.post(
  "/active/table/validate",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  strategyPlanByProjectQuerySchema,
  validateStrategyTableSchema,
  validateStrategyTableByActive,
);

router.post(
  "/active/table/approve",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  strategyPlanByProjectQuerySchema,
  approveStrategyTableSchema,
  approveStrategyTableByActive,
);

router.get(
  "/active/measures",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  strategyPlanByProjectQuerySchema,
  strategyPlanMeasuresListQuerySchema,
  listStrategyPlanMeasuresByActive,
);

router.post(
  "/active/measures/sync",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  strategyPlanByProjectQuerySchema,
  syncStrategyPlanMeasuresByActive,
);

// --- legacy: by-project (deprecated) ---
router.get(
  "/by-project/:projectId",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  strategyPlanByProjectQuerySchema,
  getStrategyPlanByProject,
);

router.post(
  "/by-project/:projectId/map/validate",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  strategyPlanByProjectQuerySchema,
  validateStrategyMapSchema,
  validateStrategyMapByProject,
);

router.post(
  "/by-project/:projectId/map/approve",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  strategyPlanByProjectQuerySchema,
  approveStrategyMapSchema,
  approveStrategyMapByProject,
);

router.post(
  "/by-project/:projectId/kpis/validate",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  strategyPlanByProjectQuerySchema,
  validateStrategyKpiSchema,
  validateStrategyKpisByProject,
);

router.post(
  "/by-project/:projectId/kpis/approve",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  strategyPlanByProjectQuerySchema,
  approveStrategyKpiSchema,
  approveStrategyKpisByProject,
);

router.post(
  "/by-project/:projectId/table/validate",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  strategyPlanByProjectQuerySchema,
  validateStrategyTableSchema,
  validateStrategyTableByProject,
);

router.post(
  "/by-project/:projectId/table/approve",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  strategyPlanByProjectQuerySchema,
  approveStrategyTableSchema,
  approveStrategyTableByProject,
);

router.get(
  "/by-project/:projectId/measures",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  strategyPlanByProjectQuerySchema,
  strategyPlanMeasuresListQuerySchema,
  listStrategyPlanMeasuresByProject,
);

router.post(
  "/by-project/:projectId/measures/sync",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  strategyPlanByProjectQuerySchema,
  syncStrategyPlanMeasuresByProject,
);

// --- legacy: strategyPlanId ---
router.post(
  "/:strategyPlanId/map/validate",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  validateStrategyMapSchema,
  validateStrategyMap,
);

router.post(
  "/:strategyPlanId/map/approve",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  approveStrategyMapSchema,
  approveStrategyMap,
);

router.post(
  "/:strategyPlanId/kpis/validate",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  validateStrategyKpiSchema,
  validateStrategyKpis,
);

router.post(
  "/:strategyPlanId/kpis/approve",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  approveStrategyKpiSchema,
  approveStrategyKpis,
);

router.post(
  "/:strategyPlanId/table/validate",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  validateStrategyTableSchema,
  validateStrategyTable,
);

router.post(
  "/:strategyPlanId/table/approve",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  approveStrategyTableSchema,
  approveStrategyTable,
);

router.get(
  "/:strategyPlanId/measures",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  strategyPlanMeasuresListQuerySchema,
  listStrategyPlanMeasures,
);

router.post(
  "/:strategyPlanId/measures/sync",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  syncStrategyPlanMeasures,
);

router.get(
  "/:strategyPlanId",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  getStrategyPlan,
);

module.exports = router;
