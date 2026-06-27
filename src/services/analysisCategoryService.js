const prisma = require("../prismaClient");

const getAnalysisCategoriesService = async () => {
  return await prisma.analysisCategory.findMany({
    select: {
      id: true,
      title: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
};

module.exports = {
  getAnalysisCategoriesService,
};
