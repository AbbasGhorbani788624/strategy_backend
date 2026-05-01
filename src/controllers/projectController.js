const { isProjectExists } = require("../repositories/projectRepository");
const {
  createProjectFromStepService,
  getProjectService,
  getAllProjectsService,
  giveRateToProjectService,
  createAnalysisProjectService,
  grantProjectAccessService,
  createFeedbackRequestService,
  getMyFeedbackHistoryService,
} = require("../services/projectService");
const { createBadRequestError } = require("../utils");
const { successResponse } = require("../utils/responses");

exports.createProject = async (req, res, next) => {
  try {
    const { formId } = req.body;
    const currentUser = req.user;
    await createAnalysisProjectService(currentUser, formId);
    return successResponse(res, 201, { message: "پروژه با موفقیت ساخته شد" });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

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

exports.getAllProjectsAccess = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { colleagueIds } = req.body;
    const userId = req.user.id;
    await grantProjectAccessService(projectId, colleagueIds, userId);
    return successResponse(res, 201, {
      message: "دسترسی ها با موفقیت ایجاد شد",
    });
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

    const project = await getProjectService(id, userId, userRole, companyId);

    if (!project) {
      return res.status(401).json({
        success: false,
        message: "شما به این پروژه دسترسی ندارید",
      });
    }
    return successResponse(res, 200, project);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.createFeedbackRequest = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const project = await isProjectExists(id);
    if (!project) {
      createBadRequestError("پروژه یافت نشد", 404);
    }
    await createFeedbackRequestService(id, userId);

    return successResponse(res, 201, {
      message: "درخواست بازخورد با موفقیت ثبت شد.",
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.getMyFeedbackHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const FeedbackHistory = await getMyFeedbackHistoryService(
      userId,
      req.query,
    );
    return successResponse(res, 200, FeedbackHistory);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.giveReteAndComment = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    await giveRateToProjectService(userId, id, req.body);
    return successResponse(res, 201, { message: "نظر با موفقیت ثبت شد" });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

/////////////////////
exports.createProjectFromStep = async (req, res, next) => {
  try {
    await createProjectFromStepService(req.user, req.body);
    return successResponse(res, 201, { meesgae: "پروژه با موفقیت ساخته شد" });
  } catch (err) {
    console.error(err);
    next(err);
  }
};
