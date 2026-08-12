const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { roleGuard } = require("../middleware/roleGuard");
const {
  createStrategyPlan,
  getStrategyPlanByProject,
  getStrategyPlan,
  validateStrategyMap,
  approveStrategyMap,
  validateStrategyKpis,
  validateStrategyTable,
  approveStrategyKpis,
  approveStrategyTable,
  listPendingBscMaps,
  listPendingMeasures,
  listApprovedStrategyPlans,
  listStrategyPlanMeasures,
  syncStrategyPlanMeasures,
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
  strategyPlanListQuerySchema,
  strategyPlanApprovedListQuerySchema,
  strategyPlanMeasuresListQuerySchema,
} = require("../validations/strategyPlanListQueryValidation");

// GET — لیست BSCهایی که Map تایید نشده → { items, pagination }; query: page, limit, search|q, framework?
router.get(
  "/pending/maps",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  strategyPlanListQuerySchema,
  listPendingBscMaps,
);

// GET — لیست KPI/table در انتظار (BSC + OKR) → { items, pagination }; query: page, limit, search|q, framework?
router.get(
  "/pending/measures",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  strategyPlanListQuerySchema,
  listPendingMeasures,
);

// GET — لیست planهای approve‌شده → { items, pagination }; query: page, limit, search|q, framework?, state?
router.get(
  "/approved",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  strategyPlanApprovedListQuerySchema,
  listApprovedStrategyPlans,
);

// POST — شروع فرایند Strategy Planning (idempotent)؛ body: { projectId, framework } → plan جدید 201 یا plan موجود 200 + existing: true
router.post(
  "/",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  createStrategyPlanSchema,
  createStrategyPlan,
);

// GET — Resume یکپارچه بر اساس projectId + framework → { exists, continueAction, strategyPlan?, measures? }
router.get(
  "/by-project/:projectId",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  strategyPlanByProjectQuerySchema,
  getStrategyPlanByProject,
);

// POST — BSC: ارسال Map ویرایش‌شده برای AI Validation؛ body: { editedMap } → { strategyPlan, map, initialMap, editedMap, finalMap }
router.post(
  "/:strategyPlanId/map/validate",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  validateStrategyMapSchema,
  validateStrategyMap,
);

// POST — BSC: تایید Map و تولید جدول KPI توسط AI؛ body: { approvedMap } → { strategyPlan(state: KPI_VALIDATION), map, kpiTable }
router.post(
  "/:strategyPlanId/map/approve",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  approveStrategyMapSchema,
  approveStrategyMap,
);

// POST — BSC: ارسال جدول KPI ویرایش‌شده برای AI Validation؛ body: { editedKpiTable } → { strategyPlan, kpiTable, initialKpiTable, editedKpiTable }
router.post(
  "/:strategyPlanId/kpis/validate",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  validateStrategyKpiSchema,
  validateStrategyKpis,
);

// POST — BSC: تایید نهایی جدول KPI؛ body: { approvedKpiTable } → { strategyPlan(state: READY_FOR_MONITORING, status: APPROVED), kpiTable }
router.post(
  "/:strategyPlanId/kpis/approve",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  approveStrategyKpiSchema,
  approveStrategyKpis,
);

// POST — OKR: ارسال جدول ویرایش‌شده برای AI Validation؛ body: { editedTable } → { strategyPlan, table, initialTable, editedTable }
router.post(
  "/:strategyPlanId/table/validate",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  validateStrategyTableSchema,
  validateStrategyTable,
);

// POST — OKR: تایید نهایی جدول؛ body: { approvedTable } → { strategyPlan(state: READY_FOR_MONITORING, status: APPROVED), table }
router.post(
  "/:strategyPlanId/table/approve",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  approveStrategyTableSchema,
  approveStrategyTable,
);

// GET — لیست Measureهای sync‌شده → { items, pagination }; query: page, limit, search|q, monitoringStatus?
router.get(
  "/:strategyPlanId/measures",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  strategyPlanMeasuresListQuerySchema,
  listStrategyPlanMeasures,
);

// POST — re-sync KPIهای تاییدشده به Measure (برای planهای قدیمی) → { items: [...] }
router.post(
  "/:strategyPlanId/measures/sync",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  syncStrategyPlanMeasures,
);

// GET — Resume/خواندن وضعیت یک Strategy Plan؛ param: strategyPlanId → { strategyPlan, map/kpiTable(BSC) | table(OKR) }
router.get(
  "/:strategyPlanId",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  getStrategyPlan,
);

module.exports = router;
