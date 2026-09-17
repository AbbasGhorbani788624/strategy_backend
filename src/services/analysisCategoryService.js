const prisma = require("../prismaClient");

const {
  COMPANY_PROFILE_INCLUDE,
  buildProfileStatus,
} = require("../utils/profileStatus");
const {
  getEnabledTierFormKeys,
  isAnalysisAllowed,
} = require("./companyAnalysisTierService");

const mapForm = (company, form, type, enabledKeys) => ({
  id: form.id,
  title: form.title,
  type,
  isAllowed: isAnalysisAllowed(enabledKeys, form.id, type),
  ...buildProfileStatus(company, form.profileFields),
});

const getAnalysisCategoriesService = async (companyId) => {
  const [categories, company, enabledKeys] = await Promise.all([
    prisma.analysisCategory.findMany({
      select: {
        id: true,
        title: true,

        forms: {
          where: {
            isActive: true,
          },
          select: {
            id: true,
            title: true,
            categoryId: true,
            profileFields: true,
          },
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        },

        multiForms: {
          where: {
            isActive: true,
          },
          select: {
            id: true,
            title: true,
            categoryId: true,
            profileFields: true,
          },
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        },
      },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    }),

    prisma.company.findUnique({
      where: {
        id: companyId,
      },
      include: COMPANY_PROFILE_INCLUDE,
    }),

    getEnabledTierFormKeys(companyId),
  ]);

  return categories.map((category) => ({
    id: category.id,
    title: category.title,
    forms: [
      ...category.forms.map((form) => mapForm(company, form, 1, enabledKeys)),
      ...category.multiForms.map((form) =>
        mapForm(company, form, 2, enabledKeys),
      ),
    ],
  }));
};

module.exports = {
  getAnalysisCategoriesService,
};
