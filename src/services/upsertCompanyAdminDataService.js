const {
  findCompanyById,
  upsertCompanyAdminData,
} = require("../repositories/companyAdmin");

const upsertCompanyAdminDataService = async (companyId, data) => {
  if (!companyId) {
    const err = new Error("ایدی شرکت الزامی است");
    err.statusCode = 400;
    throw err;
  }

  const company = await findCompanyById(companyId);

  if (!company) {
    const err = new Error("شرکت یافت نشد");
    err.statusCode = 404;
    throw err;
  }

  return upsertCompanyAdminData(companyId, data);
};

module.exports = { upsertCompanyAdminDataService };
