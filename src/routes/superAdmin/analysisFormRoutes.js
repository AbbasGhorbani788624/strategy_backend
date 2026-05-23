const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const { roleGuard } = require("../../middleware/roleGuard");
const {
  createAnalysisForm,
  deleteAnalysisForm,
  getAllAnalysisForms,
  getAnalysisFormById,
  createAnalysisFormPromptVersion,
  updateAnalysisFormPromptDefinition,
  updateAnalysisFormPromptVersion,
  publishAnalysisFormPromptVersion,
  createMultiAnalysisForm,
  createMultiAnalysisFormPromptVersion,
  updateMultiAnalysisFormPromptDefinition,
  updateMultiAnalysisFormPromptVersion,
  publishMultiAnalysisFormPromptVersion,
  updateAnalysisForm,
  updateMultiAnalysisFormController,
} = require("../../controllers/analysisFormController");

const createAnalysisFormValidator = require("../../validations/analysisForm/createAnalysisForm.validator");
const createPromptVersionValidator = require("../../validations/analysisForm/createPromptVersion.validator");
const updatePromptDefinitionValidator = require("../../validations/analysisForm/updatePromptDefinition.validator");
const updatePromptVersionValidator = require("../../validations/analysisForm/updatePromptVersion.validator");
const publishPromptVersionValidator = require("../../validations/analysisForm/publishPromptVersion.validator");

//گرفتن همه فرم های تحلیل
router.get("/", auth, roleGuard(["SUPER_ADMIN"]), getAllAnalysisForms);

//گرفتن تک فرم تحلیل
router.get("/:id", auth, roleGuard(["SUPER_ADMIN"]), getAnalysisFormById);

// ایجاد فرم تحلیل جدید
// شامل اطلاعات پایه فرم مثل title, info, questions, goals
router.post(
  "/",
  auth,
  roleGuard(["SUPER_ADMIN"]),
  createAnalysisFormValidator,
  createAnalysisForm,
);

//ویرایش اطلاعات پایه
router.patch("/:id", auth, roleGuard(["SUPER_ADMIN"]), updateAnalysisForm);

// ایجاد یک نسخه جدید از prompt برای یک فرم تحلیل
// این endpoint فقط content نسخه را می‌سازد، بر اساس promptDefinition همان فرم
// معمولاً status اولیه نسخه DRAFT است
router.post(
  "/:id/prompt-versions",
  auth,
  roleGuard(["SUPER_ADMIN"]),
  createPromptVersionValidator,
  createAnalysisFormPromptVersion,
);

// بروزرسانی ساختار prompt فرم تحلیل
// یعنی تعریف یا ویرایش segmentهای prompt مثل role, task, tone, constraints
// فقط structure را تغییر می‌دهد، نه محتوای نسخه‌ها را
router.put(
  "/:id/prompt-definition",
  auth,
  roleGuard(["SUPER_ADMIN"]),
  updatePromptDefinitionValidator,
  updateAnalysisFormPromptDefinition,
);

// بروزرسانی یک نسخه مشخص از prompt برای فرم تحلیل
// فقط نسخه‌های DRAFT باید قابل ویرایش باشند
// این endpoint محتوای segmentها و versionKey را آپدیت می‌کند
router.put(
  "/:id/prompt-versions/:versionId",
  auth,
  roleGuard(["SUPER_ADMIN"]),
  updatePromptVersionValidator,
  updateAnalysisFormPromptVersion,
);

// انتشار یک نسخه مشخص از prompt
// این endpoint نسخه موردنظر را PUBLISHED می‌کند
// و در صورت وجود، نسخه published قبلی را ARCHIVED می‌کند
router.put(
  "/:id/prompt-versions/:versionId/publish",
  auth,
  roleGuard(["SUPER_ADMIN"]),
  publishPromptVersionValidator,
  publishAnalysisFormPromptVersion,
);

//حذف فرم تحلیل تکی
router.delete("/:id", auth, roleGuard(["SUPER_ADMIN"]), deleteAnalysisForm);

/////////////

// ایجاد فرم تحلیل چندمرحله‌ای
// شامل اطلاعات پایه، فرم‌های موردنیاز، goals، promptDefinition و promptVersion اولیه
router.post(
  "/multi",
  auth,
  roleGuard(["SUPER_ADMIN"]),
  createMultiAnalysisForm,
);

router.patch(
  "/multi-analysis-forms/:id",
  auth,
  roleGuard(["SUPER_ADMIN"]),
  updateMultiAnalysisFormController,
);

// ایجاد یک نسخه جدید از prompt برای فرم تحلیل چندمرحله‌ای
// این endpoint فقط content نسخه را می‌سازد، بر اساس promptDefinition همان فرم
// معمولاً status اولیه نسخه DRAFT است
router.post(
  "/multi/:id/prompt-versions",
  auth,
  roleGuard(["SUPER_ADMIN"]),
  createMultiAnalysisFormPromptVersion,
);

// بروزرسانی ساختار prompt فرم تحلیل چندمرحله‌ای
// یعنی تعریف یا ویرایش segmentهای prompt مثل role, task, tone, constraints
// فقط structure را تغییر می‌دهد، نه محتوای نسخه‌ها را
router.put(
  "/multi/:id/prompt-definition",
  auth,
  roleGuard(["SUPER_ADMIN"]),
  updateMultiAnalysisFormPromptDefinition,
);

// بروزرسانی یک نسخه مشخص از prompt برای فرم تحلیل چندمرحله‌ای
// فقط نسخه‌های DRAFT باید قابل ویرایش باشند
// این endpoint محتوای segmentها و versionKey را آپدیت می‌کند
router.put(
  "/multi/:id/prompt-versions/:versionId",
  auth,
  roleGuard(["SUPER_ADMIN"]),
  updateMultiAnalysisFormPromptVersion,
);

// انتشار یک نسخه مشخص از prompt فرم تحلیل چندمرحله‌ای
// این endpoint نسخه موردنظر را PUBLISHED می‌کند
// و در صورت وجود، نسخه published قبلی را ARCHIVED می‌کند
router.put(
  "/multi/:id/prompt-versions/:versionId/publish",
  auth,
  roleGuard(["SUPER_ADMIN"]),
  publishMultiAnalysisFormPromptVersion,
);

module.exports = router;
