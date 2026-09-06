const { createBadRequestError, buildProjectAccessWhere } = require("../utils");
const { buildAnalysisStatusPayload } = require("../utils/analysisFailure");
const {
  getRequiredItemKey,
  getSelectionKey,
  getRequiredItemTitle,
  buildCompletedProjectWhereForRequiredItem,
  isMultiRequiredItem,
  matchesSelectedProject,
} = require("../utils/multiAnalysisRequiredFormUtils");
const prisma = require("../prismaClient");
const crypto = require("crypto");

const {
  getAllProjects,
  giveRateAndProject,
  getProject,
  isProjectExists,
} = require("../repositories/projectRepository");
const { startAnalysisProcessing } = require("./analysisProcessor.service");
const { getFormById } = require("../repositories/analysisFormRepository");

const createAnalysisProjectService = async (currentUser, payload) => {
  const { formId, goalIds, domain, projectTitle } = payload;

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
      category: {
        analysisFormId: formId,
      },
    },
  });

  const hasForm = questionCount > 0;

  const uniqueNumber = crypto.randomBytes(3).toString("hex");
  const projectTitleFinal = projectTitle
    ? projectTitle
    : `${form.title}-${uniqueNumber}`;

  const project = await prisma.project.create({
    data: {
      title: projectTitleFinal,
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
      domain: domain ? domain : "",
    },
    include: {
      goals: {
        include: {
          goal: true,
        },
      },
    },
  });

  let queueResult = null;
  if (!hasForm) {
    queueResult = await startAnalysisProcessing({
      projectId: project.id,
      userId: currentUser.id,
      userInput: "",
      understood: false,
      source: "projectService.createAnalysisProjectService",
    });
  }

  return {
    formId,
    projectId: project.id,
    jobId: queueResult?.jobId ?? null,
    status: queueResult ? queueResult.status : project.status,
  };
};

const getAllProjectsService = async (userId, userRole, companyId, query) => {
  const allowedStatuses = [
    "WAITING_FOR_FORM",
    "ANALYSIS_PENDING",
    "AI_PROCESSING",
    "REVIEWING",
    "CHAT_MODE",
    "FINAL_ANALYSIS",
    "FAILED",
  ];

  const { status, ...restQuery } = query;
  const processedQuery = { ...restQuery };

  if (status && status !== "all" && allowedStatuses.includes(status)) {
    processedQuery.status = status;
  }

  const projects = await getAllProjects(
    userId,
    userRole,
    companyId,
    processedQuery,
  );
  return projects;
};

const getMultiProjectsService = async (userId, userRole, companyId, query) => {
  return getAllProjectsService(userId, userRole, companyId, {
    ...query,
    mode: "MULTI",
  });
};

const getMyProjects = async (userId, query = {}) => {
  const { page = 1, limit = 10, search } = query;

  const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
  const parsedLimit = Math.max(parseInt(limit, 10) || 10, 1);

  const skip = (parsedPage - 1) * parsedLimit;

  const whereClause = {
    creatorId: userId,
    ...(search
      ? {
          OR: [
            {
              title: {
                contains: search,
              },
            },
          ],
        }
      : {}),
  };

  const [projects, totalItems] = await Promise.all([
    prisma.project.findMany({
      where: whereClause,
      skip,
      take: parsedLimit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
      },
    }),

    prisma.project.count({
      where: whereClause,
    }),
  ]);

  return {
    projects,
    pagination: {
      totalItems,
      currentPage: parsedPage,
      totalPages: Math.ceil(totalItems / parsedLimit),
      limit: parsedLimit,
    },
  };
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

  const allTabs = [...multiTabs, ...singleTabs];
  return allTabs.sort((a, b) => b.projectCount - a.projectCount);
};

const buildSelectableProjectCard = (project) => ({
  id: project.id,
  title: project.title,
  status: project.status,
  mode: project.mode,
  formId: project.formId,
  multiAnalysisFormId: project.multiAnalysisFormId,
  createdAt: project.createdAt,
  updatedAt: project.updatedAt,
  creator: project.creator,
  hasInitialAnalysis: !!project.initialAnalysis,
  hasRiskAnalysis: !!project.riskAnalysis,
  hasFinalAnalysis: !!project.finalAnalysis,
  averageRating: project.averageRating,
  ratingCount: project.ratingCount,
  isBookmarked: (project.bookmarks?.length ?? 0) > 0,
});

