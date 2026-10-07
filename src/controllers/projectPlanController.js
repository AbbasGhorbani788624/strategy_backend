const { successResponse } = require("../utils/responses");
const projectPlanService = require("../services/projectPlanService");
const {
  listCollaboratorsService,
  grantCollaboratorService,
  updateCollaboratorService,
  revokeCollaboratorService,
  listSharedWithMeService,
} = require("../services/projectPlanCollaboratorsService");

exports.createProjectPlan = async (req, res, next) => {
  try {
    const result = await projectPlanService.createProjectPlan(
      req.user,
      req.params.projectId,
    );
    return successResponse(res, 201, result);
  } catch (err) {
    next(err);
  }
};

exports.getProjectPlanByProject = async (req, res, next) => {
  try {
    const result = await projectPlanService.getProjectPlanByProject(
      req.user,
      req.params.projectId,
    );
    return successResponse(res, 200, result);
  } catch (err) {
    next(err);
  }
};

exports.listProjectPlans = async (req, res, next) => {
  try {
    const result = await projectPlanService.listProjectPlans(
      req.user,
      req.query,
    );
    return successResponse(res, 200, result);
  } catch (err) {
    next(err);
  }
};

exports.getProjectPlanDetails = async (req, res, next) => {
  try {
    const result = await projectPlanService.getProjectPlanDetails(
      req.user,
      req.params.planId,
    );
    return successResponse(res, 200, result);
  } catch (err) {
    next(err);
  }
};

exports.createPlanAction = async (req, res, next) => {
  try {
    const result = await projectPlanService.createPlanAction(
      req.user,
      req.params.planId,
      req.body,
    );
    return successResponse(res, 201, result);
  } catch (err) {
    next(err);
  }
};

exports.updatePlanAction = async (req, res, next) => {
  try {
    const result = await projectPlanService.updatePlanAction(
      req.user,
      req.params.actionId,
      req.body,
    );
    return successResponse(res, 200, result);
  } catch (err) {
    next(err);
  }
};

exports.bulkUpdatePlanActionCompletions = async (req, res, next) => {
  try {
    const plan = await projectPlanService.bulkUpdatePlanActionCompletions(
      req.user,
      req.params.planId,
      req.body,
    );
    return successResponse(res, 200, { plan });
  } catch (err) {
    next(err);
  }
};

exports.bulkUpdatePlanActionDescriptions = exports.bulkUpdatePlanActionCompletions;

exports.deletePlanAction = async (req, res, next) => {
  try {
    const plan = await projectPlanService.deletePlanAction(
      req.user,
      req.params.actionId,
    );
    return successResponse(res, 200, { plan });
  } catch (err) {
    next(err);
  }
};

exports.lockProjectPlan = async (req, res, next) => {
  try {
    const plan = await projectPlanService.lockProjectPlan(
      req.user,
      req.params.planId,
      req.body,
    );
    return successResponse(res, 200, { plan });
  } catch (err) {
    next(err);
  }
};

exports.deleteProjectPlan = async (req, res, next) => {
  try {
    const result = await projectPlanService.deleteProjectPlan(
      req.user,
      req.params.planId,
    );
    return successResponse(res, 200, result);
  } catch (err) {
    next(err);
  }
};

exports.updateActionProgress = async (req, res, next) => {
  try {
    const result = await projectPlanService.updateActionProgress(
      req.user,
      req.params.actionId,
      req.body.progress,
    );
    return successResponse(res, 200, result);
  } catch (err) {
    next(err);
  }
};

exports.getActionProgressHistory = async (req, res, next) => {
  try {
    const result = await projectPlanService.getActionProgressHistory(
      req.user,
      req.params.actionId,
    );
    return successResponse(res, 200, result);
  } catch (err) {
    next(err);
  }
};

exports.listSharedProjectPlans = async (req, res, next) => {
  try {
    const result = await listSharedWithMeService(req.user, req.query);
    return successResponse(res, 200, result);
  } catch (err) {
    next(err);
  }
};

exports.listProjectPlanCollaborators = async (req, res, next) => {
  try {
    const result = await listCollaboratorsService(req.user, req.params.planId);
    return successResponse(res, 200, result);
  } catch (err) {
    next(err);
  }
};

exports.grantProjectPlanCollaborator = async (req, res, next) => {
  try {
    const result = await grantCollaboratorService(
      req.user,
      req.params.planId,
      req.body,
    );
    const status = result.existing ? 200 : 201;
    return successResponse(res, status, result);
  } catch (err) {
    next(err);
  }
};

exports.updateProjectPlanCollaborator = async (req, res, next) => {
  try {
    const result = await updateCollaboratorService(
      req.user,
      req.params.planId,
      req.params.userId,
      req.body,
    );
    return successResponse(res, 200, result);
  } catch (err) {
    next(err);
  }
};

exports.revokeProjectPlanCollaborator = async (req, res, next) => {
  try {
    await revokeCollaboratorService(
      req.user,
      req.params.planId,
      req.params.userId,
    );
    return successResponse(res, 200, { revoked: true });
  } catch (err) {
    next(err);
  }
};
