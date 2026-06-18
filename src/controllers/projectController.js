const {
  getProjectService,
  getAllProjectsService,
  giveRateToProjectService,
  createAnalysisProjectService,
  grantProjectAccessService,
  getProjectTabsService,
  createStepAnalysisProjectService,
  getSelectableProjectsForMultiAnalysisService,
  getMyProjects,
} = require("../services/projectService");
const { createBadRequestError } = require("../utils");
const { successResponse } = require("../utils/responses");

exports.createProject = async (req, res, next) => {
  try {
    const { formId, goalIds, domain } = req.body;
    const currentUser = req.user;

    const project = await createAnalysisProjectService(currentUser, {
      formId,
      goalIds,
      domain,
    });

    return successResponse(res, 201, {
      message: "پروژه با موفقیت ساخته شد",
      project,
    });
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

exports.getMyProjectsController = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    const result = await getMyProjects(userId, req.query);

    return res.status(200).json({
      success: true,
      data: {
        projects: result.projects,
        pagination: result.pagination,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getProjectsTabs = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const companyId = req.user.companyId;
    const targetUserId = req.user.id;
    const tabs = await getProjectTabsService(
      userId,
      userRole,
      companyId,
      targetUserId,
    );
    return successResponse(res, 200, tabs);
  } catch (error) {
    next(error);
  }
};

exports.getAllProjectsAccess = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { colleagueIds } = req.body;

    const result = await grantProjectAccessService(id, colleagueIds, userId);

    res.status(200).json(result);
  } catch (error) {
    next(error);
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

exports.createStepAnalysisProject = async (req, res, next) => {
  const { multiAnalysisFormId, goalIds, selectedProjects } = req.body;
  try {
    if (!multiAnalysisFormId) {
      createBadRequestError("شناسه تحلیل چندمرحله‌ای الزامی است");
    }

    if (!Array.isArray(goalIds) || goalIds.length === 0) {
      createBadRequestError("حداقل یک هدف باید انتخاب شود");
    }

    if (!Array.isArray(selectedProjects) || selectedProjects.length === 0) {
      createBadRequestError("انتخاب پروژه‌های ورودی الزامی است");
    }

    const result = await createStepAnalysisProjectService(
      req.user,
      multiAnalysisFormId,
      goalIds,
      selectedProjects,
    );
    return successResponse(res, 201, result);
  } catch (error) {
    next(error);
  }
};

exports.getSelectableProjectsForMultiAnalysisController = async (
  req,
  res,
  next,
) => {
  try {
    const { id } = req.params;

    const { page, limit, search } = req.query;
    const result = await getSelectableProjectsForMultiAnalysisService(
      req.user,
      id,
      {
        page,
        limit,
        search,
      },
    );

    return successResponse(res, 200, result);
  } catch (error) {
    next(error);
  }
};
