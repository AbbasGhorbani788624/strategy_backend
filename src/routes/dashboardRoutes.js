const express = require("express");
const auth = require("../middleware/auth");
const { roleGuard } = require("../middleware/roleGuard");
const {
  getDashboard,
  getDashboardCompanyInsight,
} = require("../controllers/dashboardController");
const {
  strategyPlanByProjectQuerySchema,
} = require("../validations/strategyPlanByProjectQueryValidation");

const router = express.Router();

const defaultDashboardFramework = (req, _res, next) => {
  if (!req.query.framework) {
    req.query.framework = "BSC";
  }
  next();
};

router.get(
  "/",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  defaultDashboardFramework,
  strategyPlanByProjectQuerySchema,
  getDashboard,
);

router.get("/company-insight", auth, getDashboardCompanyInsight);

module.exports = router;
