const { assertMonitoringUnlocked } = require("../services/companyAnalysisTierService");

const requireMonitoringUnlocked = async (req, res, next) => {
  try {
    await assertMonitoringUnlocked(req.user?.companyId);
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = requireMonitoringUnlocked;
