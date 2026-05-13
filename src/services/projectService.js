const { createBadRequestError } = require("../utils");
const prisma = require("../prismaClient");

const {
  createProjectFromStepSession,
  getAllProjects,
  giveRateAndProject,
  getProject,
  isProjectExists,
} = require("../repositories/projectRepository");
const { isFromExists } = require("../repositories/analysisFormRepository");
const { handleConversationStepService } = require("./analysisFormService");

const createAnalysisProjectService = async (currentUser, payload) => {
  const { formId, goalIds } = payload;

  if (!formId) {
    createBadRequestError("شناسه فرم الزامی است");
  }

  if (!Array.isArray(goalIds) || goalIds.length === 0) {
    createBadRequestError("حداقل یک هدف باید انتخاب شود");
  }

  const form = await isFromExists(formId);

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

  const project = await prisma.project.create({
    data: {
      title: "پروژه جدید",
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
      items: true,
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
    requiresForm: hasForm,
    formId,
    projectId: project.id,
    aiResponse,
  };
};

const getAllProjectsService = async (userId, userRole, companyId, query) => {
  const projects = await getAllProjects(userId, userRole, companyId, query);
  return projects;
};

const getProjectService = async (projectId, userId, userRole, companyId) => {
  const isProjectExist = await isProjectExists(projectId);
  if (!isProjectExist) {
    createBadRequestError("پروژه وجود ندارد");
  }
  const project = await getProject(projectId, userId, userRole, companyId);
  return project;
};

const createProjectFromStepService = async (currentUser, body) => {
  const { sessionId, title, messages } = body;

  // بررسی وجود جلسه
  const session = await prisma.stepSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    createBadRequestError("جلسه یافت نشد", 404);
  }

  if (session.userId !== currentUser.id) {
    createBadRequestError("دسترسی غیرمجاز", 403);
  }

  if (session.status !== "COMPLETED") {
    createBadRequestError("تحلیل نهایی هنوز تکمیل نشده", 400);
  }

  // ساخت پروژه
  await createProjectFromStepSession({
    sessionId,
    title,
    messages,
    creatorId: currentUser.id,
    companyId: currentUser.companyId,
  });
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
      accesses: { select: { userId: true } }, // برای بررسی دسترسی‌های قبلی
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

const createFeedbackRequestService = async (projectId, userId) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { status: true, companyId: true, creatorId: true },
  });

  if (project.status !== "FINAL_ANALYSIS") {
    createBadRequestError(
      "فقط پروژه‌های تکمیل شده می‌توانند درخواست بازخورد دهند.",
      400,
    );
  }

  if (project.creatorId !== userId) {
    createBadRequestError(
      "شما فقط می‌توانید برای پروژه‌های خودتان درخواست بازخورد دهید.",
      403,
    );
  }
  const existingRequest = await prisma.projectFeedbackRequest.findUnique({
    where: { projectId: projectId },
  });

  if (existingRequest) {
    if (existingRequest.status === "PENDING") {
      createBadRequestError(
        "شما قبلاً برای این پروژه درخواست بازخورد داده‌اید و در انتظار پاسخ هستید.",
        400,
      );
    }
    createBadRequestError("برای این پروژه قبلاً بازخورد ثبت شده است.", 400);
  }

  await prisma.projectFeedbackRequest.create({
    data: {
      projectId: projectId,
      userId: userId,
      status: "PENDING",
    },
    include: {
      project: {
        select: {
          id: true,
          title: true,
        },
      },
      user: {
        select: {
          id: true,
          username: true,
          // fullname: true,
        },
      },
    },
  });
};

const getMyFeedbackHistoryService = async (userId, query) => {
  const { page = 1, limit = 10, search } = query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const whereClause = {
    userId: userId,
  };

  if (search) {
    whereClause.OR = [
      {
        project: {
          title: {
            contains: search,
          },
        },
      },
    ];
  }

  const feedbackHistory = await prisma.projectFeedbackRequest.findMany({
    where: whereClause,
    skip: skip,
    take: take,
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      project: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
      user: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  const totalItems = await prisma.projectFeedbackRequest.count({
    where: whereClause,
  });

  return {
    feedbackHistory,
    pagination: {
      totalItems,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalItems / take),
      limit: take,
    },
  };
};

module.exports = {
  createProjectFromStepService,
  getAllProjectsService,
  getProjectService,
  giveRateToProjectService,
  createAnalysisProjectService,
  grantProjectAccessService,
  createFeedbackRequestService,
  getMyFeedbackHistoryService,
};
