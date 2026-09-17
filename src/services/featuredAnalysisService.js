const prisma = require("../prismaClient");
const { createBadRequestError, buildProjectAccessWhere } = require("../utils");
const {
  COMPANY_PROFILE_INCLUDE,
  buildProfileStatus,
} = require("../utils/profileStatus");
const { attachProjectsToFeaturedAnalyses } = require("./projectService");
const {
  getEnabledTierFormKeys,
  buildFormKey,
} = require("./companyAnalysisTierService");

const FEATURED_PROJECT_SELECT = {
  id: true,
  title: true,
};

const mapFeaturedAnalysisItem = (company, item) => {
  if (item.analysisForm) {
    return {
      id: item.analysisForm.id,
      title: item.analysisForm.title,
      titleFa: item.analysisForm.titleFa,
      mode: "SINGLE",
      ...buildProfileStatus(company, item.analysisForm.profileFields),
    };
  }

  if (item.multiAnalysisForm) {
    return {
      id: item.multiAnalysisForm.id,
      title: item.multiAnalysisForm.title,
      titleFa: item.multiAnalysisForm.titleFa,
      mode: "MULTI",
      ...buildProfileStatus(company, item.multiAnalysisForm.profileFields),
    };
  }

  return null;
};

const assertFeaturedAnalysisExists = async (analysisId) => {
  const featured = await prisma.featuredAnalysis.findFirst({
    where: {
      OR: [{ analysisFormId: analysisId }, { multiAnalysisFormId: analysisId }],
    },
    select: { id: true },
  });

  if (!featured) {
    createBadRequestError("تحلیل ویژه یافت نشد", 404);
  }
};

const featuredAnalysisService = {
  async findAll(user) {
    const { companyId } = user;

    const [data, company] = await Promise.all([
      prisma.featuredAnalysis.findMany({
        select: {
          analysisForm: {
            select: {
              id: true,
              title: true,
              titleFa: true,
              profileFields: true,
            },
          },
          multiAnalysisForm: {
            select: {
              id: true,
              title: true,
              titleFa: true,
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

    const enabledKeys = await getEnabledTierFormKeys(companyId);

    const featuredItems = data
      .map((item) => mapFeaturedAnalysisItem(company, item))
      .filter(Boolean)
      .map((item) => {
        const isEnabled = enabledKeys.has(
          buildFormKey(item.mode === "SINGLE" ? "single" : "multi", item.id),
        );

        return isEnabled ? item : { ...item, disabletier: true };
      });

    return attachProjectsToFeaturedAnalyses(user, featuredItems);
  },

  async getProjects(user, analysisId, query = {}) {
    await assertFeaturedAnalysisExists(analysisId);

    const { page = 1, limit = 5, search } = query;
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.max(parseInt(limit, 10) || 5, 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const accessWhere = await buildProjectAccessWhere({
      userId: user.id,
      userRole: user.role,
      companyId: user.companyId,
    });

    const filters = [
      accessWhere,
      {
        OR: [{ formId: analysisId }, { multiAnalysisFormId: analysisId }],
      },
    ];

    if (search?.trim()) {
      filters.push({
        title: {
          contains: search.trim(),
        },
      });
    }

    const whereClause = { AND: filters };

    const [projects, totalItems] = await Promise.all([
      prisma.project.findMany({
        where: whereClause,
        skip,
        take: parsedLimit,
        orderBy: { createdAt: "desc" },
        select: FEATURED_PROJECT_SELECT,
      }),
      prisma.project.count({
        where: whereClause,
      }),
    ]);

    return {
      projects,
      pagination: {
        totalItems,
        currentPage: parsedPage,
        totalPages: Math.ceil(totalItems / parsedLimit) || 0,
        limit: parsedLimit,
      },
    };
  },
};

module.exports = {
  featuredAnalysisService,
};
