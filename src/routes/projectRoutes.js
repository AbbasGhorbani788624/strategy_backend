const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  saveProject,
  getAllProjectsAccess,
} = require("../controllers/projectController");
const { roleGuard } = require("../middleware/roleGuard");
const {
  createProjectFromStepValidation,
} = require("../validations/projectFromStepSchema");
const {
  createProjectFromStep,
  getAllProjects,
  getProject,
  giveReteAndComment,
  createProject,
  createFeedbackRequest,
  getMyFeedbackHistory,
} = require("../controllers/projectController");
const {
  rateCommentSchema,
} = require("../validations/giveRateAndCommentValidation");
const {
  projectAccessSchema,
} = require("../validations/projectAccessValidation");

//ساخت پروژه
router.post("/", auth, roleGuard(["COMPANY", "MEMBER"]), createProject);

//گرفتن همه پروژه ها
router.get("/", auth, getAllProjects);

//دسترسی دادن به پروژه ها
router.get("/:id/access", auth, projectAccessSchema, getAllProjectsAccess);

//گرفتن پروژه
router.get("/:id", auth, getProject);

//دادن امتیاز به پروژه
router.post("/:id", auth, rateCommentSchema, giveReteAndComment);

//درخواست  feedback از سوی کاربر
router.post("/:id/feedback-request", auth, createFeedbackRequest);

//گرفتن بازخوردها
router.get("/my/feedback-history", auth, getMyFeedbackHistory);

//////////////////////////////////////////

//ذخیره پروژه از فرم مرحله ای
router.post(
  "/flow/create-project",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  createProjectFromStepValidation,
  createProjectFromStep,
);

module.exports = router;
