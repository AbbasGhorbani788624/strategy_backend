const prisma = require("../prismaClient");

const featuredAnalysisService = {
  async findAll() {
    const data = await prisma.featuredAnalysis.findMany({
      select: {
        analysisForm: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return data.map((item) => item.analysisForm);
  },
};
module.exports = {
  featuredAnalysisService,
};
