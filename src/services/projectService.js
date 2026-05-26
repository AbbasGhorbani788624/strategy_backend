const { createBadRequestError, buildProjectAccessWhere } = require("../utils");
const prisma = require("../prismaClient");
const crypto = require("crypto");

const {
  getAllProjects,
  giveRateAndProject,
  getProject,
  isProjectExists,
} = require("../repositories/projectRepository");
const { handleConversationStepService } = require("./analysisFormService");
const { getFormById } = require("../repositories/analysisFormRepository");

const createAnalysisProjectService = async (currentUser, payload) => {
  const { formId, goalIds } = payload;

  if (!formId) {
    createBadRequestError("شناسه فرم الزامی است");
  }

  if (!Array.isArray(goalIds) || goalIds.length === 0) {
    createBadRequestError("حداقل یک هدف باید انتخاب شود");
  }

  const form = await getFormById(formId);

  if (!form) {
    createBadRequestError("فرم تحلیل یافت نشد");
  }

  const uniqueGoalIds = [...new Set(goalIds)];

  const validGoals = await prisma.formGoal.findMany({
    where: {
      id: { in: uniqueGoalIds },
      formId,
    },
    select: {
      id: true,
    },
  });

  if (validGoals.length !== uniqueGoalIds.length) {
    createBadRequestError("برخی از هدف‌های انتخاب‌ شده معتبر نیستند");
  }

  const questionCount = await prisma.formQuestion.count({
    where: {
      formId,
    },
  });

  const hasForm = questionCount > 0;

  const uniqueNumber = crypto.randomBytes(3).toString("hex");
  const projectTitle = `${form.title}-${uniqueNumber}`;

  const project = await prisma.project.create({
    data: {
      title: projectTitle,
      creatorId: currentUser.id,
      companyId: currentUser.companyId,
      mode: "SINGLE",
      status: hasForm ? "WAITING_FOR_FORM" : "ANALYSIS_PENDING",
      formId,
      formResponses: {},
      goals: {
        create: validGoals.map((goal) => ({
          goal: {
            connect: { id: goal.id },
          },
        })),
      },
    },
    include: {
      goals: {
        include: {
          goal: true,
        },
      },
    },
  });

  let aiResponse = null;
  if (!hasForm) {
    aiResponse = await handleConversationStepService(
      project.id,
      currentUser.id,
      "",
    );
  }

  return {
    formId,
    projectId: project.id,
    aiResponse,
  };
};

const getAllProjectsService = async (userId, userRole, companyId, query) => {
  const projects = await getAllProjects(userId, userRole, companyId, query);
  return projects;
};

const getProjectTabsService = async (
  userId,
  userRole,
  companyId,
  targetUserId,
) => {
  const accessWhere = await buildProjectAccessWhere({
    userId,
    userRole,
    companyId,
    targetUserId,
  });

  const filters = [];

  if (Object.keys(accessWhere).length > 0) {
    filters.push(accessWhere);
  }

  filters.push({
    formId: {
      not: null,
    },
  });

  const whereClause = { AND: filters };

  const projects = await prisma.project.findMany({
    where: whereClause,
    distinct: ["formId"],
    select: { formId: true },
  });

  const formIds = projects.map((p) => p.formId).filter(Boolean);

  const singleForms = await prisma.analysisForm.findMany({
    where: { id: { in: formIds } },
    select: { id: true, title: true },
  });

  const projectCounts = await prisma.project.groupBy({
    by: ["formId"],
    where: whereClause,
    _count: { id: true },
  });

  const countMap = new Map(
    projectCounts.map((item) => [item.formId, item._count.id]),
  );

  const singleTabs = singleForms.map((form) => ({
    formId: form.id,
    title: form.title,
    projectCount: countMap.get(form.id) || 0,
    type: "single",
  }));

  const multiForms = await prisma.multiAnalysisForm.findMany({
    select: { id: true, title: true },
  });

  const multiCounts = await prisma.project.groupBy({
    by: ["multiAnalysisFormId"],
    where: {
      multiAnalysisFormId: { not: null },
      ...accessWhere,
    },
    _count: { id: true },
  });

  const multiCountMap = new Map(
    multiCounts.map((item) => [item.multiAnalysisFormId, item._count.id]),
  );

  const multiTabs = multiForms.map((form) => ({
    formId: form.id,
    title: form.title,
    projectCount: multiCountMap.get(form.id) || 0,
    type: "multi",
  }));

  return [...multiTabs, ...singleTabs];
};

