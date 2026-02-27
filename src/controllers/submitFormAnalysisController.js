const {
  submitFormAnalysisService,
  getFormForUserService,
} = require("../services/submitFormAnalysisService");
const { successResponse } = require("../utils/responses");

exports.submitFormAnalysis = async (req, res, next) => {
  try {
    const result = await submitFormAnalysisService(req.user, req.body);
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.getFormForUser = async (req, res, next) => {
  try {
    const { formId } = req.params;
    const result = await getFormForUserService(formId);
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};
