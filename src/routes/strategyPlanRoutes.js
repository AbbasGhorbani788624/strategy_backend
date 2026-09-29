const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { roleGuard } = require("../middleware/roleGuard");
const requireMonitoringUnlocked = require("../middleware/requireMonitoringUnlocked");

// همهٔ مسیرهای زیر: کاربر لاگین، نقش COMPANY یا MEMBER، و پایش برای شرکت باز باشد.
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

// ترجمهٔ متن تحلیل پروژه برای استفاده در فلو پایش — body: { projectId }
router.post(
  "/strategy-translation",
  strategyTranslationSchema,
  translateStrategyAnalysis,
);

// شروع یا راه‌اندازی مجدد برنامهٔ پایش — body: { projectId, framework, restart? }
router.post(
  "/",
  createStrategyPlanSchema,
  createStrategyPlan,
);

// دریافت برنامهٔ پایش فعال شرکت (شرکت از توکن) — query: framework
router.get(
  "/active",
  strategyPlanByProjectQuerySchema,
  getActiveStrategyPlan,
);

// BSC — اعتبارسنجی نقشهٔ استراتژی ویرایش‌شده (plan فعال شرکت) — query: framework؛ body: editedMap
router.post(
  "/active/map/validate",
  strategyPlanByProjectQuerySchema,
  validateStrategyMapSchema,
  validateStrategyMapByActive,
);

// BSC — تأیید نقشهٔ نهایی و رفتن به مرحلهٔ بعد (plan فعال شرکت) — body: approvedMap
router.post(
  "/active/map/approve",
  strategyPlanByProjectQuerySchema,
  approveStrategyMapSchema,
  approveStrategyMapByActive,
);

// BSC — اعتبارسنجی KPIهای ویرایش‌شده (plan فعال شرکت)
router.post(
  "/active/kpis/validate",
  strategyPlanByProjectQuerySchema,
  validateStrategyKpiSchema,
  validateStrategyKpisByActive,
);

// BSC — تأیید KPIها (plan فعال شرکت)
router.post(
  "/active/kpis/approve",
  strategyPlanByProjectQuerySchema,
  approveStrategyKpiSchema,
  approveStrategyKpisByActive,
);

// OKR — اعتبارسنجی جدول/ساختار OKR ویرایش‌شده (plan فعال شرکت)
router.post(
  "/active/table/validate",
  strategyPlanByProjectQuerySchema,
  validateStrategyTableSchema,
  validateStrategyTableByActive,
);

// OKR — تأیید جدول OKR (plan فعال شرکت)
router.post(
  "/active/table/approve",
  strategyPlanByProjectQuerySchema,
  approveStrategyTableSchema,
  approveStrategyTableByActive,
);

// لیست شاخص‌های پایش (measures) برای برنامهٔ فعال شرکت
router.get(
  "/active/measures",
  strategyPlanByProjectQuerySchema,
  strategyPlanMeasuresListQuerySchema,
  listStrategyPlanMeasuresByActive,
);

// همگام‌سازی شاخص‌های پایش با وضعیت فعلی برنامه (plan فعال شرکت)
router.post(
  "/active/measures/sync",
  strategyPlanByProjectQuerySchema,
  syncStrategyPlanMeasuresByActive,
);

// --- legacy: by-project (deprecated) ---

// دریافت برنامهٔ پایش مرتبط با یک پروژه — params: projectId؛ query: framework
router.get(
  "/by-project/:projectId",
  strategyPlanByProjectQuerySchema,
  getStrategyPlanByProject,
);

// BSC — اعتبارسنجی نقشه برای plan همان پروژه
router.post(
  "/by-project/:projectId/map/validate",
  strategyPlanByProjectQuerySchema,
  validateStrategyMapSchema,
  validateStrategyMapByProject,
);

// BSC — تأیید نقشه برای plan همان پروژه
router.post(
  "/by-project/:projectId/map/approve",
  strategyPlanByProjectQuerySchema,
  approveStrategyMapSchema,
  approveStrategyMapByProject,
);

// BSC — اعتبارسنجی KPI برای plan همان پروژه
router.post(
  "/by-project/:projectId/kpis/validate",
  strategyPlanByProjectQuerySchema,
  validateStrategyKpiSchema,
  validateStrategyKpisByProject,
);

// BSC — تأیید KPI برای plan همان پروژه
router.post(
  "/by-project/:projectId/kpis/approve",
  strategyPlanByProjectQuerySchema,
  approveStrategyKpiSchema,
  approveStrategyKpisByProject,
);

// OKR — اعتبارسنجی جدول برای plan همان پروژه
router.post(
  "/by-project/:projectId/table/validate",
  strategyPlanByProjectQuerySchema,
  validateStrategyTableSchema,
  validateStrategyTableByProject,
);

// OKR — تأیید جدول برای plan همان پروژه
router.post(
  "/by-project/:projectId/table/approve",
  strategyPlanByProjectQuerySchema,
  approveStrategyTableSchema,
  approveStrategyTableByProject,
);

// لیست measures برای plan همان پروژه
router.get(
  "/by-project/:projectId/measures",
  strategyPlanByProjectQuerySchema,
  strategyPlanMeasuresListQuerySchema,
  listStrategyPlanMeasuresByProject,
);

// sync measures برای plan همان پروژه
router.post(
  "/by-project/:projectId/measures/sync",
  strategyPlanByProjectQuerySchema,
  syncStrategyPlanMeasuresByProject,
);

// --- legacy: strategyPlanId ---

// BSC — اعتبارسنجی نقشه با شناسهٔ مستقیم StrategyPlan
router.post(
  "/:strategyPlanId/map/validate",
  validateStrategyMapSchema,
  validateStrategyMap,
);

// BSC — تأیید نقشه با شناسهٔ مستقیم StrategyPlan
router.post(
  "/:strategyPlanId/map/approve",
  approveStrategyMapSchema,
  approveStrategyMap,
);

// BSC — اعتبارسنجی KPI با شناسهٔ مستقیم StrategyPlan
router.post(
  "/:strategyPlanId/kpis/validate",
  validateStrategyKpiSchema,
  validateStrategyKpis,
);

// BSC — تأیید KPI با شناسهٔ مستقیم StrategyPlan
router.post(
  "/:strategyPlanId/kpis/approve",
  approveStrategyKpiSchema,
  approveStrategyKpis,
);

// OKR — اعتبارسنجی جدول با شناسهٔ مستقیم StrategyPlan
router.post(
  "/:strategyPlanId/table/validate",
  validateStrategyTableSchema,
  validateStrategyTable,
);

// OKR — تأیید جدول با شناسهٔ مستقیم StrategyPlan
router.post(
  "/:strategyPlanId/table/approve",
  approveStrategyTableSchema,
  approveStrategyTable,
);

// لیست measures برای یک StrategyPlan مشخص
router.get(
  "/:strategyPlanId/measures",
  strategyPlanMeasuresListQuerySchema,
  listStrategyPlanMeasures,
);

// همگام‌سازی measures برای یک StrategyPlan مشخص
router.post(
  "/:strategyPlanId/measures/sync",
  syncStrategyPlanMeasures,
);

// جزئیات کامل یک StrategyPlan — params: strategyPlanId
router.get(
  "/:strategyPlanId",
  getStrategyPlan,
);

module.exports = router;
