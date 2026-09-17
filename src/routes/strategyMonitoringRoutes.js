const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { roleGuard } = require("../middleware/roleGuard");
const requireMonitoringUnlocked = require("../middleware/requireMonitoringUnlocked");

router.use(auth, roleGuard(["COMPANY", "MEMBER"]), requireMonitoringUnlocked);
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
  strategyPlanByProjectQuerySchema,
  startMonitoringByActive,
);

router.get(
  "/measures/:measureIndex/monitoring",
  strategyPlanByProjectQuerySchema,
  getMonitoringByActive,
);

router.patch(
  "/measures/:measureIndex/monitoring/planning",
  strategyPlanByProjectQuerySchema,
  updateMonitoringPlanningSchema,
  updateMonitoringPlanningByActive,
);

router.post(
  "/measures/:measureIndex/monitoring/confirm",
  strategyPlanByProjectQuerySchema,
  confirmMonitoringByActive,
);

router.patch(
  "/measures/:measureIndex/monitoring/periods/:periodIndex/measurement",
  strategyPlanByProjectQuerySchema,
  recordPeriodMeasurementSchema,
  recordPeriodMeasurementByActive,
);

// --- legacy: by-project (deprecated) ---
router.post(
  "/by-project/:projectId/measures/:measureIndex/monitoring",
  strategyPlanByProjectQuerySchema,
  startMonitoringByProject,
);

router.get(
  "/by-project/:projectId/measures/:measureIndex/monitoring",
  strategyPlanByProjectQuerySchema,
  getMonitoringByProject,
);

router.patch(
  "/by-project/:projectId/measures/:measureIndex/monitoring/planning",
  strategyPlanByProjectQuerySchema,
  updateMonitoringPlanningSchema,
  updateMonitoringPlanningByProject,
);

router.post(
  "/by-project/:projectId/measures/:measureIndex/monitoring/confirm",
  strategyPlanByProjectQuerySchema,
  confirmMonitoringByProject,
);

router.patch(
  "/by-project/:projectId/measures/:measureIndex/monitoring/periods/:periodIndex/measurement",
  strategyPlanByProjectQuerySchema,
  recordPeriodMeasurementSchema,
  recordPeriodMeasurementByProject,
);

// --- legacy: UUID ---
router.post(
  "/measures/:measureId/monitoring",
  startMonitoring,
);

router.get(
  "/monitoring/:monitoringId",
  getMonitoring,
);

router.patch(
  "/monitoring/:monitoringId/planning",
  updateMonitoringPlanningSchema,
  updateMonitoringPlanning,
);

router.post(
  "/monitoring/:monitoringId/confirm",
  confirmMonitoring,
);

router.patch(
  "/monitoring/:monitoringId/periods/:periodId/measurement",
  recordPeriodMeasurementSchema,
  recordPeriodMeasurement,
);

module.exports = router;
