const express = require("express");
const auth = require("../middleware/auth");

const {
  getFeaturedAnalyses,
  getFeaturedAnalysisProjects,
} = require("../controllers/featuredAnalysiscontroller");
const {
  featuredAnalysisProjectsQuerySchema,
} = require("../validations/featuredAnalysisProjectsQueryValidation");

const router = express.Router();

router.get("/", auth, getFeaturedAnalyses);

router.get(
  "/:analysisId/projects",
  auth,
  featuredAnalysisProjectsQuerySchema,
  getFeaturedAnalysisProjects,
);

module.exports = router;
