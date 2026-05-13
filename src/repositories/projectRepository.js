const prisma = require("../prismaClient");
const { createBadRequestError } = require("../utils");

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

  let whereClause = {};

  if (userRole === "SUPER_ADMIN") {
    if (targetUserId) {
      whereClause.creatorId = targetUserId;
    }
  } else if (userRole === "COMPANY") {
    if (targetUserId) {
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

      whereClause.creatorId = targetUserId;
    } else {
      whereClause.companyId = companyId;
    }
  } else if (userRole === "MEMBER") {
    const accessCondition = {
      accesses: {
        some: {
          userId: userId,
        },
      },
    };

    if (targetUserId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { companyId: true },
      });

      if (!targetUser || targetUser.companyId !== companyId) {
        throw createBadRequestError("دسترسی غیرمجاز.", 401);
      }

      whereClause.creatorId = targetUserId;
    } else {
      whereClause = {
        OR: [{ creatorId: userId }, accessCondition],
      };
    }
  }

  if (search) {
    whereClause.title = {
      contains: search,
    };
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
      creator: {
        select: {
          id: true,
          // fullname: true,
          username: true,
        },
      },
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      ratings: {
        orderBy: { createdAt: "desc" },
        include: {
          rater: {
            select: {
              id: true,
              username: true,
              // fullname: true,
              role: true,
            },
          },
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
const isProjectExists = async (projectId) => {
  return await prisma.project.count({ where: { id: projectId } });
};

const getProject = async (projectId, userId, userRole, companyId) => {
  let whereClause = { id: projectId };
  if (userRole === "MEMBER") {
    await prisma.projectAccess.findFirst({
      where: {
        projectId: projectId,
        userId: userId,
      },
    });
    whereClause = {
      id: projectId,
      OR: [
        { creatorId: userId },
        {
          accesses: {
            some: {
              userId: userId,
            },
          },
        },
      ],
    };
  } else if (userRole === "COMPANY") {
    if (!companyId) {
      return null;
    }
    whereClause.companyId = companyId;
  } else if (userRole === "SUPER_ADMIN") {
    whereClause = { id: projectId };
  }

  const project = await prisma.project.findUnique({
    where: whereClause,
    include: {
      creator: {
        select: {
          id: true,
          username: true,
          // fullname: true,
        },
      },
      company: {
        select: {
          id: true,
          name: true,
          industry: true,
        },
      },
      ratings: {
        orderBy: { createdAt: "desc" },
        include: {
          rater: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
        },
      },
      items: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          analysis: true,
          createdAt: true,
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

  const ratingsListRaw = project.ratings || [];
  const ratingsList = ratingsListRaw.map((history) => ({
    id: history.id,
    role: history.rater.role,
    score: history.score,
    comment: history.comment,
    ratedBy: {
      name: history.rater.fullname,
      role: history.rater.role,
    },
    ratedAt: history.createdAt,
  }));

  const uniqueFormIds = [...new Set(project.items.map((item) => item.formId))];

  if (uniqueFormIds.length > 0) {
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

    project.enrichedItems = enrichedItems;
  }

  return {
    id: project.id,
    title: project.title,
    mode: project.mode,
    createdAt: project.createdAt,
    creator: project.creator,
    company: project.company,
    items: project.enrichedItems || project.items,
    chatMessages: project.chatMessages,
    initialAnalysis: project.initialAnalysis,
    riskAnalysis: project.riskAnalysis,
    finalAnalysis: project.finalAnalysis,
    status: project.status,
    ratings: {
      list: ratingsList,
    },
  };
};

const giveRateAndProject = async (userId, projectId, body) => {
  const { comment, score = 1 } = body;
  const validScore = parseInt(score, 10);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      status: true,
      creatorId: true,
      companyId: true,
      creator: {
        select: { companyId: true },
      },
    },
  });

  if (!project) {
    throw createBadRequestError("پروژه مورد نظر یافت نشد.", 404);
  }

  if (project.status !== "FINAL_ANALYSIS") {
    throw createBadRequestError(
      "امکان امتیازدهی به این پروژه وجود ندارد. وضعیت پروژه نهایی نیست.",
      403,
    );
  }
  const result = await prisma.projectRatingHistory.upsert({
    where: {
      projectId_raterId: {
        projectId: projectId,
        raterId: userId,
      },
    },
    create: {
      projectId: projectId,
      raterId: userId,
      score: validScore,
      comment: comment || null,
    },
    update: {
      score: validScore,
      comment: comment !== undefined ? comment : null,
    },
  });

  return result;
};

module.exports = {
  getProject,
  createProjectFromStepSession,
  getAllProjects,
  giveRateAndProject,
  isProjectExists,
};
