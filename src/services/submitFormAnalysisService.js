const { getFormById } = require("../repositories/analysisFormRepository");
const { createBadRequestError } = require("../utils");
const { assertAnalysisFormAllowed } = require("./companyAnalysisTierService");

const buildCategoryTree = (categories) => {
  const map = {};

  for (const category of categories) {
    map[category.id] = {
      ...category,
      children: [],
    };
  }

  const roots = [];

  for (const category of categories) {
    if (category.parentId) {
      map[category.parentId]?.children.push(map[category.id]);
    } else {
      roots.push(map[category.id]);
    }
  }

  return roots;
};

const formatFormForClient = (form) => {
  const categoryTree = buildCategoryTree(form.categories);

  return {
    id: form.id,
    type: form.type,
    title: form.title,
    description: form.description ?? form.info,
    checklistTitle: form.checklistTitle,
    categories: categoryTree,
  };
};

const getFormForUserService = async (companyId, formId) => {
  if (!formId) {
    createBadRequestError("ایدی فرم الزامی است");
  }

  const form = await getFormById(formId);

  if (!form) {
    createBadRequestError("فرم یافت نشد", 404);
  }

  await assertAnalysisFormAllowed(companyId, form.id, form.type);

  return formatFormForClient(form);
};

const analysisFormHasQuestions = (form) =>
  (form.categories || []).some(
    (category) => (category.questions?.length ?? 0) > 0,
  );

module.exports = {
  getFormForUserService,
  formatFormForClient,
  analysisFormHasQuestions,
};
