const axios = require("axios");
const prisma = require("../prismaClient");
const INDUSTRY_INSIGHT_API_URL = "https://your-api.com/industry-insight";

const keepLastFourInsights = async (industryName) => {
  const insights = await prisma.industryInsight.findMany({
    where: { industryName },
    orderBy: { fetchedAt: "desc" },
    select: { id: true },
  });

  if (insights.length > 4) {
    const idsToDelete = insights.slice(4).map((i) => i.id);
    await prisma.industryInsight.deleteMany({
      where: { id: { in: idsToDelete } },
    });
  }
};

const syncIndustryInsightService = async (companyId) => {
  if (!companyId) return null;

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { industry: true },
    });

    const industryName = company?.industry?.trim();
    if (!industryName) return null;

    const lastInsight = await prisma.industryInsight.findFirst({
      where: { industryName },
      orderBy: { fetchedAt: "desc" },
      select: { fetchedAt: true },
    });

    if (lastInsight) {
      const hoursSinceLast =
        (Date.now() - new Date(lastInsight.fetchedAt).getTime()) /
        (1000 * 60 * 60);
      if (hoursSinceLast < 20) {
        console.log(`⏭️ ${industryName} هنوز تازه است (skip)`);
        return lastInsight;
      }
    }

    // ادامه درخواست به API
    const response = await axios.post(
      INDUSTRY_INSIGHT_API_URL,
      { industry: industryName, language: "fa" },
      { timeout: 60000 },
    );

    const newInsight = {
      industryName,
      title: response.data.title || `بینش صنعت ${industryName}`,
      insightText: response.data.insight || response.data.insightText,
      source: response.data.source || "AI",
      fetchedAt: new Date(),
    };

    const saved = await prisma.industryInsight.create({ data: newInsight });
    await keepLastFourInsights(industryName);

    return saved;
  } catch (error) {
    console.error(
      `Industry Insight Error for company ${companyId}:`,
      error.message,
    );
    return null;
  }
};

const getLatestIndustryInsightsService = async (companyId, limit = 4) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { industry: true },
    });

    const industryName = company?.industry?.trim();

    return await prisma.industryInsight.findMany({
      where: { industryName },
      orderBy: { fetchedAt: "desc" },
      take: limit,
    });
  } catch (error) {
    console.error(
      `Error fetching insights for company ${companyId}:`,
      error.message,
    );
    return [];
  }
};

module.exports = {
  syncIndustryInsightService,
  getLatestIndustryInsightsService,
};