const getSelectableProjectsForMultiAnalysisService = async (
  currentUser,
  multiAnalysisFormId,
  options = {},
) => {
  const { page = 1, limit = 10, search } = options;

  if (!multiAnalysisFormId) {
    createBadRequestError("شناسه تحلیل چندمرحله‌ای الزامی است");
  }

  const normalizedPage = Number(page) > 0 ? Number(page) : 1;
  const normalizedLimit = Number(limit) > 0 ? Number(limit) : 10;
  const skip = (normalizedPage - 1) * normalizedLimit;

  const normalizedSearch =
    typeof search === "string" && search.trim() !== "" ? search.trim() : null;

  const multiForm = await prisma.multiAnalysisForm.findFirst({
    where: {
      id: multiAnalysisFormId,
      isActive: true,
    },
    include: {
      requiredForms: {
        orderBy: {
          order: "asc",
        },
        include: {
          form: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
  });

  if (!multiForm) {
    createBadRequestError("تحلیل چندمرحله‌ای یافت نشد");
  }

  const requiredForms = multiForm.requiredForms || [];
  const requiredFormIds = requiredForms.map((item) => item.formId);

  if (requiredFormIds.length === 0) {
    return {
      multiAnalysisFormId: multiForm.id,
      title: multiForm.title,
      isReady: false,
      missingForms: [],
      pagination: {
        page: normalizedPage,
        limit: normalizedLimit,
        search: normalizedSearch,
      },
      tabs: [],
    };
  }

  const baseProjectWhere = {
    creatorId: currentUser.id,
    companyId: currentUser.companyId,
    mode: "SINGLE",
    status: "FINAL_ANALYSIS",
  };

  const searchWhere = normalizedSearch
    ? {
        title: {
          contains: normalizedSearch,
        },
      }
    : {};

  const tabs = await Promise.all(
    requiredForms.map(async (requiredForm) => {
      const formId = requiredForm.formId;

      const whereWithoutSearch = {
        ...baseProjectWhere,
        formId,
      };

      const whereWithSearch = {
        ...baseProjectWhere,
        formId,
        ...searchWhere,
      };

      const [availableCount, filteredCount, relatedProjects] =
        await Promise.all([
          prisma.project.count({
            where: whereWithoutSearch,
          }),

          prisma.project.count({
            where: whereWithSearch,
          }),

          prisma.project.findMany({
            where: whereWithSearch,
            select: {
              id: true,
              title: true,
              formId: true,
              status: true,
              createdAt: true,
              updatedAt: true,
              initialAnalysis: true,
              riskAnalysis: true,
              finalAnalysis: true,
              averageRating: true,
              ratingCount: true,
            },
            orderBy: {
              createdAt: "desc",
            },
            skip,
            take: normalizedLimit,
          }),
        ]);

      const totalPages =
        filteredCount > 0 ? Math.ceil(filteredCount / normalizedLimit) : 0;

      return {
        formId: requiredForm.form.id,
        formTitle: requiredForm.form.title,
        formDescription: requiredForm.form.description,
        order: requiredForm.order,

        availableCount,
        filteredCount,
        count: relatedProjects.length,

        hasAnyProject: availableCount > 0,
        hasSearchResult: filteredCount > 0,

        pagination: {
          page: normalizedPage,
          limit: normalizedLimit,
          total: filteredCount,
          totalPages,
          hasNextPage: normalizedPage < totalPages,
          hasPrevPage: normalizedPage > 1,
        },

        projects: relatedProjects.map((project) => ({
          id: project.id,
          title: project.title,
          status: project.status,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          hasInitialAnalysis: !!project.initialAnalysis,
          hasRiskAnalysis: !!project.riskAnalysis,
          hasFinalAnalysis: !!project.finalAnalysis,
          averageRating: project.averageRating,
          ratingCount: project.ratingCount,
        })),
      };
    }),
  );

  const missingForms = tabs
    .filter((tab) => !tab.hasAnyProject)
    .map((tab) => ({
      formId: tab.formId,
      formTitle: tab.formTitle,
      order: tab.order,
    }));

  return {
    multiAnalysisFormId: multiForm.id,
    title: multiForm.title,
    description: multiForm.description,

    isReady: missingForms.length === 0,
    missingForms,

    pagination: {
      page: normalizedPage,
      limit: normalizedLimit,
      search: normalizedSearch,
    },

    tabs,
  };
};

const getProjectService = async (projectId, userId, userRole, companyId) => {
  const isProjectExist = await isProjectExists(projectId);
  if (!isProjectExist) {
    createBadRequestError("پروژه وجود ندارد");
  }
  const project = await getProject(projectId, userId, userRole, companyId);
  return project;
};

const giveRateToProjectService = async (userId, projectId, body) => {
  const project = await isProjectExists(projectId);
  if (!project) {
    createBadRequestError("پروژه ای با این ایدی وجود ندارد", 404);
  }

  await giveRateAndProject(userId, projectId, body);
};

const grantProjectAccessService = async (
  projectId,
  colleagueIds,
  currentUserId,
) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      creatorId: true,
      companyId: true,
      accesses: { select: { userId: true } },
    },
  });

  if (!project) {
    createBadRequestError("پروژه یافت نشد", 404);
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { role: true, companyId: true },
  });

  const isCreator = project.creatorId === currentUserId;
  const isCompanyAdmin =
    currentUser?.role === "COMPANY" &&
    currentUser.companyId === project.companyId;

  if (!isCreator && !isCompanyAdmin) {
    createBadRequestError(
      "شما مجوز مدیریت دسترسی‌های این پروژه را ندارید",
      401,
    );
  }

  const existingAccessUserIds = new Set(
    project.accesses.map((acc) => acc.userId),
  );

  const newAccessIds = colleagueIds.filter(
    (id) => !existingAccessUserIds.has(id),
  );

  if (newAccessIds.length === 0) {
    createBadRequestError(
      "همکاران مورد نظر قبلاً دسترسی داشته‌اند یا لیست خالی است.",
      400,
    );
  }

  const validUsers = await prisma.user.findMany({
    where: {
      id: { in: newAccessIds },
      companyId: project.companyId,
    },
    select: { id: true },
  });

  const validIdSet = new Set(validUsers.map((u) => u.id));
  const invalidIds = newAccessIds.filter((id) => !validIdSet.has(id));

  if (invalidIds.length > 0) {
    createBadRequestError(
      "یک یا چند ID نامعتبر هستند یا متعلق به این شرکت نیستند",
      400,
    );
  }

  await prisma.projectAccess.createMany({
    data: validUsers.map((userId) => ({
      projectId: projectId,
      userId: userId.id,
    })),
  });

  const notificationsToCreate = validUsers.map((user) => ({
    userId: user.id,
    type: "PROJECT_ACCESS_GRANTED",
    title: "دسترسی به پروژه جدید",
    message: `شما به پروژه "${project.title}" دسترسی پیدا کردید.`,
    referenceId: projectId,
    referenceType: "PROJECT",
  }));

  if (notificationsToCreate.length > 0) {
    await prisma.notification.createMany({
      data: notificationsToCreate,
    });
  }
};

