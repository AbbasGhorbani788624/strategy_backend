const {
  createStepFlowService,
  updateStepFlowService,
  deleteStepFlowService,
  getAllStepFlowsService,
  getActiveFlowsService,
  startStepSessionService,
  analyzeStepService,
  generateFinalAnalysisService,
} = require("../services/stepFlowService");
const { successResponse } = require("../utils/responses");

exports.createStepFlow = async (req, res, next) => {
  try {
    const { title, isActive, steps } = req.body;

    const stepFlow = await createStepFlowService({ title, isActive, steps });

    return successResponse(res, 201, stepFlow);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.updateStepFlow = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, isActive, steps } = req.body;

    const stepFlow = await updateStepFlowService(id, {
      title,
      isActive,
      steps,
    });

    return successResponse(res, 200, stepFlow);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.deleteStepFlow = async (req, res, next) => {
  try {
    const { id } = req.params;

    await deleteStepFlowService(id);

    return successResponse(res, 200, {
      message: "مسیر مرحله‌ای با موفقیت حذف شد",
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.getAllStepFlows = async (req, res, next) => {
  try {
    const result = await getAllStepFlowsService(req.query);

    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

// دریافت لیست مسیرهای مرحله‌ای
exports.getActiveFlows = async (req, res, next) => {
  try {
    const flows = await getActiveFlowsService();
    return successResponse(res, 200, flows);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

// شروع جلسه مرحله‌ای
exports.startStepSession = async (req, res, next) => {
  try {
    const result = await startStepSessionService(req.user, req.body.flowId);
    return successResponse(res, 201, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

// ارسال پاسخ هر مرحله و دریافت تحلیل
exports.analyzeStep = async (req, res, next) => {
  try {
    const result = await analyzeStepService(
      req.user,
      req.params.sessionId,
      req.body.answers,
    );
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

// دریافت تحلیل نهایی
exports.getFinalAnalysis = async (req, res, next) => {
  try {
    const result = await generateFinalAnalysisService(
      req.user,
      req.params.sessionId,
    );
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};
