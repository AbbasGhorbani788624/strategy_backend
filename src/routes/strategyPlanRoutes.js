const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { roleGuard } = require("../middleware/roleGuard");
const requireMonitoringUnlocked = require("../middleware/requireMonitoringUnlocked");

router.use(auth, roleGuard(["COMPANY", "MEMBER"]), requireMonitoringUnlocked);
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
  strategyTranslationSchema,
  translateStrategyAnalysis,
);

// POST — شروع flow؛ body: { projectId, framework, restart: true }
router.post(
  "/",
  createStrategyPlanSchema,
  createStrategyPlan,
);

// GET — plan فعال شرکت (از companyId توکن)؛ query: framework
router.get(
  "/active",
  strategyPlanByProjectQuerySchema,
  getActiveStrategyPlan,
);

router.post(
  "/active/map/validate",
  strategyPlanByProjectQuerySchema,
  validateStrategyMapSchema,
  validateStrategyMapByActive,
);

router.post(
  "/active/map/approve",
  strategyPlanByProjectQuerySchema,
  approveStrategyMapSchema,
  approveStrategyMapByActive,
);

router.post(
  "/active/kpis/validate",
  strategyPlanByProjectQuerySchema,
  validateStrategyKpiSchema,
  validateStrategyKpisByActive,
);

router.post(
  "/active/kpis/approve",
  strategyPlanByProjectQuerySchema,
  approveStrategyKpiSchema,
  approveStrategyKpisByActive,
);

router.post(
  "/active/table/validate",
  strategyPlanByProjectQuerySchema,
  validateStrategyTableSchema,
  validateStrategyTableByActive,
);

router.post(
  "/active/table/approve",
  strategyPlanByProjectQuerySchema,
  approveStrategyTableSchema,
  approveStrategyTableByActive,
);

router.get(
  "/active/measures",
  strategyPlanByProjectQuerySchema,
  strategyPlanMeasuresListQuerySchema,
  listStrategyPlanMeasuresByActive,
);

router.post(
  "/active/measures/sync",
  strategyPlanByProjectQuerySchema,
  syncStrategyPlanMeasuresByActive,
);

// --- legacy: by-project (deprecated) ---
router.get(
  "/by-project/:projectId",
  strategyPlanByProjectQuerySchema,
  getStrategyPlanByProject,
);

router.post(
  "/by-project/:projectId/map/validate",
  strategyPlanByProjectQuerySchema,
  validateStrategyMapSchema,
  validateStrategyMapByProject,
);

router.post(
  "/by-project/:projectId/map/approve",
  strategyPlanByProjectQuerySchema,
  approveStrategyMapSchema,
  approveStrategyMapByProject,
);

router.post(
  "/by-project/:projectId/kpis/validate",
  strategyPlanByProjectQuerySchema,
  validateStrategyKpiSchema,
  validateStrategyKpisByProject,
);

router.post(
  "/by-project/:projectId/kpis/approve",
  strategyPlanByProjectQuerySchema,
  approveStrategyKpiSchema,
  approveStrategyKpisByProject,
);

router.post(
  "/by-project/:projectId/table/validate",
  strategyPlanByProjectQuerySchema,
  validateStrategyTableSchema,
  validateStrategyTableByProject,
);

router.post(
  "/by-project/:projectId/table/approve",
  strategyPlanByProjectQuerySchema,
  approveStrategyTableSchema,
  approveStrategyTableByProject,
);

router.get(
  "/by-project/:projectId/measures",
  strategyPlanByProjectQuerySchema,
  strategyPlanMeasuresListQuerySchema,
  listStrategyPlanMeasuresByProject,
);

router.post(
  "/by-project/:projectId/measures/sync",
  strategyPlanByProjectQuerySchema,
  syncStrategyPlanMeasuresByProject,
);

// --- legacy: strategyPlanId ---
router.post(
  "/:strategyPlanId/map/validate",
  validateStrategyMapSchema,
  validateStrategyMap,
);

router.post(
  "/:strategyPlanId/map/approve",
  approveStrategyMapSchema,
  approveStrategyMap,
);

router.post(
  "/:strategyPlanId/kpis/validate",
  validateStrategyKpiSchema,
  validateStrategyKpis,
);

router.post(
  "/:strategyPlanId/kpis/approve",
  approveStrategyKpiSchema,
  approveStrategyKpis,
);

router.post(
  "/:strategyPlanId/table/validate",
  validateStrategyTableSchema,
  validateStrategyTable,
);

router.post(
  "/:strategyPlanId/table/approve",
  approveStrategyTableSchema,
  approveStrategyTable,
);

router.get(
  "/:strategyPlanId/measures",
  strategyPlanMeasuresListQuerySchema,
  listStrategyPlanMeasures,
);

router.post(
  "/:strategyPlanId/measures/sync",
  syncStrategyPlanMeasures,
);

router.get(
  "/:strategyPlanId",
  getStrategyPlan,
);

module.exports = router;
