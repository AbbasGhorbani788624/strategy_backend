const prisma = require("../prismaClient");
const {
  createBadRequestError,
  buildCompanyAdminDataForPrompt,
} = require("../utils");
const {
  buildFormKey,
  getEnabledTierFormKeys,
} = require("./companyAnalysisTierService");
const axios = require("axios");

const AI_INSIGHT_API_URL = "https://strategy.ratorai.com/ai/insights";

const enrichSuggestedAnalysesWithTitleFa = async (
  suggestedAnalyses,
  enabledTierFormKeys,
) => {
  if (!Array.isArray(suggestedAnalyses) || suggestedAnalyses.length === 0) {
    return suggestedAnalyses ?? [];
  }

  const forms = await prisma.analysisForm.findMany({
    select: {
      id: true,
      title: true,
      titleFa: true,
    },
  });

  const formsById = new Map(forms.map((form) => [form.id, form]));
  const formsByTitle = new Map(
    forms.map((form) => [form.title.trim().toLowerCase(), form]),
  );

  return suggestedAnalyses.map((item) => {
    let form = item.analysisId ? formsById.get(item.analysisId) : null;

    if (!form && item.title) {
      form = formsByTitle.get(item.title.trim().toLowerCase());
    }

    return {
      ...item,
      analysisId: form?.id ?? item.analysisId ?? null,
      titleFa: form?.titleFa ?? item.titleFa ?? null,
      disable:
        !form?.id || !enabledTierFormKeys.has(buildFormKey("single", form.id)),
    };
  });
};

const callAIInsightAPI = async (payload) => {
  try {
    const response = await axios.post(AI_INSIGHT_API_URL, payload, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 60000,
    });

    return {
      insight: response.data.executiveInsight || "",
      recommendedAnalyses: Array.isArray(response.data.recommendedAnalyses)
        ? response.data.recommendedAnalyses
        : [],
    };
  } catch (error) {
    throw createBadRequestError(
      error.response?.data?.message ||
        error.message ||
        "خطا در دریافت تحلیل هوش مصنوعی",
      error.response?.status || 500,
    );
  }
};

const syncCompanyInsightService = async (companyId, userId = null) => {
  const where = {
    id: companyId,
  };

  if (userId) {
    where.members = {
      some: {
        id: userId,
      },
    };
  }
  const company = await prisma.company.findFirst({
    where,
    include: {
      basicInfo: true,
      managers: {
        select: {
          fullName: true,
          positionTitle: true,
          isBoardMember: true,
          isStrategyTeamMember: true,
          companyWorkExperience: true,
          totalWorkExperience: true,
        },
      },
      revenueCenters: true,
      shareholders: true,
      organizationUnits: {
        select: {
          unitName: true,
          structureLevel: true,
          isRevenueCenter: true,
          managerName: true,
          employeeCount: true,
        },
      },
      licenseCertificates: {
        select: {
          title: true,
          issuerReference: true,
          issueDate: true,
          type: true,
        },
      },
      memberships: true,
      productServices: true,
      markets: true,
      keyCustomers: true,
      balanceSheets: {
        select: {
          year: true,
          title: true,
          balanceSheet: true,
        },
      },
      incomeStatements: {
        select: {
          year: true,
          title: true,
          incomeStatement: true,
        },
      },
      keySuppliers: {
        select: {
          supplierName: true,
          productOrService: true,
          bargainingPower: true,
          supplierMarket: true,
          description: true,
          sortOrder: true,
        },
      },
      rawMaterials: {
        select: {
          materialName: true,
          costImpactLevel: true,
          purchaseBudgetShare: true,
          category: true,
          description: true,
          sortOrder: true,
        },
      },
      resourceCapabilities: true,
      companyAdminData: {
        select: {
          data: true,
        },
      },
    },
  });

  if (!company) {
    createBadRequestError("شرکت یافت نشد.", 404);
  }

  const { companyAdminData, ...companyData } = company;

  const aiPayload = {
    company: companyData,
    ...buildCompanyAdminDataForPrompt(companyAdminData?.data),
  };

  const aiResponse = await callAIInsightAPI(aiPayload);

  const forms = await prisma.analysisForm.findMany({
    select: {
      id: true,
      title: true,
      titleFa: true,
    },
  });

  const formsMap = new Map(
    forms.map((form) => [form.title.trim().toLowerCase(), form]),
  );

  const suggestedAnalyses = aiResponse.recommendedAnalyses.map((item) => {
    const normalizedTitle = item.title?.trim().toLowerCase();

    const form = normalizedTitle ? formsMap.get(normalizedTitle) : null;

    if (!form) {
      console.warn(`Analysis form not found for title: ${item.title}`);
    }

    return {
      ...item,
      analysisId: form?.id ?? null,
      titleFa: form?.titleFa ?? null,
    };
  });

  const insight = await prisma.companyInsight.upsert({
    where: {
      companyId,
    },
    create: {
      companyId,
      insightText: aiResponse.insight,
      suggestedAnalyses,
      generatedAt: new Date(),
    },
    update: {
      insightText: aiResponse.insight,
      suggestedAnalyses,
      generatedAt: new Date(),
    },
  });

  return insight;
};

const getCompanyInsightService = async (companyId, userId) => {
  const company = await prisma.company.findFirst({
    where: {
      id: companyId,
      members: {
        some: {
          id: userId,
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (!company) {
    createBadRequestError("شرکت یافت نشد.", 404);
  }

  let insight = await prisma.companyInsight.findUnique({
    where: {
      companyId,
    },
  });

  if (!insight) {
    insight = await syncCompanyInsightService(companyId, userId);
  }

  const enabledTierFormKeys = await getEnabledTierFormKeys(companyId);

  return {
    ...insight,
    suggestedAnalyses: await enrichSuggestedAnalysesWithTitleFa(
      insight.suggestedAnalyses,
      enabledTierFormKeys,
    ),
  };
};

module.exports = {
  syncCompanyInsightService,
  getCompanyInsightService,
};
