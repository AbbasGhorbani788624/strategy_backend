const prisma = require("../prismaClient");

const createCompany = async (data) => {
  return prisma.company.create({ data });
};

const findCompanyByName = async (name) => {
  return prisma.company.findFirst({
    where: { name },
  });
};

const findCompanyById = async (id) => {
  return prisma.company.findUnique({
    where: { id },
    include: {
      members: {
        where: { role: "COMPANY" },
        take: 1,
      },
    },
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
};
