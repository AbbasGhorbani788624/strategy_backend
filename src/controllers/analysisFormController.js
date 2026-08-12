const {
  getAnalysisModesService,
  submitFormAnswersService,
  getCompanyAnalysisStatisticsService,
} = require("../services/analysisFormService");
const {
  processConversationStepService,
} = require("../services/analysisProcessor.service");
const { successResponse } = require("../utils/responses");

exports.submitFormAnswers = async (req, res, next) => {
  try {
    const { projectId, answers } = req.body;
    const userId = req.user.id;
    const result = await submitFormAnswersService(projectId, userId, answers);
    return successResponse(res, 201, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.handleConversationStep = async (req, res, next) => {
  try {
    const { userInput = "", understood = false } = req.body || {};
    const { id } = req.params;
    const userId = req.user.id;

    const { jobId, status } = await processConversationStepService({
      projectId: id,
      userId,
      userInput,
      understood,
    });

    return res.status(202).json({
      success: true,
      message: "Analysis job queued",
      jobId,
      status,
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.getAnalysisModes = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.companyId;
    const result = await getAnalysisModesService(userId, companyId);
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.singleFormGoals = async (req, res, next) => {
  try {
  } catch (error) {
    next(error);
  }
};

exports.getCompanyAnalysisStatistics = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await getCompanyAnalysisStatisticsService(userId);

    res.status(200).json({
      success: true,

      data: result,
    });
  } catch (error) {
    next(error);
  }
};
