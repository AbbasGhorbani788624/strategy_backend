const {
  getExistingFormsByIds,
} = require("../repositories/analysisFormRepository");
const {
  createStepFlow,
  updateStepFlow,
  getStepFlowById,
  deleteStepFlow,
  getAllStepFlows,
} = require("../repositories/stepFlowRepository");

const createStepFlowService = async (input) => {
  if (!input.title || input.title.trim() === "") {
    const err = new Error("عنوان مسیر مرحله‌ای الزامی است");
    err.statusCode = 400;
    throw err;
  }

  if (!input.steps || input.steps.length === 0) {
    const err = new Error("حداقل یک مرحله باید تعریف شود");
    err.statusCode = 400;
    throw err;
  }

  // چک order تکراری
  const orders = input.steps.map((s) => s.order);
  const uniqueOrders = new Set(orders);
  if (orders.length !== uniqueOrders.size) {
    const err = new Error("ترتیب مراحل نباید تکراری باشد");
    err.statusCode = 400;
    throw err;
  }

  // چک formId تکراری
  const formIds = input.steps.map((s) => s.formId);
  const uniqueFormIds = new Set(formIds);
  if (formIds.length !== uniqueFormIds.size) {
    const err = new Error("فرم‌ها نباید در مراحل دوبار استفاده شوند");
    err.statusCode = 400;
    throw err;
  }

  // چک وجود فرم‌ها در دیتابیس
  const existingForms = await getExistingFormsByIds(formIds);
  const existingFormIds = existingForms.map((f) => f.id);
  const notFound = formIds.filter((f) => !existingFormIds.includes(f));
  if (notFound.length > 0) {
    const err = new Error(`فرم(ها) یافت نشد: ${notFound.join(", ")}`);
    err.statusCode = 400;
    throw err;
  }

  return await createStepFlow(input);
};

const updateStepFlowService = async (id, input) => {
  if (!id) {
    const err = new Error("شناسه مسیر مرحله‌ای الزامی است");
    err.statusCode = 400;
    throw err;
  }

  const existingStepFlow = await getStepFlowById(id);
  if (!existingStepFlow) {
    const err = new Error("مسیر مرحله‌ای با شناسه داده شده یافت نشد");
    err.statusCode = 404;
    throw err;
  }

  if (input.title && input.title.trim() === "") {
    const err = new Error("عنوان مسیر مرحله‌ای الزامی است");
    err.statusCode = 400;
    throw err;
  }

  if (input.steps && input.steps.length > 0) {
    // چک order تکراری
    const orders = input.steps.map((s) => s.order);
    const uniqueOrders = new Set(orders);
    if (orders.length !== uniqueOrders.size) {
      const err = new Error("ترتیب مراحل نباید تکراری باشد");
      err.statusCode = 400;
      throw err;
    }

    // چک formId تکراری
    const formIds = input.steps.map((s) => s.formId);
    const uniqueFormIds = new Set(formIds);
    if (formIds.length !== uniqueFormIds.size) {
      const err = new Error("فرم‌ها نباید در مراحل دوبار استفاده شوند");
      err.statusCode = 400;
      throw err;
    }

    // چک وجود فرم‌ها در دیتابیس
    const existingForms = await getExistingFormsByIds(formIds);
    const existingFormIds = existingForms.map((f) => f.id);
    const notFound = formIds.filter((f) => !existingFormIds.includes(f));
    if (notFound.length > 0) {
      const err = new Error(`فرم(ها) یافت نشد: ${notFound.join(", ")}`);
      err.statusCode = 400;
      throw err;
    }
  }

  return await updateStepFlow(id, input);
};

const deleteStepFlowService = async (id) => {
  if (!id) {
    const err = new Error("شناسه مسیر مرحله‌ای الزامی است");
    err.statusCode = 400;
    throw err;
  }

  const existingStepFlow = await getStepFlowById(id);
  if (!existingStepFlow) {
    const err = new Error("مسیر مرحله‌ای با شناسه داده شده یافت نشد");
    err.statusCode = 404;
    throw err;
  }
  return await deleteStepFlow(id);
};

//گرفتن لیست فرم های مرحله ای
const getAllStepFlowsService = async (query) => {
  let { page = 1, limit = 10, search = "" } = query;

  page = parseInt(page);
  limit = parseInt(limit);

  if (page < 1) page = 1;
  if (limit < 1 || limit > 100) limit = 10;

  return await getAllStepFlows({ page, limit, search });
};

module.exports = {
  createStepFlowService,
  updateStepFlowService,
  deleteStepFlowService,
  getAllStepFlowsService,
};
