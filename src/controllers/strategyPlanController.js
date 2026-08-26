const {
  createStrategyPlanService,
  translateStrategyAnalysisService,
  getActiveStrategyPlanService,
  getStrategyPlanByProjectService,
  getStrategyPlanService,
  validateBscMapService,
  approveBscMapAndGenerateKpisService,
  validateBscKpisService,
  validateOkrTableService,
  approveBscKpisService,
  approveOkrTableService,
  syncStrategyPlanMeasuresService,
  validateBscMapByActiveService,
  approveBscMapByActiveService,
  validateBscKpisByActiveService,
  approveBscKpisByActiveService,
  validateOkrTableByActiveService,
  approveOkrTableByActiveService,
  syncStrategyPlanMeasuresByActiveService,
  validateBscMapByProjectService,
  approveBscMapByProjectService,
  validateBscKpisByProjectService,
  approveBscKpisByProjectService,
  validateOkrTableByProjectService,
  approveOkrTableByProjectService,
  syncStrategyPlanMeasuresByProjectService,
} = require("../services/strategyPlanService");
const {
  listStrategyPlanMeasuresService,
  listStrategyPlanMeasuresByActiveService,
  listStrategyPlanMeasuresByProjectService,
} = require("../services/strategyMonitoringService");
const { successResponse } = require("../utils/responses");

exports.createStrategyPlan = async (req, res, next) => {
  try {
    const { projectId, framework, restart = false } = req.body;
    const result = await createStrategyPlanService(req.user, {
      projectId,
      framework,
      restart: Boolean(restart),
    });

    return successResponse(res, 201, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.translateStrategyAnalysis = async (req, res, next) => {
  try {
    const { projectId } = req.body;
    const result = await translateStrategyAnalysisService(req.user, {
      projectId,
    });

    return successResponse(res, 200, result);
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

exports.getActiveStrategyPlan = async (req, res, next) => {
  try {
    const { framework } = req.query;
    const result = await getActiveStrategyPlanService(req.user, framework);
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.validateStrategyMapByActive = async (req, res, next) => {
  try {
    const { framework } = req.query;
    const { editedMap } = req.body;
    const result = await validateBscMapByActiveService(
      req.user,
      framework,
      editedMap,
    );
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.approveStrategyMapByActive = async (req, res, next) => {
  try {
    const { framework } = req.query;
    const { approvedMap } = req.body;
    const result = await approveBscMapByActiveService(
      req.user,
      framework,
      approvedMap,
    );
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.validateStrategyKpisByActive = async (req, res, next) => {
  try {
    const { framework } = req.query;
    const { editedKpiTable } = req.body;
    const result = await validateBscKpisByActiveService(
      req.user,
      framework,
      editedKpiTable,
    );
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.validateStrategyTableByActive = async (req, res, next) => {
  try {
    const { framework } = req.query;
    const { editedTable } = req.body;
    const result = await validateOkrTableByActiveService(
      req.user,
      framework,
      editedTable,
    );
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.approveStrategyKpisByActive = async (req, res, next) => {
  try {
    const { framework } = req.query;
    const { approvedKpiTable } = req.body;
    const result = await approveBscKpisByActiveService(
      req.user,
      framework,
      approvedKpiTable,
    );
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.approveStrategyTableByActive = async (req, res, next) => {
  try {
    const { framework } = req.query;
    const { approvedTable } = req.body;
    const result = await approveOkrTableByActiveService(
      req.user,
      framework,
      approvedTable,
    );
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.listStrategyPlanMeasuresByActive = async (req, res, next) => {
  try {
    const { framework } = req.query;
    const result = await listStrategyPlanMeasuresByActiveService(
      req.user,
      framework,
      req.query,
    );
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.syncStrategyPlanMeasuresByActive = async (req, res, next) => {
  try {
    const { framework } = req.query;
    const result = await syncStrategyPlanMeasuresByActiveService(
      req.user,
      framework,
    );
    return successResponse(res, 200, { items: result });
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

exports.validateStrategyMapByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { framework } = req.query;
    const { editedMap } = req.body;
    const result = await validateBscMapByProjectService(
      req.user,
      projectId,
      framework,
      editedMap,
    );

    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.approveStrategyMapByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { framework } = req.query;
    const { approvedMap } = req.body;
    const result = await approveBscMapByProjectService(
      req.user,
      projectId,
      framework,
      approvedMap,
    );

    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.validateStrategyKpisByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { framework } = req.query;
    const { editedKpiTable } = req.body;
    const result = await validateBscKpisByProjectService(
      req.user,
      projectId,
      framework,
      editedKpiTable,
    );

    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.validateStrategyTableByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { framework } = req.query;
    const { editedTable } = req.body;
    const result = await validateOkrTableByProjectService(
      req.user,
      projectId,
      framework,
      editedTable,
    );

    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.approveStrategyKpisByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { framework } = req.query;
    const { approvedKpiTable } = req.body;
    const result = await approveBscKpisByProjectService(
      req.user,
      projectId,
      framework,
      approvedKpiTable,
    );

    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.approveStrategyTableByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { framework } = req.query;
    const { approvedTable } = req.body;
    const result = await approveOkrTableByProjectService(
      req.user,
      projectId,
      framework,
      approvedTable,
    );

    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.listStrategyPlanMeasuresByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { framework } = req.query;
    const result = await listStrategyPlanMeasuresByProjectService(
      req.user,
      projectId,
      framework,
      req.query,
    );
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.syncStrategyPlanMeasuresByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { framework } = req.query;
    const result = await syncStrategyPlanMeasuresByProjectService(
      req.user,
      projectId,
      framework,
    );
    return successResponse(res, 200, { items: result });
  } catch (err) {
    console.error(err);
    next(err);
  }
};
