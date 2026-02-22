const prisma = require("../prismaClient");

const createCompany = async (data) => {
  return prisma.company.create({ data });
};

const findCompanyByName = async (name) => {
  return prisma.company.findUnique({ where: { name } });
};

const createUser = async (data) => {
  return prisma.user.create({ data });
};

module.exports = { createCompany, createUser, findCompanyByName };
