const {
  featuredAnalysisService,
} = require("../services/featuredAnalysisService");

exports.getFeaturedAnalyses = async (req, res, next) => {
  try {
    const data = await featuredAnalysisService.findAll();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
    res.status(500).json({ success: false, message: err.message });
  }
};
