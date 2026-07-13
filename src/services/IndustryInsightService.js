const axios = require("axios");
const prisma = require("../prismaClient");
const INDUSTRY_INSIGHT_API_URL = "http://185.237.85.53:8080/industry";

const syncIndustryInsightService = async (companyId) => {
  if (!companyId) return null;

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        industry: true,
        basicInfo: {
          select: {
            region: true,
          },
        },
      },
    });

    const industry = company.industry.trim();
    const region = company.basicInfo?.region || "IRAN";

    const response = await axios.post(
      INDUSTRY_INSIGHT_API_URL,
      {
        industry,
        region,
      },
      {
        timeout: 60000,
      },
    );

    await prisma.industryInsight.create({
      data: {
        industryName: industry,
        source: INDUSTRY_INSIGHT_API_URL,
        insightData: response.data,
      },
    });

    return response.data;
  } catch (error) {
    console.log(error);

    return null;
  }
};

const getLatestIndustryInsightsService = async (companyId, limit = 10) => {
  try {
    const company = await prisma.company.findUnique({
      where: {
        id: companyId,
      },
      select: {
        industry: true,
      },
    });

    if (!company?.industry) return [];

    const industry = company.industry.trim();

    let insights = await prisma.industryInsight.findMany({
      where: {
        industryName: industry,
      },
      orderBy: {
        fetchedAt: "desc",
      },
      take: limit,
    });

    if (insights.length === 0) {
      await syncIndustryInsightService(companyId);

      insights = await prisma.industryInsight.findMany({
        where: {
          industryName: industry,
        },
        orderBy: {
          fetchedAt: "desc",
        },
        take: limit,
      });
    }

    return insights;
  } catch (error) {
    console.error(error);
    return [];
  }
};

module.exports = {
  syncIndustryInsightService,
  getLatestIndustryInsightsService,
};
