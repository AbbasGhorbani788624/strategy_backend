const prisma = require("../prismaClient");
const { createBadRequestError } = require("../utils");
const axios = require("axios");

const AI_INSIGHT_API_URL = "http://185.237.85.53:8080/insights";

const callAIInsightAPI = async (payload) => {
  try {
    const response = await axios.post(AI_INSIGHT_API_URL, payload, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 60000,
    });

    console.log(JSON.stringify(response.data, null, 2));
    return {
      insight: response.data.executiveInsight || "",
      recommendedAnalyses: response.data.recommendedAnalyses || [],
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
    Additional_company_information: companyAdminData?.data ?? null,
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

  let insight = await prisma.companyInsight.findUnique({
    where: {
      companyId,
    },
  });

  if (insight) {
    return insight;
  }

  insight = await syncCompanyInsightService(companyId, userId);

  return insight;
};

module.exports = {
  syncCompanyInsightService,
  getCompanyInsightService,
};

//  console.error("========== AI API ERROR ==========");
//     console.error("Message:", error.message);
//     console.error("Code:", error.code);
//     console.error("Status:", error.response?.status);
//     console.error("Status Text:", error.response?.statusText);
//     console.error("Response Data:", error.response?.data);
//     console.error("Response Headers:", error.response?.headers);
//     console.error("Request URL:", error.config?.url);
//     console.error("Request Method:", error.config?.method);
//     console.error("Request Data:", error.config?.data);
//     console.error("==================================");
