const {
  getAnalysisCategoriesService,
} = require("../services/analysisCategoryService");

exports.getAnalysisCategories = async (req, res, next) => {
  try {
    const categories = await getAnalysisCategoriesService(req.user.companyId);

    return res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};
