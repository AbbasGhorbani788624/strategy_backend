const express = require("express");
const auth = require("../middleware/auth");
const {
  getAnalysisModes,
  submitFormAnswers,
  handleConversationStep,
} = require("../controllers/analysisFormController");

const {
  getFormForUser,
} = require("../controllers/submitFormAnalysisController");
const {
  validateFormSubmission,
} = require("../validations/submitFormAnalysisValidation");

const router = express.Router();

//فرستادن  نوع فرم ها لیست فرم های تکی و مرحله ای
router.get("/modes", auth, getAnalysisModes);

//گرفتن فرم تکی
router.get("/:formId", auth, getFormForUser);

//پرکردن فرم تکی
router.post("/", auth, validateFormSubmission, submitFormAnswers);

//ارتباط با ai
router.post("/:id", auth, handleConversationStep);

module.exports = router;
