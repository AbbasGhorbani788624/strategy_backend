const {
  featuredAnalysisService,
} = require("../services/featuredAnalysisService");

exports.getFeaturedAnalyses = async (req, res) => {
  try {
    const data = await featuredAnalysisService.findAll();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
