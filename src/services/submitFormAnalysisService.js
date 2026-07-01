const { getFormById } = require("../repositories/analysisFormRepository");
const { createBadRequestError } = require("../utils");

const buildCategoryTree = (categories, questions) => {
  const map = {};

  for (const category of categories) {
    map[category.id] = {
      ...category,
      children: [],
      questions: [],
    };
  }

  for (const question of questions) {
    if (map[question.categoryId]) {
      map[question.categoryId].questions.push(question);
    }
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

const getFormForUserService = async (formId) => {
  if (!formId) {
    createBadRequestError("ایدی فرم الزامی است");
  }

  const form = await getFormById(formId);

  if (!form) {
    createBadRequestError("فرم یافت نشد", 404);
  }

  const categoryTree = buildCategoryTree(form.categories, form.questions);

  const categoryMap = Object.fromEntries(
    form.categories.map((category) => [category.id, category]),
  );

  const categoryGroups = form.categoryGroups.map((group) => ({
    id: group.id,
    title: group.title,
    order: group.order,

    categories: group.categories
      .map((item) => categoryMap[item.categoryId])
      .filter(Boolean),
  }));

  return {
    id: form.id,
    title: form.title,
    description: form.description,

    categories: categoryTree,

    categoryGroups,
  };
};

module.exports = { getFormForUserService };
