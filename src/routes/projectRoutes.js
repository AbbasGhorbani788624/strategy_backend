const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { roleGuard } = require("../middleware/roleGuard");

const {
  getAllProjects,
  getMultiProjects,
  getStrategyFlowProjects,
  getProject,
  giveReteAndComment,
  createProject,
  getProjectsTabs,
  getAllProjectsAccess,
  createStepAnalysisProject,
  getSelectableProjectsForMultiAnalysisController,
  getMyProjectsController,
  getCompanyMembers,
  globalSearch,
  deleteProject,
  lockProjectDeletion,
  unlockProjectDeletion,
  getProjectAnalysisStatus,
} = require("../controllers/projectController");
const {
  rateCommentSchema,
} = require("../validations/giveRateAndCommentValidation");
const {
  projectAccessSchema,
} = require("../validations/projectAccessValidation");
const {
  createProjectPlan,
  getProjectPlanByProject,
} = require("../controllers/projectPlanController");
const formCollaborationRoutes = require("./formCollaborationRoutes");






//گرفتن اعضای شرکت برای فیلتر
router.get("/members", auth, getCompanyMembers);

//جستجوی سراسری پروژه‌ها و فرم‌ها
router.get("/search", auth, globalSearch);

//ساخت پروژه تکی
router.post("/", auth, roleGuard(["COMPANY", "MEMBER"]), createProject);

//ساخت  پروژه برای چند مرحله ای
router.post(
  "/multi",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  createStepAnalysisProject,
);

//گرفتن همه پروژه ها
router.get("/", auth, getAllProjects);

// لیست paginated پروژه برای flow استراتژی (OKR = همه پروژه‌ها، BSC = دسته استراتژی‌گذاری)
router.get("/strategy-flow", auth, getStrategyFlowProjects);

/** @deprecated Use GET /strategy-flow?framework=BSC — backward compatibility only. POST /multi unchanged. */
router.get("/multi", auth, getMultiProjects);

//گرفتن پروژه ها  خود شخص
router.get("/myproject", auth, getMyProjectsController);

//گرفتن تب های پروژه
router.get("/tabs", auth, getProjectsTabs);

//گرفتن پروژه ها برای تحلیل چند مرحله ای
router.get(
  "/tab/multi/:id",
  auth,
  getSelectableProjectsForMultiAnalysisController,
);

const companyOnly = roleGuard(["COMPANY", "SUPER_ADMIN"]);

// همکاری فرم (collaboration)
router.use("/:id/form-collaboration", formCollaborationRoutes);

//گرفتن وضعیت تحلیل پروژه
router.get("/:id/analysis-status", auth, getProjectAnalysisStatus);

// Project Planning & Control — برنامه پروژه
router.post("/:projectId/plan", auth, companyOnly, createProjectPlan);

router.get("/:projectId/plan", auth, companyOnly, getProjectPlanByProject);

router.post("/:id/deletion-lock", auth, companyOnly, lockProjectDeletion);
router.delete("/:id/deletion-lock", auth, companyOnly, unlockProjectDeletion);

//گرفتن پروژه
router.get("/:id", auth, getProject);

//دسترسی دادن به پروژه ها
router.put("/:id/access", auth, projectAccessSchema, getAllProjectsAccess);

//دادن امتیاز به پروژه
router.post("/:id", auth, rateCommentSchema, giveReteAndComment);

router.delete("/:id", auth, deleteProject);

module.exports = router;
