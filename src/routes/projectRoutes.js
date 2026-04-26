const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

const {
  createProjectValidation,
} = require("../validations/addProjectFormValidation");
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
} = require("../controllers/projectController");
const {
  rateCommentSchema,
} = require("../validations/giveRateAndCommentValidation");

//گرفتن همه پروژه ها
router.get("/", auth, getAllProjects);

//گرفتن پروژه
router.get("/:id", auth, getProject);

//ذخیره پروژه از فرم تکی
router.post(
  "/",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  createProjectValidation,
  saveProject,
);

//ذخیره پروژه از فرم مرحله ای
router.post(
  "/flow/create-project",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  createProjectFromStepValidation,
  createProjectFromStep,
);

//دادن امتیاز به پروژه
router.post(
  "/:id",
  auth,
  roleGuard(["COMPANY", "SUPER_ADMIN"]),
  rateCommentSchema,
  giveReteAndComment,
);

module.exports = router;
