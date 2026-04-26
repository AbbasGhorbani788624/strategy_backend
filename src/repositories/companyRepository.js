const prisma = require("../prismaClient");

const createCompany = async (data) => {
  return prisma.company.create({ data });
};

const findCompanyByName = async (name) => {
  return prisma.company.findFirst({
    where: { name },
  });
};

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
  createCompany,
  createUser,
  findCompanyByName,
  findCompanyById,
  isCompanyExists,
};
