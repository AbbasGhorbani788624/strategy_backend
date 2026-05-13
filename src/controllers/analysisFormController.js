const {
  createForm,
  updateForm,
  deleteForm,
  getAllAnalysisFormsService,
  getAnalysisFormByIdService,
  getAnalysisModesService,
  submitFormAnswersService,
  handleConversationStepService,
} = require("../services/analysisFormService");
const { successResponse } = require("../utils/responses");

exports.submitFormAnswers = async (req, res, next) => {
  try {
    const { projectId, answers } = req.body;
    const userId = req.user.id;
    await submitFormAnswersService(projectId, userId, answers);
    return successResponse(res, 201, { message: "فرم با موفقیت ثبت شد" });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.handleConversationStep = async (req, res, next) => {
  try {
    const { userInput = "" } = req.body || {};
    const { id } = req.params;
    const userId = req.user.id;
    const response = await handleConversationStepService(id, userId, userInput);
    return successResponse(res, 200, response);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.createAnalysisForm = async (req, res, next) => {
  try {
    const form = await createForm(req.body);
    return successResponse(res, 201, form);
  } catch (error) {
    next(error);
  }
};

exports.updateAnalysisForm = async (req, res, next) => {
  try {
    const form = await updateForm(req.params.id, req.body);
    return successResponse(res, 200, form);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.deleteAnalysisForm = async (req, res, next) => {
  try {
    await deleteForm(req.params.id);
    return successResponse(res, 200, "فرم با موفقیت حذف شد");
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.getAllAnalysisForms = async (req, res, next) => {
  try {
    const result = await getAllAnalysisFormsService(req.query);
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.getAnalysisFormById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const form = await getAnalysisFormByIdService(id);
    return successResponse(res, 200, form);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.getAnalysisModes = async (req, res, next) => {
  try {
    const result = await getAnalysisModesService(req.user);
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
