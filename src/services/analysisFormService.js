const {
  createWithQuestions,
  getFormById,
  updateFormWithQuestions,
  deleteFormRepo,
  getAllAnalysisForms,
  getAnalysisFormById,
  getSingleForms,
  getStepFlows,
} = require("../repositories/analysisFormRepository");
const { findById } = require("../repositories/userRepository");

//ساخت فرم تحلیل
const createForm = async (data) => {
  if (!data.title) {
    const err = new Error("تیتر الزامی است");
    err.statusCode = 400;
    throw err;
  }

  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    const err = new Error("حداقل یک  سوال الزامی است");
    err.statusCode = 400;
    throw err;
  }

  return createWithQuestions(data);
};

//ویرایش قرم تحلیل
const updateForm = async (id, data) => {
  if (!id) {
    const err = new Error("آیدی فرم ارسال نشده");
    err.statusCode = 400;
    throw err;
  }
  const existing = await getFormById(id);

  if (!existing) {
    const err = new Error("فرم پیدا نشد");
    err.statusCode = 404;
    throw err;
  }

  return updateFormWithQuestions(id, data);
};

// حذف فرم تحلیل
const deleteForm = async (id) => {
  if (!id) {
    const err = new Error("آیدی فرم ارسال نشده");
    err.statusCode = 400;
    throw err;
  }

  const existing = await getFormById(id);
  if (!existing) {
    const err = new Error("فرم پیدا نشد");
    err.statusCode = 404;
    throw err;
  }

  return deleteFormRepo(id);
};

const getAllAnalysisFormsService = async (query) => {
  let { page = 1, limit = 10, search = "" } = query;

  page = parseInt(page);
  limit = parseInt(limit);

  if (page < 1) page = 1;
  if (limit < 1 || limit > 100) limit = 10;

  return await getAllAnalysisForms({ page, limit, search });
};

const getAnalysisFormByIdService = async (id) => {
  if (!id) {
    const err = new Error("شناسه فرم الزامی است");
    err.statusCode = 400;
    throw err;
  }

  const form = await getAnalysisFormById(id);

  if (!form) {
    const err = new Error("فرم مورد نظر یافت نشد");
    err.statusCode = 404;
    throw err;
  }

  return form;
};

const props = ["profileCompleted"];
const getAnalysisModesService = async (query, currentUser) => {
  const singleForms = await getSingleForms(query);
  const stepFlows = await getStepFlows();
  const user = await findById(currentUser?.id, props);

  return {
    singleForms,
    stepFlows,
    profileCompleted: user.profileCompleted,
  };
};

module.exports = {
  createForm,
  updateForm,
  deleteForm,
  getAllAnalysisFormsService,
  getAnalysisFormByIdService,
  getAnalysisModesService,
};
