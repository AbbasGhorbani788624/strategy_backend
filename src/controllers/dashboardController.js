const {
  getDashboardService,
  getDashboardCompanyInsightService,
} = require("../services/dashboardService");
const { successResponse } = require("../utils/responses");

exports.getDashboard = async (req, res, next) => {
  try {
    const framework = req.query.framework || "BSC";
    const result = await getDashboardService(req.user, framework);

    return successResponse(res, 200, result);
  } catch (err) {
    next(err);
  }
};

exports.getDashboardCompanyInsight = async (req, res, next) => {
  try {
    const result = await getDashboardCompanyInsightService(
      req.user.companyId,
      req.user.id,
    );

    return successResponse(res, 200, result);
  } catch (err) {
    next(err);
  }
};
