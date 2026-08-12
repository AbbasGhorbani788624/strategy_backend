const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { roleGuard } = require("../middleware/roleGuard");
const {
  startMonitoring,
  getMonitoring,
  updateMonitoringPlanning,
  confirmMonitoring,
  recordPeriodMeasurement,
} = require("../controllers/strategyMonitoringController");
const {
  updateMonitoringPlanningSchema,
  recordPeriodMeasurementSchema,
} = require("../validations/strategyMonitoringValidation");

// POST — شروع Planning/Monitoring برای یک KPI؛ body ندارد → ساخت periodها و { monitoringId, measure, periods[] }
router.post(
  "/measures/:measureId/monitoring",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  startMonitoring,
);

// GET — دریافت جدول پایش؛ param: monitoringId (= measureId) → { status, owner, finalTarget, periods[] }
router.get(
  "/monitoring/:monitoringId",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  getMonitoring,
);

// PATCH — ذخیره Planning (owner + finalTarget + target هر period)؛ body: { ownerId, finalTarget, periods[] }
router.patch(
  "/monitoring/:monitoringId/planning",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  updateMonitoringPlanningSchema,
  updateMonitoringPlanning,
);

// POST — Lock کردن Planning پس از تکمیل Targetها؛ body ندارد → status: LOCKED
router.post(
  "/monitoring/:monitoringId/confirm",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  confirmMonitoring,
);

// PATCH — ثبت Actual یک period (فقط بعد از Lock)؛ body: { actualValue }
router.patch(
  "/monitoring/:monitoringId/periods/:periodId/measurement",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  recordPeriodMeasurementSchema,
  recordPeriodMeasurement,
);

module.exports = router;
