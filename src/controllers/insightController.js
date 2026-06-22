const {
  syncCompanyInsightService,
  getCompanyInsightService,
} = require("../services/insightService");

exports.syncCompanyInsightController = async (req, res, next) => {
  try {
    const result = await syncCompanyInsightService(
      req.user.companyId,
      req.user.id,
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.getCompanyInsightController = async (req, res, next) => {
  try {
    const result = await getCompanyInsightService(
      req.user.companyId,
      req.user.id,
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
