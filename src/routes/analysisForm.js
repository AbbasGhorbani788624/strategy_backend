const express = require("express");
const auth = require("../middleware/auth");
const {
  getAnalysisModes,
  submitFormAnswers,
  handleConversationStep,
  getCompanyAnalysisStatistics,
} = require("../controllers/analysisFormController");

const {
  getFormForUser,
} = require("../controllers/submitFormAnalysisController");
const {
  validateFormSubmission,
} = require("../validations/submitFormAnalysisValidation");

const router = express.Router();

// امار تحلیل
router.get("/analysis-statistics", auth, getCompanyAnalysisStatistics);

//فرستادن  نوع فرم ها لیست فرم های تکی و مرحله ای
router.get("/modes", auth, getAnalysisModes);

//گرفتن فرم
router.get("/:formId", auth, getFormForUser);

//پرکردن فرم
router.post("/", auth, validateFormSubmission, submitFormAnswers);

//گرفتن تحلیل نهایی و ریسک
router.post("/:id", auth, handleConversationStep);

module.exports = router;
