const {
  createStepFlowService,
  updateStepFlowService,
  deleteStepFlowService,
  getAllStepFlowsService,
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

    const stepFlow = await deleteStepFlowService(id);

    return successResponse(res, 200, {
      message: "مسیر مرحله‌ای با موفقیت حذف شد",
      stepFlow,
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
