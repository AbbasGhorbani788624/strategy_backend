const {
  getFormForUserService,
} = require("../services/submitFormAnalysisService");
const { successResponse } = require("../utils/responses");

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
