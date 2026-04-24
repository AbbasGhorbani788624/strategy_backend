const prisma = require("../prismaClient");
const { createBadRequestError } = require("../utils");

const createProjectWithDetails = async (currentUser, body) => {
  const { title, formId, analysis, mode, messages, answers } = body;

  return prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        title: title,
        creatorId: currentUser.id,
        companyId: currentUser.companyId,
        mode: mode || "SINGLE",
        solution: analysis,
      },
    });

    await tx.projectItem.create({
      data: {
        projectId: project.id,
        formId: formId,
        responses: answers || {},
        analysis: analysis,
        order: 1,
        isFinal: true,
      },
    });

    // 3. ایجاد پیام‌های چت
    if (messages && messages.length > 0) {
      const chatMessages = messages.map((msg) => ({
        projectId: project.id,
        userId: msg.role === "user" ? currentUser.id : null,
        role: msg.role,
        content: msg.content,
      }));

      await tx.chatMessage.createMany({
        data: chatMessages,
      });
    }
  });
};

const createProjectFromStepSession = async (data) => {
  const { sessionId, title, messages, creatorId, companyId } = data;

  return prisma.$transaction(async (tx) => {
    const session = await tx.stepSession.findUnique({
      where: { id: sessionId },
      include: {
        flow: {
          include: {
            steps: {
              orderBy: { order: "asc" },
              include: {
                form: { select: { id: true, title: true } },
              },
            },
          },
        },
      },
    });

    const completedSteps = session.data.completedSteps || [];
    const stepAnalyses = session.data.stepAnalyses || {};
    const finalAnalysis = Object.values(stepAnalyses).join("\n\n---\n\n");

    const project = await tx.project.create({
      data: {
        title,
        creatorId,
        companyId,
        mode: "STEP",
        solution: finalAnalysis,
      },
    });

    const projectItems = completedSteps.map((step, index) => ({
      projectId: project.id,
      formId: step.formId,
      responses: step.answers || {},
      analysis: step.analysis,
      order: index + 1,
      isFinal: index === completedSteps.length - 1,
    }));

    await tx.projectItem.createMany({
      data: projectItems,
    });

    const chatMessages = messages.map((msg) => ({
      projectId: project.id,
      userId: msg.role === "user" ? creatorId : null,
      role: msg.role,
      content: msg.content,
    }));

    await tx.chatMessage.createMany({
      data: chatMessages,
    });
  });
};

const getAllProjects = async (userId, userRole, companyId, query) => {
  const { page = 1, limit = 10, search, targetUserId } = query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const whereClause = {
    ...(userRole === "SUPER_ADMIN"
      ? {
          ...(targetUserId ? { creatorId: targetUserId } : {}),
        }
      : userRole === "COMPANY"
        ? {
            ...(targetUserId
              ? {
                  creatorId: targetUserId,
                }
              : {}),
            ...(!targetUserId ? { creatorId: userId } : {}),
          }
        : {
            creatorId: userId,
          }),

    ...(search && {
      title: {
        contains: search,
        mode: "insensitive",
      },
    }),
  };

  if (userRole === "COMPANY" && targetUserId) {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { companyId: true },
    });

    if (!targetUser || targetUser.companyId !== companyId) {
      throw createBadRequestError(
        "دسترسی غیرمجاز: شما فقط می‌توانید پروژه‌های اعضای شرکت خود را مشاهده کنید.",
        401,
      );
    }
  }
  if (userRole === "COMPANY" && !targetUserId) {
    whereClause.creatorId = userId;
  }

  const projects = await prisma.project.findMany({
    where: whereClause,
    skip: skip,
    take: take,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      title: true,
      mode: true,
      createdAt: true,

      rating: true,
      ratingComment: true,
      ratedByAdminId: true,
      ratedAt: true,

      // 2. رابطه creator
      creator: {
        select: {
          id: true,
          fullname: true,
        },
      },

      // 3. رابطه company
      company: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const totalItems = await prisma.project.count({
    where: whereClause,
  });

  return {
    projects,
    pagination: {
      totalItems,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalItems / take),
      limit: take,
    },
  };
};

