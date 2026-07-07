const {
  syncIndustryInsightService,
  getLatestIndustryInsightsService,
} = require("../services/IndustryInsightService");

exports.refreshCompanyInsights = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const result = await syncIndustryInsightService(companyId);

    if (result) {
      res.json({ success: true, data: result });
    } else {
      res.status(400).json({
        success: false,
        message: "امکان دریافت بینش صنعت وجود ندارد",
      });
    }
  } catch (error) {
    next(error);
  }
};

exports.getLatestIndustryInsights = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const result = await getLatestIndustryInsightsService(companyId);

    if (result) {
      res.json({ success: true, data: result });
    } else {
      res.status(400).json({
        success: false,
        message: "امکان دریافت بینش صنعت وجود ندارد",
      });
    }
  } catch (error) {
    next(error);
  }
};
