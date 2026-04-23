const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");

const {
  analysisFormSchema,
} = require("../../validations/analysisFormValidation");
const { roleGuard } = require("../../middleware/roleGuard");
const {
  createAnalysisForm,
  updateAnalysisForm,
  deleteAnalysisForm,
  getAllAnalysisForms,
  getAnalysisFormById,
} = require("../../controllers/analysisFormController");

//گرفتن همه فرم های تحلیل
router.get("/", auth, roleGuard(["SUPER_ADMIN"]), getAllAnalysisForms);

//گرفتن تک فرم تحلیل
router.get("/:id", auth, roleGuard(["SUPER_ADMIN"]), getAnalysisFormById);

//ساخت فرم تحلیل
router.post(
  "/",
  auth,
  roleGuard(["SUPER_ADMIN"]),
  analysisFormSchema,
  createAnalysisForm,
);

//ویرایش فرم تحلیل
router.put(
  "/:id",
  auth,
  roleGuard(["SUPER_ADMIN"]),
  analysisFormSchema,
  updateAnalysisForm,
);

//حذف فرم تحلیل
router.delete("/:id", auth, roleGuard(["SUPER_ADMIN"]), deleteAnalysisForm);

module.exports = router;
