const prisma = require("../prismaClient");
const { createBadRequestError, buildProjectAccessWhere } = require("../utils");

const getAllProjects = async (userId, userRole, companyId, query) => {
  const {
    page = 1,
    limit = 10,
    search,
    targetUserId,
    formId,
    sortBy = "createdAt",
    sortOrder = "desc",
    scoreFilter,
  } = query;

  const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
  const parsedLimit = Math.max(parseInt(limit, 10) || 10, 1);

  const skip = (parsedPage - 1) * parsedLimit;
  const take = parsedLimit;

  let whereClause = {};

  if (userRole === "COMPANY") {
    if (!companyId) {
      createBadRequestError("CompanyId is required for COMPANY role");
    }

    whereClause = {
      companyId,
    };
  } else {
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

    if (scoreFilter === "high") {
      filters.push({ averageRating: { gte: 4 } });
    } else if (scoreFilter === "medium") {
      filters.push({ averageRating: { gte: 2, lt: 4 } });
    } else if (scoreFilter === "low") {
      filters.push({ averageRating: { lt: 2 } });
    }

    if (search) {
      filters.push({
        title: { contains: search },
      });
    }

    if (formId) {
      filters.push({
        OR: [{ formId }, { multiAnalysisFormId: formId }],
      });
    }

    whereClause = filters.length > 0 ? { AND: filters } : {};
  }

  const allowedSortFields = ["createdAt", "averageRating"];
  const allowedSortOrders = ["asc", "desc"];

  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
  const safeSortOrder = allowedSortOrders.includes(sortOrder)
    ? sortOrder
    : "desc";

  let orderBy = [{ createdAt: "desc" }, { id: "desc" }];

  if (safeSortBy === "createdAt") {
    orderBy = [{ createdAt: safeSortOrder }, { id: "desc" }];
  }

  if (safeSortBy === "averageRating") {
    orderBy = [
      { hasRating: "desc" },
      { averageRating: safeSortOrder },
      { createdAt: "desc" },
      { id: "desc" },
    ];
  }

  const projects = await prisma.project.findMany({
    where: whereClause,
    skip,
    take,
    orderBy,
    select: {
      id: true,
      title: true,
      mode: true,
      status: true,
      formId: true,
      multiAnalysisFormId: true,
      createdAt: true,

      averageRating: true,
      ratingCount: true,
      hasRating: true,

      creator: {
        select: { id: true, username: true },
      },
      company: {
        select: { id: true, name: true },
      },
      ratings: {
        orderBy: { createdAt: "desc" },
        include: {
          rater: {
            select: { id: true, username: true, role: true },
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
      currentPage: parsedPage,
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
    if (!companyId) return null;
    whereClause = {
      id: projectId,
      companyId: companyId,
    };
  } else if (userRole === "SUPER_ADMIN") {
    whereClause = { id: projectId };
  }

  const project = await prisma.project.findFirst({
    where: whereClause,
    include: {
      creator: {
        select: { id: true, username: true },
      },
      company: {
        select: { id: true, name: true, industry: true },
      },
      ratings: {
        orderBy: { createdAt: "desc" },
        include: {
          rater: {
            select: { id: true, username: true, role: true },
          },
        },
      },
      chatMessages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, role: true, content: true, createdAt: true },
      },
      goals: {
        include: {
          goal: { select: { id: true, title: true } },
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
      name: history.rater.username,
      role: history.rater.role,
    },
    ratedAt: history.createdAt,
  }));

  const superAdminRatingRaw = ratingsListRaw.find(
    (history) => history.rater?.role === "SUPER_ADMIN",
  );

  const superAdminRating = superAdminRatingRaw
    ? {
        id: superAdminRatingRaw.id,
        score: superAdminRatingRaw.score,
        comment: superAdminRatingRaw.comment,
        ratedBy: {
          id: superAdminRatingRaw.rater.id,
          name: superAdminRatingRaw.rater.username,
          role: superAdminRatingRaw.rater.role,
        },
        ratedAt: superAdminRatingRaw.createdAt,
      }
    : null;

  let formQuestionAnswers = [];
  if (project.formId && project.formResponses) {
    const form = await prisma.analysisForm.findUnique({
      where: { id: project.formId },
      include: {
        questions: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            label: true,
            type: true,
            options: true,
            order: true,
          },
        },
      },
    });

    if (form) {
      const responses = project.formResponses || {};
      formQuestionAnswers = form.questions.map((question) => ({
        questionId: question.id,
        questionText: question.label,
        questionType: question.type,
        options: question.options,
        order: question.order,
        answer: responses[question.id] ?? null,
      }));
    }
  }

  const selectedGoals = project.goals.map((projectGoal) => ({
    id: projectGoal.goal.id,
    title: projectGoal.goal.title,
  }));

  const chatUiMessages = project.chatMessages || [];

  return {
    id: project.id,
    title: project.title,
    mode: project.mode,
    createdAt: project.createdAt,

    creator: project.creator,
    company: project.company,

    form: {
      id: project.formId,
      responses: formQuestionAnswers,
    },

    goals: selectedGoals,

    items: project.items,
    domain: project.domain,
    chatMessages: chatUiMessages,
    initialAnalysis: project.initialAnalysis,
    riskAnalysis: project.riskAnalysis,
    finalAnalysis: project.finalAnalysis,

    status: project.status,
    averageRating: project.averageRating,
    ratingCount: project.ratingCount,
    superAdminRating,
    riskPercentage: project.riskPercentage,

    // اگر خواستی لیست همه امتیازها هم برگردد این را باز کن
    // ratings: {
    //   list: ratingsList,
    // },
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

  const result = await prisma.$transaction(async (tx) => {
    const rating = await tx.projectRatingHistory.upsert({
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

    const ratingAggregate = await tx.projectRatingHistory.aggregate({
      where: {
        projectId: projectId,
      },
      _avg: {
        score: true,
      },
      _count: {
        score: true,
      },
    });

    const averageRating = ratingAggregate._avg.score || 0;
    const ratingCount = ratingAggregate._count.score || 0;

    await tx.project.update({
      where: { id: projectId },
      data: {
        averageRating,
        ratingCount,
        hasRating: ratingCount > 0,
      },
    });

    return rating;
  });

  return result;
};

module.exports = {
  getProject,
  getAllProjects,
  giveRateAndProject,
  isProjectExists,
};
