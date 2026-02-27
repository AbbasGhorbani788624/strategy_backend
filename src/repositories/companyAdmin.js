const prisma = require("../prismaClient");

const findCompanyById = (companyId) => {
  return prisma.company.findUnique({
    where: { id: companyId },
  });
};

const upsertCompanyAdminData = (companyId, data) => {
  return prisma.companyAdminData.upsert({
    where: { companyId },
    update: { data },
    create: {
      companyId,
      data,
    },
  });
};

module.exports = {
  findCompanyById,
  upsertCompanyAdminData,
};
