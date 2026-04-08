const express = require("express");
const auth = require("../middleware/auth");
const { getAnalysisModes } = require("../controllers/analysisFormController");
const {
  getActiveFlows,
  startStepSession,
  analyzeStep,
  getFinalAnalysis,
} = require("../controllers/stepFlowController");

const {
  submitFormAnalysis,
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

//پرکردن فرم
router.post("/", auth, validateFormSubmission, submitFormAnalysis);

//گرفتن فرم
router.get("/:formId", auth, getFormForUser);

//فرستادن  نوع فرم ها
router.get("/modes", auth, getAnalysisModes);

// دریافت لیست مسیرهای مرحله‌ای فعال

router.get("/flows", auth, getActiveFlows);

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

// router.post("/chat", async (req, res) => {
//   const { conversation } = req.body;

//   if (!conversation || !Array.isArray(conversation)) {
//     return res.status(400).json({ error: "conversation array is required" });
//   }

//   try {
//     const completion = await openai.chat.completions.create({
//       model: "openrouter/free",
//       messages: conversation,
//       max_tokens: 500,
//     });

//     const aiReply = completion.choices[0].message?.content;
//     res.json({ reply: aiReply });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "AI error" });
//   }
// });
