const {
  featuredAnalysisService,
} = require("../services/featuredAnalysisService");

exports.getFeaturedAnalyses = async (req, res, next) => {
  try {
    const data = await featuredAnalysisService.findAll(req.user.companyId);

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
