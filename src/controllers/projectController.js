const {
  saveProjectService,
  createProjectFromStepService,
  getProjectService,
  getAllProjectsService,
} = require("../services/projectService");
const { successResponse } = require("../utils/responses");

exports.getAllProjects = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const companyId = req.user.companyId;

    const projects = await getAllProjectsService(
      userId,
      userRole,
      companyId,
      req.query,
    );

    return successResponse(res, 200, projects);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.getProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const companyId = req.user.companyId;

    const project = await getProjectService(id, userId, userRole);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "پروژه وجود ندارد یا دسترسی ندارید",
      });
    }
    return successResponse(res, 200, project);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.saveProject = async (req, res, next) => {
  try {
    await saveProjectService(req.user, req.body);
    return successResponse(res, 201, { meesgae: "پروژه با موفقیت ساخته شد" });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.createProjectFromStep = async (req, res, next) => {
  try {
    await createProjectFromStepService(req.user, req.body);
    return successResponse(res, 201, { meesgae: "پروژه با موفقیت ساخته شد" });
  } catch (err) {
    console.error(err);
    next(err);
  }
};
