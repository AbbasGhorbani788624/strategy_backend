const { getCompanyAnalysisStatisticsService } = require("./analysisFormService");
const { getAnalysisCategoriesService } = require("./analysisCategoryService");
const { featuredAnalysisService } = require("./featuredAnalysisService");
const {
  getTopRatedProjectsByUser,
  getAccessibleProjectsService,
  getMostCommentedProjectsService,
} = require("./projectService");
const { getStrategyQuickAccessService } = require("./strategyPlanService");
const { getLatestIndustryInsightsService } = require("./IndustryInsightService");
const { getCompanyInsightService } = require("./insightService");

const getDashboardService = async (user, framework = "BSC") => {
  const { id: userId, companyId } = user;

  const [
    analysisStatistics,
    categories,
    featuredAnalyses,
    topRated,
    mostCommented,
    accessible,
    strategyQuickAccess,
    industryInsights,
  ] = await Promise.all([
    getCompanyAnalysisStatisticsService(userId),
    getAnalysisCategoriesService(companyId),
    featuredAnalysisService.findAll(companyId),
    getTopRatedProjectsByUser(userId),
    getMostCommentedProjectsService(userId),
    getAccessibleProjectsService(userId),
    getStrategyQuickAccessService(user, framework),
    getLatestIndustryInsightsService(companyId),
  ]);

  return {
    analysisStatistics,
    categories,
    featuredAnalyses,
    projects: {
      topRated,
      mostCommented,
      accessible,
    },
    strategyQuickAccess,
    industryInsights,
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
