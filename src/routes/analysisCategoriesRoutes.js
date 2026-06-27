const express = require("express");
const auth = require("../middleware/auth");

const {
  getAnalysisCategories,
} = require("../controllers/analysisCategoryController");

const router = express.Router();

router.get("/", auth, getAnalysisCategories);

module.exports = router;
