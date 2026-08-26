const axios = require("axios");
const prisma = require("../prismaClient");
const INDUSTRY_INSIGHT_API_URL = "https://strategy.ratorai.com/ai/industry";

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

    console.log("[IndustryInsight] Request:", { companyId, industry, region });

    const response = await axios.post(
      INDUSTRY_INSIGHT_API_URL,
      {
        industry,
        region,
      },
      {
        timeout: 120000,
      },
    );

    console.log("[IndustryInsight] Response:", response.data);

    await prisma.industryInsight.create({
      data: {
        industryName: industry,
        source: INDUSTRY_INSIGHT_API_URL,
        insightData: response.data,
      },
    });

    return response.data;
  } catch (error) {
    const toPlain = (value) => {
      if (value == null) return value;
      try {
        return JSON.parse(JSON.stringify(value));
      } catch {
        return String(value);
      }
    };

    console.error(
      "[IndustryInsight] Sync failed:\n" +
        JSON.stringify(
          {
            companyId,
            name: error.name,
            message: error.message,
            code: error.code,
            isAxiosError: error.isAxiosError === true,
            status: error.response?.status,
            statusText: error.response?.statusText,
            responseData: toPlain(error.response?.data),
            responseHeaders: toPlain(error.response?.headers),
            request: error.config
              ? {
                  method: error.config.method,
                  url: error.config.url,
                  timeout: error.config.timeout,
                  data: toPlain(error.config.data),
                  headers: toPlain(error.config.headers),
                }
              : undefined,
            stack: error.stack,
          },
          null,
          2,
        ),
    );

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
