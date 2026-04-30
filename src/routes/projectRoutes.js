const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { saveProject } = require("../controllers/projectController");
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
} = require("../controllers/projectController");
const {
  rateCommentSchema,
} = require("../validations/giveRateAndCommentValidation");

//ساخت پروژه
router.post("/", auth, roleGuard(["COMPANY", "MEMBER"]), createProject);

//گرفتن همه پروژه ها
router.get("/", auth, getAllProjects);

//گرفتن پروژه
router.get("/:id", auth, getProject);

//دادن امتیاز به پروژه
router.post("/:id", auth, rateCommentSchema, giveReteAndComment);

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
