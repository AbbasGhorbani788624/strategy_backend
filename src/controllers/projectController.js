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
  getTopRatedProjectsByUser,
  getAccessibleProjectsService,
  getMostCommentedProjectsService,
  deleteProjectService,
  getProjectAnalysisStatusService,
} = require("../services/projectService");
const prisma = require("../prismaClient");
const { createBadRequestError, buildProjectAccessWhere } = require("../utils");
const { successResponse } = require("../utils/responses");

exports.createProject = async (req, res, next) => {
  try {
    const { formId, goalIds, domain, projectTitle } = req.body;
    const currentUser = req.user;

    const project = await createAnalysisProjectService(currentUser, {
      formId,
      goalIds,
      domain,
      projectTitle,
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

    const project = await getProjectService(
      id,
      req.user.id,
      req.user.role,
      req.user.companyId,
    );

    return successResponse(res, 200, project);
  } catch (err) {
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
  const { multiAnalysisFormId, goalIds, selectedProjects, projectTitle } =
    req.body;
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
      projectTitle,
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

exports.getTopRatedProjectsHandler = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit = 10;

    const projects = await getTopRatedProjectsByUser(userId, limit);

    res.status(200).json({
      success: true,
      data: projects,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAccessibleProjectsController = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const projects = await getAccessibleProjectsService(userId);

    res.status(200).json({
      success: true,
      data: projects,
    });
  } catch (error) {
    next(error);
  }
};

exports.getMostCommentedProjectsController = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const projects = await getMostCommentedProjectsService(userId);

    res.status(200).json({
      success: true,
      data: projects,
    });
  } catch (error) {
    next(error);
  }
};

exports.getCompanyMembers = async (req, res, next) => {
  try {
    const userRole = req.user.role;
    const companyId = req.user.companyId;

    if (userRole !== "COMPANY" && userRole !== "SUPER_ADMIN") {
      createBadRequestError("دسترسی غیرمجاز.", 401);
    }

    let whereClause = {};

    if (userRole === "COMPANY") {
      whereClause = { companyId };
    } else if (userRole === "SUPER_ADMIN") {
      // SUPER_ADMIN می‌تواند با companyId در query به اعضای یک شرکت خاص محدود شود؛
      // در غیر این صورت همه کاربران برگردانده می‌شوند.
      const { companyId: queryCompanyId } = req.query;
      if (queryCompanyId) {
        whereClause = { companyId: queryCompanyId };
      }
    }

    const members = await prisma.user.findMany({
      where: whereClause,
      select: { id: true, username: true },
    });

    return successResponse(res, 200, members);
  } catch (err) {
    next(err);
  }
};

exports.globalSearch = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return successResponse(res, 200, { projects: [], forms: [] });
    }

    const userId = req.user.id;
    const userRole = req.user.role;
    const companyId = req.user.companyId;

    const accessWhere = await buildProjectAccessWhere({
      userId,
      userRole,
      companyId,
      targetUserId: null,
    });

    const projectFilters = [{ title: { contains: q } }];

    if (Object.keys(accessWhere).length) {
      projectFilters.unshift(accessWhere);
    }

    const [projects, singleFormsResult, multiFormsResult] = await Promise.all([
      prisma.project.findMany({
        where: { AND: projectFilters },
        select: {
          id: true,
          title: true,
          formId: true,
          multiAnalysisFormId: true,
        },
        take: 5,
      }),
      prisma.analysisForm.findMany({
        where: { title: { contains: q } },
        select: { id: true, title: true },
        take: 5,
      }),
      prisma.multiAnalysisForm.findMany({
        where: { title: { contains: q } },
        select: { id: true, title: true },
        take: 5,
      }),
    ]);

    const forms = [
      ...singleFormsResult.map((f) => ({ ...f, type: "single" })),
      ...multiFormsResult.map((f) => ({ ...f, type: "multi" })),
    ];

    return successResponse(res, 200, { projects, forms });
  } catch (err) {
    next(err);
  }
};

exports.getProjectAnalysisStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await getProjectAnalysisStatusService(id, userId);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;

    const userId = req.user.id;

    await deleteProjectService(id, userId);

    return res.status(200).json({
      success: true,
      message: "پروژه با موفقیت حذف شد",
    });
  } catch (error) {
    next(error);
  }
};
