const {
  startMonitoringService,
  getMonitoringService,
  updateMonitoringPlanningService,
  confirmMonitoringService,
  recordPeriodMeasurementService,
} = require("../services/strategyMonitoringService");
const { successResponse } = require("../utils/responses");

exports.startMonitoring = async (req, res, next) => {
  try {
    const { measureId } = req.params;
    const result = await startMonitoringService(req.user, measureId);
    return successResponse(res, 201, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.getMonitoring = async (req, res, next) => {
  try {
    const { monitoringId } = req.params;
    const result = await getMonitoringService(req.user, monitoringId);
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.updateMonitoringPlanning = async (req, res, next) => {
  try {
    const { monitoringId } = req.params;
    const result = await updateMonitoringPlanningService(
      req.user,
      monitoringId,
      req.body,
    );
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.confirmMonitoring = async (req, res, next) => {
  try {
    const { monitoringId } = req.params;
    const result = await confirmMonitoringService(req.user, monitoringId);
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.recordPeriodMeasurement = async (req, res, next) => {
  try {
    const { monitoringId, periodId } = req.params;
    const { actualValue } = req.body;
    const result = await recordPeriodMeasurementService(
      req.user,
      monitoringId,
      periodId,
      actualValue,
    );
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};
