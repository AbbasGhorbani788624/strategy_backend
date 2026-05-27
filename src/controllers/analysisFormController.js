const {
  createForm,
  deleteForm,
  getAllAnalysisFormsService,
  getAnalysisFormByIdService,
  getAnalysisModesService,
  submitFormAnswersService,
  handleConversationStepService,
  createPromptVersionForAnalysisForm,
  updatePromptDefinitionForAnalysisForm,
  updatePromptVersionForAnalysisForm,
  publishPromptVersionForAnalysisForm,
  createPromptVersionForMultiAnalysisForm,
  updatePromptDefinitionForMultiAnalysisForm,
  updatePromptVersionForMultiAnalysisForm,
  publishPromptVersionForMultiAnalysisForm,
  createMultiAnalysisFormService,
  updateAnalysisFormService,
  updateMultiAnalysisFormService,
} = require("../services/analysisFormService");
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
    const response = await handleConversationStepService(
      id,
      userId,
      userInput,
      understood,
    );
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
    const { id } = req.params;

    const result = await updateAnalysisFormService({
      id,
      ...req.body,
    });

    res.status(200).json({
      success: true,
      message: "فرم تحلیل با موفقیت ویرایش شد",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.createAnalysisFormPromptVersion = async (req, res, next) => {
  try {
    const result = await createPromptVersionForAnalysisForm(
      req.params.id,
      req.body,
    );

    return successResponse(res, 201, result);
  } catch (error) {
    next(error);
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
    const userId = req.user.id;
    const companyId = req.user.companyId;
    const result = await getAnalysisModesService({ userId, companyId });
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

exports.updateAnalysisFormPromptDefinition = async (req, res, next) => {
  try {
    const result = await updatePromptDefinitionForAnalysisForm(
      req.params.id,
      req.body,
    );

    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.updateAnalysisFormPromptVersion = async (req, res, next) => {
  try {
    const result = await updatePromptVersionForAnalysisForm(
      req.params.id,
      req.params.versionId,
      req.body,
    );

    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.publishAnalysisFormPromptVersion = async (req, res, next) => {
  try {
    const result = await publishPromptVersionForAnalysisForm(
      req.params.id,
      req.params.versionId,
    );

    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.createMultiAnalysisForm = async (req, res, next) => {
  try {
    const {
      title,
      description,
      isActive,
      order,
      requiredForms,
      goals,
      promptDefinition,
    } = req.body;

    const result = await createMultiAnalysisFormService({
      title,
      description,
      isActive,
      order,
      requiredForms,
      goals,
      promptDefinition,
    });

    return successResponse(res, 201, {
      message: "تحلیل چندمرحله‌ای با موفقیت ساخته شد",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateMultiAnalysisFormController = async (req, res) => {
  const result = await updateMultiAnalysisFormService({
    id: req.params.id,
    ...req.body,
  });

  res.status(200).json({
    success: true,
    message: "تحلیل چندمرحله‌ای با موفقیت ویرایش شد",
    data: result,
  });
};

exports.createMultiAnalysisFormPromptVersion = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { versionKey, status, segmentValues } = req.body;

    const result = await createPromptVersionForMultiAnalysisForm({
      multiAnalysisFormId: id,
      versionKey,
      status,
      segmentValues,
    });

    return successResponse(res, 201, {
      message: "نسخه جدید prompt برای تحلیل چندمرحله‌ای با موفقیت ساخته شد",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateMultiAnalysisFormPromptDefinition = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { segments } = req.body;

    const result = await updatePromptDefinitionForMultiAnalysisForm({
      multiAnalysisFormId: id,
      segments,
    });

    return successResponse(res, 200, {
      message: "ساختار prompt تحلیل چندمرحله‌ای با موفقیت بروزرسانی شد",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateMultiAnalysisFormPromptVersion = async (req, res, next) => {
  try {
    const { id, versionId } = req.params;

    const { versionKey, segmentValues } = req.body;

    const result = await updatePromptVersionForMultiAnalysisForm({
      multiAnalysisFormId: id,
      versionId,
      versionKey,
      segmentValues,
    });

    return successResponse(res, 200, {
      message: "نسخه prompt تحلیل چندمرحله‌ای با موفقیت بروزرسانی شد",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.publishMultiAnalysisFormPromptVersion = async (req, res, next) => {
  try {
    const { id, versionId } = req.params;

    const result = await publishPromptVersionForMultiAnalysisForm({
      multiAnalysisFormId: id,
      versionId,
    });

    return successResponse(res, 200, {
      message: "نسخه prompt تحلیل چندمرحله‌ای با موفقیت منتشر شد",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
