const { getFormById } = require("../repositories/analysisFormRepository");
const { createBadRequestError } = require("../utils");

const getFormForUserService = async (formId) => {
  if (!formId) {
    createBadRequestError("ایدی فرم الزامی است");
  }
  const form = await getFormById(formId);

  if (!form) {
    createBadRequestError("فرم یافت نشد", 404);
  }

  return form;
};

module.exports = { getFormForUserService };
