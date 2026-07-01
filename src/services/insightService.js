const prisma = require("../prismaClient");
const { createBadRequestError } = require("../utils");
const axios = require("axios");

const AI_INSIGHT_API_URL = "https://your-api.com/generate-company-insight";

const callAIInsightAPI = async (company) => {
  try {
    const response = await axios.post(
      AI_INSIGHT_API_URL,
      {
        company: company,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 60000,
      },
    );

    return {
      insight: response.data.insight || response.data.insightText,
      recommendedAnalyses:
        response.data.recommendedAnalyses ||
        response.data.suggestedAnalyses ||
        [],
    };
  } catch (error) {
    console.error("AI API Error:", error.response?.data || error.message);

    createBadRequestError(
      error.response?.data?.message || "خطا در دریافت تحلیل هوش مصنوعی",
      500,
    );
  }
};

const syncCompanyInsightService = async (companyId, userId) => {
  const company = await prisma.company.findFirst({
    where: {
      id: companyId,
      members: {
        some: {
          id: userId,
        },
      },
    },
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
          parentUnitName: true,
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
          fiscalPeriodStart: true,
          fiscalPeriodEnd: true,
          category: true,
          title: true,
          amount: true,
          description: true,
          sortOrder: true,
        },
      },
      incomeStatements: {
        select: {
          fiscalPeriodStart: true,
          fiscalPeriodEnd: true,
          category: true,
          title: true,
          amount: true,
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
    ...companyData,
    "Additional company information": companyAdminData?.data ?? null,
  };

  const aiResponse = await callAIInsightAPI(aiPayload);

  const insight = await prisma.companyInsight.upsert({
    where: {
      companyId,
    },
    create: {
      companyId,
      insightText: aiResponse.insight,
      suggestedAnalyses: aiResponse.recommendedAnalyses,
      generatedAt: new Date(),
    },
    update: {
      insightText: aiResponse.insight,
      suggestedAnalyses: aiResponse.recommendedAnalyses,
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

  const insight = await prisma.companyInsight.findUnique({
    where: {
      companyId,
    },
  });

  return insight;
};

module.exports = {
  syncCompanyInsightService,
  getCompanyInsightService,
};