const createStepAnalysisProjectService = async (
  currentUser,
  multiAnalysisFormId,
  goalIds,
  selectedProjects,
) => {
  const multiForm = await prisma.multiAnalysisForm.findFirst({
    where: {
      id: multiAnalysisFormId,
      isActive: true,
    },
    include: {
      requiredForms: {
        orderBy: {
          order: "asc",
        },
      },
    },
  });

  if (!multiForm) {
    createBadRequestError("تحلیل چندمرحله‌ای یافت نشد");
  }

  const uniqueGoalIds = [...new Set(goalIds)];

  const validGoals = await prisma.multiAnalysisGoal.findMany({
    where: {
      id: { in: uniqueGoalIds },
      multiAnalysisFormId,
    },
    select: {
      id: true,
    },
  });

  if (validGoals.length !== uniqueGoalIds.length) {
    createBadRequestError("برخی از هدف‌های انتخاب‌شده معتبر نیستند");
  }

  const requiredForms = multiForm.requiredForms;
  const requiredFormIds = requiredForms.map((item) => item.formId);

  const uniqueSelectedFormIds = [
    ...new Set(selectedProjects.map((p) => p.formId)),
  ];

  if (uniqueSelectedFormIds.length !== selectedProjects.length) {
    createBadRequestError("برای هر فرم فقط یک پروژه باید انتخاب شود");
  }

  if (requiredFormIds.length !== selectedProjects.length) {
    createBadRequestError("باید برای تمام فرم‌های الزامی یک پروژه انتخاب شود");
  }

  for (const formId of requiredFormIds) {
    const exists = selectedProjects.some((p) => p.formId === formId);
    if (!exists) {
      createBadRequestError(
        "برای برخی فرم‌های الزامی پروژه‌ای انتخاب نشده است",
      );
    }
  }

  const selectedProjectIds = selectedProjects.map((p) => p.projectId);

  const sourceProjects = await prisma.project.findMany({
    where: {
      id: { in: selectedProjectIds },
      creatorId: currentUser.id,
      companyId: currentUser.companyId,
      mode: "SINGLE",
      status: {
        in: ["FINAL_ANALYSIS"],
      },
    },
    select: {
      id: true,
      formId: true,
      title: true,
      status: true,
    },
  });

  if (sourceProjects.length !== selectedProjects.length) {
    createBadRequestError("برخی پروژه‌های انتخاب‌شده معتبر نیستند");
  }

  for (const selected of selectedProjects) {
    const matchedProject = sourceProjects.find(
      (sp) => sp.id === selected.projectId,
    );

    if (!matchedProject) {
      createBadRequestError("یکی از پروژه‌های انتخاب‌شده یافت نشد");
    }

    if (matchedProject.formId !== selected.formId) {
      createBadRequestError("پروژه انتخاب‌شده با فرم مورد انتظار مطابقت ندارد");
    }
  }

  const uniqueNumber = crypto.randomBytes(3).toString("hex");
  const projectTitle = `${multiForm.title}-${uniqueNumber}`;

  const project = await prisma.project.create({
    data: {
      title: projectTitle,
      creatorId: currentUser.id,
      companyId: currentUser.companyId,
      mode: "MULTI",
      status: "ANALYSIS_PENDING",
      formId: null,
      formResponses: {},
      multiAnalysisFormId,

      selectedSourceProjects: {
        create: selectedProjects.map((item) => ({
          formId: item.formId,
          sourceProjectId: item.projectId,
        })),
      },

      multiGoals: {
        create: validGoals.map((goal) => ({
          goal: {
            connect: { id: goal.id },
          },
        })),
      },
    },
    include: {
      selectedSourceProjects: true,
      multiGoals: {
        include: {
          goal: true,
        },
      },
    },
  });

  const aiResponse = await handleConversationStepService(
    project.id,
    currentUser.id,
    "",
  );

  return {
    projectId: project.id,
    multiAnalysisFormId,
    aiResponse,
  };
};

module.exports = {
  getAllProjectsService,
  getProjectService,
  giveRateToProjectService,
  createAnalysisProjectService,
  grantProjectAccessService,
  getProjectTabsService,
  createStepAnalysisProjectService,
  getSelectableProjectsForMultiAnalysisService,
};
