const prisma = require("../prismaClient");
const {
  COMPANY_PROFILE_INCLUDE,
  buildProfileStatus,
} = require("../utils/profileStatus");

const featuredAnalysisService = {
  async findAll(companyId) {
    const [data, company] = await Promise.all([
      prisma.featuredAnalysis.findMany({
        select: {
          analysisForm: {
            select: {
              id: true,
              title: true,
              profileFields: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.company.findUnique({
        where: {
          id: companyId,
        },
        include: COMPANY_PROFILE_INCLUDE,
      }),
    ]);

    return data.map(({ analysisForm }) => ({
      id: analysisForm.id,
      title: analysisForm.title,
      ...buildProfileStatus(company, analysisForm.profileFields),
    }));
  },
};

module.exports = {
  featuredAnalysisService,
};
