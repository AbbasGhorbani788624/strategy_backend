const express = require("express");
const auth = require("../middleware/auth");

const {
  getFeaturedAnalyses,
} = require("../controllers/featuredAnalysiscontroller");

const router = express.Router();

router.get("/", auth, getFeaturedAnalyses);

module.exports = router;
