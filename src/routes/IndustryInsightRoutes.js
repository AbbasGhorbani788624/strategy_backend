const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { roleGuard } = require("../middleware/roleGuard");
const {
  getLatestIndustryInsights,
} = require("../controllers/IndustryInsightContoller");

//بینش صنعت
router.get("/", auth, getLatestIndustryInsights);

module.exports = router;
