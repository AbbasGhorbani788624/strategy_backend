const prisma = require("../prismaClient");

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
  upsertCompanyAdminData,
};
