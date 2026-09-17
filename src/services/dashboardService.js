const {
  getCompanyAnalysisStatisticsService,
} = require("./analysisFormService");
const { getAnalysisCategoriesService } = require("./analysisCategoryService");
const { featuredAnalysisService } = require("./featuredAnalysisService");

const { getStrategyQuickAccessService } = require("./strategyPlanService");
const {
  getCompanyAnalysisTiersService,
} = require("./companyAnalysisTierService");
const {
  getLatestIndustryInsightsService,
} = require("./IndustryInsightService");
const { getCompanyInsightService } = require("./insightService");

const getDashboardService = async (user, framework = "BSC") => {
  const { id: userId, companyId } = user;

  const [
    analysisStatistics,
    categories,
    featuredAnalyses,
    strategyQuickAccess,
    industryInsights,
    analysisTiers,
  ] = await Promise.all([
    getCompanyAnalysisStatisticsService(userId),
    getAnalysisCategoriesService(companyId),
    featuredAnalysisService.findAll(user),
    getStrategyQuickAccessService(user, framework),
    getLatestIndustryInsightsService(companyId),
    getCompanyAnalysisTiersService(companyId),
  ]);

  return {
    analysisStatistics,
    categories,
    featuredAnalyses,
    strategyQuickAccess,
    industryInsights,
    analysisTiers,
  };
};

const getDashboardCompanyInsightService = async (companyId, userId) => {
  const companyInsight = await getCompanyInsightService(companyId, userId);

  return { companyInsight };
};

module.exports = {
  getDashboardService,
  getDashboardCompanyInsightService,
};
