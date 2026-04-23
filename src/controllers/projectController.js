const {
  saveProjectService,
  createProjectFromStepService,
} = require("../services/projectService");
const { successResponse } = require("../utils/responses");

exports.saveProject = async (req, res, next) => {
  try {
    const project = await saveProjectService(req.user, req.body);
    return successResponse(res, 201, project);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.createProjectFromStep = async (req, res, next) => {
  try {
    const project = await createProjectFromStepService(req.user, req.body);
    return successResponse(res, 201, project);
  } catch (err) {
    console.error(err);
    next(err);
  }
};
