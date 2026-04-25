const { upsertCompanyAdminData } = require("../repositories/companyAdmin");
const { findCompanyById } = require("../repositories/companyRepository");
const { createBadRequestError } = require("../utils");

const upsertCompanyAdminDataService = async (companyId, data) => {
  if (!companyId) {
    createBadRequestError("ایدی شرکت الزامی است");
  }

  const company = await findCompanyById(companyId);

  if (!company) {
    createBadRequestError("شرکت یافت نشد", 404);
  }

  return upsertCompanyAdminData(companyId, data);
};

module.exports = { upsertCompanyAdminDataService };
