const {
  startMonitoringService,
  getMonitoringService,
  updateMonitoringPlanningService,
  confirmMonitoringService,
  recordPeriodMeasurementService,
  startMonitoringByActiveService,
  getMonitoringByActiveService,
  updateMonitoringPlanningByActiveService,
  confirmMonitoringByActiveService,
  recordPeriodMeasurementByActiveService,
  startMonitoringByProjectService,
  getMonitoringByProjectService,
  updateMonitoringPlanningByProjectService,
  confirmMonitoringByProjectService,
  recordPeriodMeasurementByProjectService,
  startMonitoringByPlanService,
  getMonitoringByPlanService,
  updateMonitoringPlanningByPlanService,
  confirmMonitoringByPlanService,
  recordPeriodMeasurementByPlanService,
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

exports.startMonitoringByActive = async (req, res, next) => {
  try {
    const { measureIndex } = req.params;
    const { framework } = req.query;
    const result = await startMonitoringByActiveService(
      req.user,
      framework,
      measureIndex,
    );
    return successResponse(res, 201, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.getMonitoringByActive = async (req, res, next) => {
  try {
    const { measureIndex } = req.params;
    const { framework } = req.query;
    const result = await getMonitoringByActiveService(
      req.user,
      framework,
      measureIndex,
    );
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.updateMonitoringPlanningByActive = async (req, res, next) => {
  try {
    const { measureIndex } = req.params;
    const { framework } = req.query;
    const result = await updateMonitoringPlanningByActiveService(
      req.user,
      framework,
      measureIndex,
      req.body,
    );
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.confirmMonitoringByActive = async (req, res, next) => {
  try {
    const { measureIndex } = req.params;
    const { framework } = req.query;
    const result = await confirmMonitoringByActiveService(
      req.user,
      framework,
      measureIndex,
    );
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.recordPeriodMeasurementByActive = async (req, res, next) => {
  try {
    const { measureIndex, periodIndex } = req.params;
    const { framework } = req.query;
    const { actualValue } = req.body;
    const result = await recordPeriodMeasurementByActiveService(
      req.user,
      framework,
      measureIndex,
      periodIndex,
      actualValue,
    );
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.startMonitoringByProject = async (req, res, next) => {
  try {
    const { projectId, measureIndex } = req.params;
    const { framework } = req.query;
    const result = await startMonitoringByProjectService(
      req.user,
      projectId,
      framework,
      measureIndex,
    );
    return successResponse(res, 201, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.startMonitoringByActive = async (req, res, next) => {
  try {
    const { measureIndex } = req.params;
    const { framework } = req.query;
    const result = await startMonitoringByActiveService(
      req.user,
      framework,
      measureIndex,
    );
    return successResponse(res, 201, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.getMonitoringByActive = async (req, res, next) => {
  try {
    const { measureIndex } = req.params;
    const { framework } = req.query;
    const result = await getMonitoringByActiveService(
      req.user,
      framework,
      measureIndex,
    );
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.updateMonitoringPlanningByActive = async (req, res, next) => {
  try {
    const { measureIndex } = req.params;
    const { framework } = req.query;
    const result = await updateMonitoringPlanningByActiveService(
      req.user,
      framework,
      measureIndex,
      req.body,
    );
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.confirmMonitoringByActive = async (req, res, next) => {
  try {
    const { measureIndex } = req.params;
    const { framework } = req.query;
    const result = await confirmMonitoringByActiveService(
      req.user,
      framework,
      measureIndex,
    );
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.recordPeriodMeasurementByActive = async (req, res, next) => {
  try {
    const { measureIndex, periodIndex } = req.params;
    const { framework } = req.query;
    const { actualValue } = req.body;
    const result = await recordPeriodMeasurementByActiveService(
      req.user,
      framework,
      measureIndex,
      periodIndex,
      actualValue,
    );
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.getMonitoringByProject = async (req, res, next) => {
  try {
    const { projectId, measureIndex } = req.params;
    const { framework } = req.query;
    const result = await getMonitoringByProjectService(
      req.user,
      projectId,
      framework,
      measureIndex,
    );
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.updateMonitoringPlanningByProject = async (req, res, next) => {
  try {
    const { projectId, measureIndex } = req.params;
    const { framework } = req.query;
    const result = await updateMonitoringPlanningByProjectService(
      req.user,
      projectId,
      framework,
      measureIndex,
      req.body,
    );
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.confirmMonitoringByProject = async (req, res, next) => {
  try {
    const { projectId, measureIndex } = req.params;
    const { framework } = req.query;
    const result = await confirmMonitoringByProjectService(
      req.user,
      projectId,
      framework,
      measureIndex,
    );
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.recordPeriodMeasurementByProject = async (req, res, next) => {
  try {
    const { projectId, measureIndex, periodIndex } = req.params;
    const { framework } = req.query;
    const { actualValue } = req.body;
    const result = await recordPeriodMeasurementByProjectService(
      req.user,
      projectId,
      framework,
      measureIndex,
      periodIndex,
      actualValue,
    );
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.startMonitoringByPlan = async (req, res, next) => {
  try {
    const { strategyPlanId, measureIndex } = req.params;
    const result = await startMonitoringByPlanService(
      req.user,
      strategyPlanId,
      measureIndex,
    );
    return successResponse(res, 201, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.getMonitoringByPlan = async (req, res, next) => {
  try {
    const { strategyPlanId, measureIndex } = req.params;
    const result = await getMonitoringByPlanService(
      req.user,
      strategyPlanId,
      measureIndex,
    );
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.updateMonitoringPlanningByPlan = async (req, res, next) => {
  try {
    const { strategyPlanId, measureIndex } = req.params;
    const result = await updateMonitoringPlanningByPlanService(
      req.user,
      strategyPlanId,
      measureIndex,
      req.body,
    );
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.confirmMonitoringByPlan = async (req, res, next) => {
  try {
    const { strategyPlanId, measureIndex } = req.params;
    const result = await confirmMonitoringByPlanService(
      req.user,
      strategyPlanId,
      measureIndex,
    );
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.recordPeriodMeasurementByPlan = async (req, res, next) => {
  try {
    const { strategyPlanId, measureIndex, periodIndex } = req.params;
    const { actualValue } = req.body;
    const result = await recordPeriodMeasurementByPlanService(
      req.user,
      strategyPlanId,
      measureIndex,
      periodIndex,
      actualValue,
    );
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};
