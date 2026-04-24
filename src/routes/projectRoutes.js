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
} = require("../controllers/projectController");

//گرفتن همه پروژه ها
router.get("/", auth, getAllProjects);

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

module.exports = router;
