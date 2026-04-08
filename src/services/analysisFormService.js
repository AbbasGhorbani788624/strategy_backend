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
const { createBadRequestError } = require("../utils");

//ساخت فرم تحلیل
const createForm = async (data) => {
  return createWithQuestions(data);
};

//ویرایش قرم تحلیل
const updateForm = async (id, data) => {
  if (!id) {
    createBadRequestError("آیدی فرم ارسال نشده");
  }
  const existing = await getFormById(id);

  if (!existing) {
    createBadRequestError("فرم پیدا نشد", 404);
  }

  return updateFormWithQuestions(id, data);
};

// حذف فرم تحلیل
const deleteForm = async (id) => {
  if (!id) {
    createBadRequestError("آیدی فرم ارسال نشده");
  }

  const existing = await getFormById(id);
  if (!existing) {
    createBadRequestError("فرم پیدا نشد", 404);
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
    createBadRequestError("شناسه فرم الزامی است");
  }

  const form = await getAnalysisFormById(id);

  if (!form) {
    createBadRequestError("فرم مورد نظر یافت نشد", 404);
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
