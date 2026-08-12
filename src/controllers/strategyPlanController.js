const {
  createStrategyPlanService,
  getStrategyPlanByProjectService,
  getStrategyPlanService,
  validateBscMapService,
  approveBscMapAndGenerateKpisService,
  validateBscKpisService,
  validateOkrTableService,
  approveBscKpisService,
  approveOkrTableService,
  listPendingBscMapsService,
  listPendingMeasuresService,
  listApprovedStrategyPlansService,
  syncStrategyPlanMeasuresService,
} = require("../services/strategyPlanService");
const {
  listStrategyPlanMeasuresService,
} = require("../services/strategyMonitoringService");
const { successResponse } = require("../utils/responses");

exports.createStrategyPlan = async (req, res, next) => {
  try {
    const { projectId, framework } = req.body;
    const result = await createStrategyPlanService(req.user, {
      projectId,
      framework,
    });

    const statusCode = result.existing ? 200 : 201;
    return successResponse(res, statusCode, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.getStrategyPlanByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { framework } = req.query;
    const result = await getStrategyPlanByProjectService(
      req.user,
      projectId,
      framework,
    );

    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.getStrategyPlan = async (req, res, next) => {
  try {
    const { strategyPlanId } = req.params;
    const result = await getStrategyPlanService(strategyPlanId, req.user);
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.validateStrategyMap = async (req, res, next) => {
  try {
    const { strategyPlanId } = req.params;
    const { editedMap } = req.body;
    const result = await validateBscMapService(
      req.user,
      strategyPlanId,
      editedMap,
    );

    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.approveStrategyMap = async (req, res, next) => {
  try {
    const { strategyPlanId } = req.params;
    const { approvedMap } = req.body;
    const result = await approveBscMapAndGenerateKpisService(
      req.user,
      strategyPlanId,
      approvedMap,
    );

    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.validateStrategyKpis = async (req, res, next) => {
  try {
    const { strategyPlanId } = req.params;
    const { editedKpiTable } = req.body;
    const result = await validateBscKpisService(
      req.user,
      strategyPlanId,
      editedKpiTable,
    );

    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.validateStrategyTable = async (req, res, next) => {
  try {
    const { strategyPlanId } = req.params;
    const { editedTable } = req.body;
    const result = await validateOkrTableService(
      req.user,
      strategyPlanId,
      editedTable,
    );

    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.approveStrategyKpis = async (req, res, next) => {
  try {
    const { strategyPlanId } = req.params;
    const { approvedKpiTable } = req.body;
    const result = await approveBscKpisService(
      req.user,
      strategyPlanId,
      approvedKpiTable,
    );

    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.approveStrategyTable = async (req, res, next) => {
  try {
    const { strategyPlanId } = req.params;
    const { approvedTable } = req.body;
    const result = await approveOkrTableService(
      req.user,
      strategyPlanId,
      approvedTable,
    );

    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.listPendingBscMaps = async (req, res, next) => {
  try {
    const result = await listPendingBscMapsService(req.user, req.query);
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.listPendingMeasures = async (req, res, next) => {
  try {
    const result = await listPendingMeasuresService(req.user, req.query);
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.listApprovedStrategyPlans = async (req, res, next) => {
  try {
    const result = await listApprovedStrategyPlansService(req.user, req.query);
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.listStrategyPlanMeasures = async (req, res, next) => {
  try {
    const { strategyPlanId } = req.params;
    const result = await listStrategyPlanMeasuresService(
      req.user,
      strategyPlanId,
      req.query,
    );
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.syncStrategyPlanMeasures = async (req, res, next) => {
  try {
    const { strategyPlanId } = req.params;
    const result = await syncStrategyPlanMeasuresService(
      req.user,
      strategyPlanId,
    );
    return successResponse(res, 200, { items: result });
  } catch (err) {
    console.error(err);
    next(err);
  }
};