const resolveActiveRequiredForm = (
  requiredForms,
  { activeFormId, activeMultiAnalysisFormId },
) => {
  if (activeFormId && activeMultiAnalysisFormId) {
    createBadRequestError(
      "فقط یکی از formId یا multiAnalysisFormId باید برای tab فعال ارسال شود",
    );
  }

  if (activeFormId) {
    const matched = requiredForms.find(
      (item) => item.type === "SINGLE" && item.formId === activeFormId,
    );

    if (!matched) {
      createBadRequestError("tab پیش‌نیاز تکی یافت نشد");
    }

    return matched;
  }

  if (activeMultiAnalysisFormId) {
    const matched = requiredForms.find(
      (item) =>
        item.type === "MULTI" &&
        item.requiredMultiAnalysisFormId === activeMultiAnalysisFormId,
    );

    if (!matched) {
      createBadRequestError("tab پیش‌نیاز چندگانه یافت نشد");
    }

    return matched;
  }

  return requiredForms[0];
};

const getSelectableProjectsForMultiAnalysisService = async (
  currentUser,
  multiAnalysisFormId,
  options = {},
) => {
  const {
    page = 1,
    limit = 10,
    search,
    formId: activeFormId = null,
    multiAnalysisFormId: activeMultiAnalysisFormId = null,
  } = options;

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
              info: true,
            },
          },
          requiredMultiAnalysisForm: {
            select: {
              id: true,
              title: true,
              description: true,
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

  if (requiredForms.length === 0) {
    return {
      multiAnalysisFormId: multiForm.id,
      title: multiForm.title,
      isReady: false,
      missingForms: [],
      activeTab: null,
      pagination: {
        page: normalizedPage,
        limit: normalizedLimit,
        search: normalizedSearch,
      },
      tabs: [],
    };
  }

  const activeRequiredForm = resolveActiveRequiredForm(requiredForms, {
    activeFormId,
    activeMultiAnalysisFormId,
  });
  const activeTabKey = getRequiredItemKey(activeRequiredForm);

  const baseProjectWhere = {
    creatorId: currentUser.id,
    companyId: currentUser.companyId,
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
      const whereWithoutSearch = buildCompletedProjectWhereForRequiredItem(
        requiredForm,
        baseProjectWhere,
      );

      const formTitle = getRequiredItemTitle(requiredForm);
      const tabKey = getRequiredItemKey(requiredForm);
      const isActive = tabKey === activeTabKey;

      const tabBase = {
        type: requiredForm.type,
        formId: requiredForm.formId,
        multiAnalysisFormId: requiredForm.requiredMultiAnalysisFormId,
        formTitle,
        formDescription: isMultiRequiredItem(requiredForm)
          ? requiredForm.requiredMultiAnalysisForm?.description
          : requiredForm.form?.info,
        order: requiredForm.order,
        isActive,
      };

      if (!isActive) {
        const availableCount = await prisma.project.count({
          where: whereWithoutSearch,
        });

        return {
          ...tabBase,
          availableCount,
          filteredCount: availableCount,
          count: 0,
          hasAnyProject: availableCount > 0,
          hasSearchResult: availableCount > 0,
          pagination: null,
          projects: [],
        };
      }

      const whereWithSearch = {
        ...whereWithoutSearch,
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
              multiAnalysisFormId: true,
              mode: true,
              status: true,
              createdAt: true,
              updatedAt: true,
              initialAnalysis: true,
              riskAnalysis: true,
              finalAnalysis: true,
              averageRating: true,
              ratingCount: true,
              creator: {
                select: {
                  id: true,
                  username: true,
                },
              },
              bookmarks: {
                where: {
                  userId: currentUser.id,
                },
                select: {
                  id: true,
                },
              },
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
        ...tabBase,
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
        projects: relatedProjects.map(buildSelectableProjectCard),
      };
    }),
  );

  const missingForms = tabs
    .filter((tab) => !tab.hasAnyProject)
    .map((tab) => ({
      type: tab.type,
      formId: tab.formId,
      multiAnalysisFormId: tab.multiAnalysisFormId,
      formTitle: tab.formTitle,
      order: tab.order,
    }));

  return {
    multiAnalysisFormId: multiForm.id,
    title: multiForm.title,
    description: multiForm.description,

    isReady: tabs.some((tab) => tab.hasAnyProject),
    isFullyReady: missingForms.length === 0,
    missingForms,

    activeTab: {
      type: activeRequiredForm.type,
      formId: activeRequiredForm.formId,
      multiAnalysisFormId: activeRequiredForm.requiredMultiAnalysisFormId,
    },

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
    createBadRequestError("پروژه وجود ندارد", 404);
  }

  const project = await getProject(projectId, userId, userRole, companyId);

  if (!project) {
    createBadRequestError("شما به این پروژه دسترسی ندارید", 403);
  }

  const creatorId = project.creator.id;

  project.isOwner = Boolean(
    creatorId && creatorId.toString() === userId.toString(),
  );

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
  if (!projectId) {
    createBadRequestError("شناسه پروژه الزامی است.", 400);
  }

  if (!Array.isArray(colleagueIds)) {
    createBadRequestError("لیست همکاران نامعتبر است.", 400);
  }

  const normalizedColleagueIds = [...new Set(colleagueIds.filter(Boolean))];

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      id: true,
      title: true,
      creatorId: true,
      companyId: true,
      accesses: {
        select: {
          userId: true,
        },
      },
      creator: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  if (!project) {
    createBadRequestError("پروژه یافت نشد.", 404);
  }

  if (project.creatorId !== currentUserId) {
    createBadRequestError(
      "فقط مالک پروژه می‌تواند دسترسی‌ها را مدیریت کند.",
      403,
    );
  }

  if (!project.companyId) {
    createBadRequestError("این پروژه به هیچ شرکتی متصل نیست.", 400);
  }

  const validColleagues = await prisma.user.findMany({
    where: {
      id: {
        in: normalizedColleagueIds,
      },
      companyId: project.companyId,
    },
    select: {
      id: true,
    },
  });

  const validColleagueIds = validColleagues.map((user) => user.id);

  if (validColleagueIds.length !== normalizedColleagueIds.length) {
    createBadRequestError(
      "بعضی از کاربران انتخاب‌شده عضو شرکت این پروژه نیستند.",
      400,
    );
  }

  if (validColleagueIds.includes(project.creatorId)) {
    createBadRequestError("مالک پروژه نیازی به ثبت در لیست دسترسی ندارد.", 400);
  }

  const currentAccessIds = project.accesses.map((access) => access.userId);

  const idsToAdd = validColleagueIds.filter(
    (id) => !currentAccessIds.includes(id),
  );

  const idsToRemove = currentAccessIds.filter(
    (id) => !validColleagueIds.includes(id),
  );

  const grantedByName = project.creator?.username || "مدیر پروژه";

  await prisma.$transaction([
    ...(idsToAdd.length
      ? [
          prisma.projectAccess.createMany({
            data: idsToAdd.map((colleagueId) => ({
              projectId,
              userId: colleagueId,
            })),
            skipDuplicates: true,
          }),
        ]
      : []),
    ...(idsToRemove.length
      ? [
          prisma.projectAccess.deleteMany({
            where: {
              projectId,
              userId: {
                in: idsToRemove,
              },
            },
          }),
        ]
      : []),
    ...(idsToAdd.length
      ? [
          prisma.notification.createMany({
            data: idsToAdd.map((colleagueId) => ({
              userId: colleagueId,
              type: "PROJECT_ACCESS_GRANTED",
              title: "دسترسی به پروژه جدید",
              message: `${grantedByName} به شما در پروژه «${project.title}» دسترسی داد.`,
              referenceId: projectId,
              referenceType: "PROJECT",
              isRead: false,
            })),
          }),
        ]
      : []),
  ]);

  return {
    message: "دسترسی‌های پروژه با موفقیت بروزرسانی شد.",
    accessUserIds: validColleagueIds,
  };
};

