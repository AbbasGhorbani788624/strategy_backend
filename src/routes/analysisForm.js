const express = require("express");
const auth = require("../middleware/auth");
const {
  getAnalysisModes,
  submitFormAnswers,
  handleConversationStep,
} = require("../controllers/analysisFormController");
const {
  startStepSession,
  analyzeStep,
  getFinalAnalysis,
} = require("../controllers/stepFlowController");

const {
  getFormForUser,
} = require("../controllers/submitFormAnalysisController");
const {
  validateFormSubmission,
} = require("../validations/submitFormAnalysisValidation");
const {
  analyzeStepValidation,
} = require("../validations/analyzeStepValidation");

const { roleGuard } = require("../middleware/roleGuard");

const router = express.Router();

//فرستادن  نوع فرم ها لیست فرم های تکی و مرحله ای
router.get("/modes", auth, getAnalysisModes);

//گرفتن فرم تکی
router.get("/:formId", auth, getFormForUser);

//پرکردن فرم تکی
router.post("/", auth, validateFormSubmission, submitFormAnswers);

router.post("/:id", auth, handleConversationStep);

//////////////////////////////////

// شروع جلسه مرحله‌ای
router.post(
  "/flow/start",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  analyzeStepValidation,
  startStepSession,
);

// ارسال پاسخ هر مرحله
router.post(
  "/:sessionId/analyze",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  validateFormSubmission,
  analyzeStep,
);

// دریافت تحلیل نهایی
router.get(
  "/:sessionId/final-analysis",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  getFinalAnalysis,
);

module.exports = router;

// دریافت لیست مسیرهای مرحله‌ای فعال
// router.get("/flows", auth, getActiveFlows);
