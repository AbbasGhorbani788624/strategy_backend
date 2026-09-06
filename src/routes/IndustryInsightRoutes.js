const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  getLatestIndustryInsights,
} = require("../controllers/IndustryInsightContoller");

//بینش صنعت
router.get("/", auth, getLatestIndustryInsights);

module.exports = router;