const createStepAnalysisProjectService = async (
  currentUser,
  multiAnalysisFormId,
  goalIds,
  selectedProjects,
  projectTitle,
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

  const questionCount = await prisma.formQuestion.count({
    where: {
      category: {
        multiAnalysisFormId,
      },
    },
  });

  const hasForm = questionCount > 0;

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
  const requiredKeys = requiredForms.map(getRequiredItemKey);

  const selectedKeys = selectedProjects.map(getSelectionKey);

  if (selectedKeys.some((key) => !key)) {
    createBadRequestError(
      "هر پروژه انتخاب‌شده باید formId یا multiAnalysisFormId داشته باشد",
    );
  }

  const uniqueSelectedKeys = [...new Set(selectedKeys)];

  if (uniqueSelectedKeys.length !== selectedProjects.length) {
    createBadRequestError("برای هر فرم فقط یک پروژه باید انتخاب شود");
  }

  if (selectedProjects.length === 0) {
    createBadRequestError(
      "حداقل برای یکی از تحلیل‌های الزامی پروژه انتخاب کنید",
    );
  }

  for (const selectedKey of selectedKeys) {
    if (!requiredKeys.includes(selectedKey)) {
      createBadRequestError(
        "پروژه انتخاب‌شده مربوط به یکی از تحلیل‌های الزامی این فرم نیست",
      );
    }
  }

  const selectedProjectIds = selectedProjects.map((p) => p.projectId);

  const sourceProjects = await prisma.project.findMany({
    where: {
      id: { in: selectedProjectIds },
      creatorId: currentUser.id,
      companyId: currentUser.companyId,
      status: {
        in: ["FINAL_ANALYSIS"],
      },
    },
    select: {
      id: true,
      formId: true,
      multiAnalysisFormId: true,
      mode: true,
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

    if (!matchesSelectedProject(selected, matchedProject)) {
      createBadRequestError("پروژه انتخاب‌شده با فرم مورد انتظار مطابقت ندارد");
    }
  }

  const uniqueNumber = crypto.randomBytes(3).toString("hex");
  const projectTitleFinal = projectTitle
    ? projectTitle
    : `${multiForm.title}-${uniqueNumber}`;

  const project = await prisma.project.create({
    data: {
      title: projectTitleFinal,
      creatorId: currentUser.id,
      companyId: currentUser.companyId,
      mode: "MULTI",
      status: hasForm ? "WAITING_FOR_FORM" : "ANALYSIS_PENDING",
      formId: null,
      formResponses: {},
      multiAnalysisFormId,

      selectedSourceProjects: {
        create: selectedProjects.map((item) => ({
          formId: item.formId ?? null,
          multiAnalysisFormId: item.multiAnalysisFormId ?? null,
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

  let queueResult = null;

  if (!hasForm) {
    queueResult = await startAnalysisProcessing({
      projectId: project.id,
      userId: currentUser.id,
      userInput: "",
      understood: false,
      source: "projectService.createStepAnalysisProjectService",
    });
  }
  return {
    projectId: project.id,
    multiAnalysisFormId,
    jobId: queueResult?.jobId ?? null,
    status: queueResult ? queueResult.status : project.status,
  };
};

const getTopRatedProjectsByUser = async (userId, limit = 10) => {
  const topProjects = await prisma.project.findMany({
    where: {
      creatorId: userId,
      hasRating: true,
      ratingCount: { gt: 0 },
    },
    orderBy: [{ averageRating: "desc" }, { ratingCount: "desc" }],
    take: limit,
    select: {
      id: true,
      title: true,
      averageRating: true,
      createdAt: true,
    },
  });

  return topProjects;
};

const getAccessibleProjectsService = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      companyId: true,
    },
  });

  if (!user) {
    createBadRequestError("کاربر یافت نشد", 404);
  }

  if (user.role === "COMPANY" && user.companyId) {
    return prisma.project.findMany({
      where: {
        creator: {
          is: {
            companyId: user.companyId,
            role: {
              not: "COMPANY",
            },
          },
        },
      },
      take: 10,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        createdAt: true,
        title: true,
        creator: {
          select: {
            username: true,
          },
        },
      },
    });
  }

  const accesses = await prisma.projectAccess.findMany({
    where: {
      userId,
    },
    take: 10,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      project: {
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          averageRating: true,
          creator: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      },
    },
  });

  return accesses.map((item) => item.project);
};

const getMostCommentedProjectsService = async (userId) => {
  const projects = await prisma.project.findMany({
    where: {
      creatorId: userId,
    },
    take: 10,
    orderBy: {
      comments: {
        _count: "desc",
      },
    },
    select: {
      id: true,
      title: true,
      averageRating: true,
      createdAt: true,
      _count: {
        select: {
          comments: true,
        },
      },
    },
  });

  return projects;
};

const deleteProjectService = async (projectId, userId) => {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      id: true,
      creatorId: true,
    },
  });

  if (!project) {
    createBadRequestError("پروژه یافت نشد .", 404);
  }

  if (project.creatorId !== userId) {
    createBadRequestError("شما مجوز حذف این پروژه را ندارید", 403);
  }

  await prisma.project.delete({
    where: {
      id: projectId,
    },
  });

  return true;
};

const getProjectAnalysisStatusService = async (projectId, userId) => {
  const project = await prisma.project.findFirst({
    where: { id: projectId, creatorId: userId },
    select: {
      status: true,
      initialAnalysis: true,
      finalAnalysis: true,
      summaryAnalysis: true,
      riskPercentage: true,
    },
  });

  if (!project) {
    createBadRequestError("پروژه یافت نشد", 404);
  }

  return buildAnalysisStatusPayload(project);
};

module.exports = {
  getAllProjectsService,
  getMultiProjectsService,
  getProjectService,
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
};
