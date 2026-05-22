const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { roleGuard } = require("../middleware/roleGuard");

const {
  getAllProjects,
  getProject,
  giveReteAndComment,
  createProject,
  getProjectsTabs,
  getAllProjectsAccess,
  createStepAnalysisProject,
  getSelectableProjectsForMultiAnalysisController,
} = require("../controllers/projectController");
const {
  rateCommentSchema,
} = require("../validations/giveRateAndCommentValidation");
const {
  projectAccessSchema,
} = require("../validations/projectAccessValidation");

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

//گرفتن تب های پروژه تکی
router.get("/tabs", auth, getProjectsTabs);

//گرفتن پروژه ها برای تحلیل چند مرحله ای
router.get(
  "/tab/multi/:id",
  auth,
  getSelectableProjectsForMultiAnalysisController,
);

//گرفتن پروژه
router.get("/:id", auth, getProject);

//دسترسی دادن به پروژه ها
router.get("/:id/access", auth, projectAccessSchema, getAllProjectsAccess);

//دادن امتیاز به پروژه
router.post("/:id", auth, rateCommentSchema, giveReteAndComment);

module.exports = router;
