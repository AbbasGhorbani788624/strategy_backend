const axios = require("axios");
const prisma = require("../prismaClient");
const INDUSTRY_INSIGHT_API_URL = "https://strategy.ratorai.com/ai/industry";

const formatRegion = (region) => {
  if (region === "INTERNATIONAL") return "International";
  return "Iran";
};

const buildIndustryInsightPayload = (company) => {
  const industry = company.industry.trim();
  const region = formatRegion(company.basicInfo?.region);

  return {
    organization_id: company.id,
    industry,
    region,
    company_profile: {
      basicInfo: {
        companyName: company.name,
        industry,
        region,
      },
      productServices: company.productServices.map((item) => item.name),
      markets: company.markets.map((item) => item.marketName),
      resourceCapabilities: company.resourceCapabilities.map(
        (item) => item.capability,
      ),
    },
  };
};

const syncIndustryInsightService = async (companyId) => {

  if (!companyId) {
    console.log("[IndustryInsight] companyId is missing");
    return null;
  }

  try {
    console.log("[IndustryInsight] STEP 1: Fetching company...");

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        industry: true,
        basicInfo: {
          select: {
            region: true,
          },
        },
        productServices: {
          select: { name: true },
          orderBy: { sortOrder: "asc" },
        },
        markets: {
          select: { marketName: true },
          orderBy: { sortOrder: "asc" },
        },
        resourceCapabilities: {
          select: { capability: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    console.log("[IndustryInsight] STEP 2: Company fetched for companyId:", companyId);

    if (!company) {
      console.error(
        "[IndustryInsight] Company not found:",
        companyId,
      );
      return null;
    }

    if (!company.industry) {
      console.error(
        "[IndustryInsight] Company industry is missing:",
        companyId,
      );
      return null;
    }

    const payload = buildIndustryInsightPayload(company);
    const industry = payload.industry;

    console.log("[IndustryInsight] STEP 3: Preparing request");
    console.log("[IndustryInsight] URL:", INDUSTRY_INSIGHT_API_URL);
    console.log(
      "[IndustryInsight] Outgoing payload:",
      JSON.stringify(payload, null, 2),
    );

    console.log("[IndustryInsight] STEP 4: ABOUT TO SEND REQUEST");

    const startTime = Date.now();

    const response = await axios.post(
      INDUSTRY_INSIGHT_API_URL,
      payload,
      {
        timeout: 120000,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    console.log(
      "[IndustryInsight] STEP 5: REQUEST COMPLETED",
      `${Date.now() - startTime}ms`,
    );

    console.log("[IndustryInsight] Status:", response.status);
    console.log("[IndustryInsight] Response:", response.data);

    console.log("[IndustryInsight] STEP 6: Saving insight...");

    await prisma.industryInsight.create({
      data: {
        industryName: industry,
        source: INDUSTRY_INSIGHT_API_URL,
        insightData: response.data,
      },
    });

    console.log("[IndustryInsight] STEP 7: Insight saved");
    console.log("[IndustryInsight] SERVICE SUCCESS");
    console.log("========================================");

    return response.data;
  } catch (error) {
    console.error("========================================");
    console.error("[IndustryInsight] SERVICE FAILED");

    console.error("[IndustryInsight] name:", error.name);
    console.error("[IndustryInsight] message:", error.message);
    console.error("[IndustryInsight] code:", error.code);

    console.error(
      "[IndustryInsight] isAxiosError:",
      error.isAxiosError,
    );

    console.error(
      "[IndustryInsight] response status:",
      error.response?.status,
    );

    console.error(
      "[IndustryInsight] response data:",
      error.response?.data,
    );

    console.error(
      "[IndustryInsight] response headers:",
      error.response?.headers,
    );

    console.error(
      "[IndustryInsight] request URL:",
      error.config?.url,
    );

    console.error(
      "[IndustryInsight] request method:",
      error.config?.method,
    );

    console.error(
      "[IndustryInsight] request data:",
      error.config?.data,
    );

    console.error("[IndustryInsight] stack:", error.stack);

    console.error("========================================");

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
