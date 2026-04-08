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
const { createProjectFromStep } = require("../controllers/projectController");

router.post(
  "/",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  createProjectValidation,
  saveProject,
);

router.post(
  "/flow/create-project",
  auth,
  roleGuard(["COMPANY", "MEMBER"]),
  createProjectFromStepValidation,
  createProjectFromStep,
);

module.exports = router;