const getProjectById = async (projectId, userId, userRole, companyId) => {
  // 1. تنظیم شرط دسترسی (Authorization Logic)
  let whereClause = { id: projectId };

  if (userRole === "MEMBER") {
    whereClause.creatorId = userId;
  } else if (userRole === "COMPANY") {
    if (!companyId) {
      return null;
    }
    whereClause.companyId = companyId;
  }
  // SUPER_ADMIN محدودیتی ندارد

  // 2. دریافت اطلاعات پروژه
  // نکته: ratedByAdmin دیگر در include نیست چون در مدل دیتابیس وجود ندارد
  const project = await prisma.project.findUnique({
    where: whereClause,
    include: {
      creator: {
        select: {
          id: true,
          username: true,
          fullname: true,
        },
      },
      company: {
        select: {
          id: true,
          name: true,
          industry: true,
        },
      },
      // فقط تاریخچه ریت‌ها را می‌گیریم
      projectRatingHistories: {
        orderBy: { createdAt: "desc" },
        include: {
          admin: {
            select: {
              id: true,
              username: true,
              fullname: true,
              role: true,
            },
          },
        },
      },
      items: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          formId: true,
          analysis: true,
          solution: true,
          createdAt: true,
          responses: true,
          order: true,
        },
      },
      chatMessages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true,
        },
      },
    },
  });

  if (!project) return null;

  // --- پردازش امتیازها (فقط از تاریخچه) ---
  const ratingHistories = project.projectRatingHistories || [];

  // ساخت لیست ریت‌ها برای هر مدیر
  const ratingsList = ratingHistories.map((history) => ({
    id: history.id,
    role: history.admin.role, // "COMPANY" یا "SUPER_ADMIN"
    score: history.score,
    comment: history.comment,
    ratedBy: {
      name: history.admin.fullname,
      role: history.admin.role,
    },
    ratedAt: history.createdAt,
  }));

  // محاسبه میانگین (اختیاری)
  // let averageScore = null;
  // if (ratingsList.length > 0) {
  //   const totalScore = ratingsList.reduce((sum, r) => sum + r.score, 0);
  //   averageScore = parseFloat((totalScore / ratingsList.length).toFixed(1));
  // }

  // --- پردازش آیتم‌ها ---
  const uniqueFormIds = [...new Set(project.items.map((item) => item.formId))];

  const formsWithQuestions = await prisma.analysisForm.findMany({
    where: {
      id: { in: uniqueFormIds },
    },
    include: {
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          label: true,
          type: true,
        },
      },
    },
  });

  const formMap = new Map();
  formsWithQuestions.forEach((form) => {
    const questionsObj = Object.fromEntries(
      form.questions.map((q) => [q.id, q.label]),
    );
    formMap.set(form.id, {
      title: form.title,
      questions: questionsObj,
    });
  });

  const enrichedItems = project.items.map((item) => {
    const formInfo = formMap.get(item.formId);
    const responses = item.responses || {};

    const answeredQuestions = Object.entries(responses).map(
      ([questionId, answer]) => {
        return {
          questionText: formInfo?.questions[questionId] || "سوال یافت نشد",
          answer: answer,
        };
      },
    );

    return {
      ...item,
      formDetails: {
        title: formInfo?.title,
        questions: answeredQuestions,
      },
    };
  });

  // 3. بازگشت نتیجه نهایی
  // فیلدهایی که دیگر وجود ندارند یا نیاز نیستند حذف شده‌اند
  return {
    id: project.id,
    title: project.title,
    mode: project.mode,
    createdAt: project.createdAt,
    creator: project.creator,
    company: project.company,
    items: enrichedItems,
    chatMessages: project.chatMessages,
    ratings: {
      list: ratingsList, // لیست تمام ریت‌ها
      // average: averageScore // میانگین کل
    },
  };
};

module.exports = {
  createProjectWithDetails,
  getProjectById,
  createProjectFromStepSession,
  getAllProjects,
};
