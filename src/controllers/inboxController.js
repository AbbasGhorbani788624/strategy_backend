const { successResponse } = require("../utils/responses");
const { listProjectAccessInboxService } = require("../services/inboxProjectAccessService");
const { listStrategyPlanAccessInboxService } = require("../services/inboxStrategyPlanAccessService");
const { listProjectPlanAccessInboxService } = require("../services/inboxProjectPlanAccessService");

exports.listProjectAccessInbox = async (req, res, next) => {
  try {
    const result = await listProjectAccessInboxService(req.user, req.query);
    return successResponse(res, 200, result);
  } catch (error) {
    next(error);
  }
};

exports.listStrategyPlanAccessInbox = async (req, res, next) => {
  try {
    const result = await listStrategyPlanAccessInboxService(req.user, req.query);
    return successResponse(res, 200, result);
  } catch (error) {
    next(error);
  }
};

exports.listProjectPlanAccessInbox = async (req, res, next) => {
  try {
    const result = await listProjectPlanAccessInboxService(req.user, req.query);
    return successResponse(res, 200, result);
  } catch (error) {
    next(error);
  }
};
