const {
  featuredAnalysisService,
} = require("../services/featuredAnalysisService");
const { successResponse } = require("../utils/responses");

exports.getFeaturedAnalyses = async (req, res, next) => {
  try {
    const data = await featuredAnalysisService.findAll(req.user);

    return successResponse(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.getFeaturedAnalysisProjects = async (req, res, next) => {
  try {
    const data = await featuredAnalysisService.getProjects(
      req.user,
      req.params.analysisId,
      req.query,
    );

    return successResponse(res, 200, data);
  } catch (err) {
    next(err);
  }
};
