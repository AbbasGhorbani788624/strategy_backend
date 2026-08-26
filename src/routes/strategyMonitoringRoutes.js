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
  startMonitoringByActive,
  getMonitoringByActive,
  updateMonitoringPlanningByActive,
  confirmMonitoringByActive,
  recordPeriodMeasurementByActive,
  startMonitoringByProject,
  getMonitoringByProject,
  updateMonitoringPlanningByProject,
  confirmMonitoringByProject,
  recordPeriodMeasurementByProject,
} = require("../controllers/strategyMonitoringController");
const {
  updateMonitoringPlanningSchema,
  recordPeriodMeasurementSchema,
} = require("../validations/strategyMonitoringValidation");
const {
  strategyPlanByProjectQuerySchema,
} = require("../validations/strategyPlanByProjectQueryValidation");

// --- plan فعال شرکت (از companyId توکن) + measureIndex ---

router.post(
  "/measures/:measureIndex/monitoring",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  strategyPlanByProjectQuerySchema,
  startMonitoringByActive,
);

router.get(
  "/measures/:measureIndex/monitoring",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  strategyPlanByProjectQuerySchema,
  getMonitoringByActive,
);

router.patch(
  "/measures/:measureIndex/monitoring/planning",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  strategyPlanByProjectQuerySchema,
  updateMonitoringPlanningSchema,
  updateMonitoringPlanningByActive,
);

router.post(
  "/measures/:measureIndex/monitoring/confirm",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  strategyPlanByProjectQuerySchema,
  confirmMonitoringByActive,
);

router.patch(
  "/measures/:measureIndex/monitoring/periods/:periodIndex/measurement",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  strategyPlanByProjectQuerySchema,
  recordPeriodMeasurementSchema,
  recordPeriodMeasurementByActive,
);

// --- legacy: by-project (deprecated) ---
router.post(
  "/by-project/:projectId/measures/:measureIndex/monitoring",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  strategyPlanByProjectQuerySchema,
  startMonitoringByProject,
);

router.get(
  "/by-project/:projectId/measures/:measureIndex/monitoring",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  strategyPlanByProjectQuerySchema,
  getMonitoringByProject,
);

router.patch(
  "/by-project/:projectId/measures/:measureIndex/monitoring/planning",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  strategyPlanByProjectQuerySchema,
  updateMonitoringPlanningSchema,
  updateMonitoringPlanningByProject,
);

router.post(
  "/by-project/:projectId/measures/:measureIndex/monitoring/confirm",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  strategyPlanByProjectQuerySchema,
  confirmMonitoringByProject,
);

router.patch(
  "/by-project/:projectId/measures/:measureIndex/monitoring/periods/:periodIndex/measurement",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  strategyPlanByProjectQuerySchema,
  recordPeriodMeasurementSchema,
  recordPeriodMeasurementByProject,
);

// --- legacy: UUID ---
router.post(
  "/measures/:measureId/monitoring",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  startMonitoring,
);

router.get(
  "/monitoring/:monitoringId",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  getMonitoring,
);

router.patch(
  "/monitoring/:monitoringId/planning",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  updateMonitoringPlanningSchema,
  updateMonitoringPlanning,
);

router.post(
  "/monitoring/:monitoringId/confirm",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  confirmMonitoring,
);

router.patch(
  "/monitoring/:monitoringId/periods/:periodId/measurement",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  recordPeriodMeasurementSchema,
  recordPeriodMeasurement,
);

module.exports = router;
