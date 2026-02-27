const express = require("express");
const auth = require("../middleware/auth");
const { getAnalysisModes } = require("../controllers/analysisFormController");
const {
  submitFormAnalysis,
  getFormForUser,
} = require("../controllers/submitFormAnalysisController");
const {
  validateFormSubmission,
} = require("../validations/submitFormAnalysisValidation");

const router = express.Router();

router.post("/", auth, validateFormSubmission, submitFormAnalysis);

router.get("/:formId", auth, getFormForUser);

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

router.get("/modes", auth, getAnalysisModes);

module.exports = router;
