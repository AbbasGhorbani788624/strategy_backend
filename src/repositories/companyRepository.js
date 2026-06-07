const prisma = require("../prismaClient");

const findCompanyById = (companyId) => {
  return prisma.company.findUnique({
    where: { id: companyId },
  });
};

const isCompanyExists = async (companyId) => {
  return await prisma.company.count({
    where: { id: companyId },
  });
};

const createUser = async (data) => {
  return prisma.user.create({ data });
};

module.exports = {
  createUser,
  findCompanyById,
  isCompanyExists,
};
