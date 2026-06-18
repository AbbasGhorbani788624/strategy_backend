const prisma = require("../prismaClient");
const { createBadRequestError } = require("../utils");

const getActiveFollowUpFormService = async () => {
  const form = await prisma.followUpForm.findFirst({
    where: {
      isActive: true,
    },
    include: {
      questions: {
        orderBy: {
          order: "asc",
        },
      },
    },
  });

  if (!form) {
    throw createBadRequestError("فرم فعالی برای پیگیری وجود ندارد", 404);
  }

  return form;
};

const createProjectFollowUpRequestService = async ({
  projectId,
  userId,
  body,
}) => {
  const { formId, title, responses, extraDescription } = body;

  if (!projectId) createBadRequestError("شناسه پروژه الزامی است", 400);
  if (!formId) createBadRequestError("شناسه فرم پیگیری الزامی است", 400);
  if (!responses || typeof responses !== "object" || Array.isArray(responses)) {
    createBadRequestError("پاسخ‌های فرم معتبر نیست", 400);
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [{ creatorId: userId }],
    },
  });

  if (!project) {
    createBadRequestError("پروژه پیدا نشد یا شما دسترسی ندارید", 404);
  }

  const form = await prisma.followUpForm.findFirst({
    where: { id: formId },
    include: {
      questions: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!form) createBadRequestError("فرم پیگیری فعال پیدا نشد", 404);
  if (!form.questions?.length)
    createBadRequestError("فرم پیگیری هیچ سوالی ندارد", 400);

  const questionMap = new Map(form.questions.map((q) => [q.id, q]));

  for (const [questionId, answer] of Object.entries(responses)) {
    const question = questionMap.get(questionId);
    if (!question) {
      createBadRequestError(`سوال با شناسه ${questionId} وجود ندارد`, 400);
    }

    if (question.required) {
      const isEmpty =
        answer === undefined ||
        answer === null ||
        (typeof answer === "string" && !answer.trim()) ||
        (Array.isArray(answer) && answer.length === 0);

      if (isEmpty) {
        createBadRequestError(`پاسخ سوال "${question.label}" الزامی است`, 400);
      }
    }
  }

  const followUpRequest = await prisma.followUpRequest.create({
    data: {
      title: title?.trim() || form.title || "پیگیری پروژه",
      projectId,
      userId,
      formId,
      responses,
      status: "PENDING",
      extraDescription: extraDescription?.trim() || null,
    },
    include: {
      project: { select: { id: true, title: true } },
      user: { select: { id: true, username: true } },
      form: true,
    },
  });

  return followUpRequest;
};

const getMyFollowUps = async (userId, query = {}) => {
  const { page = 1, limit = 10, search = "", status } = query;

  const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
  const parsedLimit = Math.max(parseInt(limit, 10) || 10, 1);

  const skip = (parsedPage - 1) * parsedLimit;

  const whereClause = {
    userId,

    ...(search && {
      title: {
        contains: search,
      },
    }),

    ...(status &&
      status !== "ALL" && {
        status,
      }),
  };

  const [followUps, totalItems] = await Promise.all([
    prisma.followUpRequest.findMany({
      where: whereClause,

      skip,
      take: parsedLimit,

      orderBy: {
        createdAt: "desc",
      },

      select: {
        id: true,
        title: true,
        status: true,

        extraDescription: true,

        adminAnswer: true,
        answeredAt: true,

        responses: true,

        createdAt: true,

        project: {
          select: {
            id: true,
            title: true,
            summaryAnalysis: true,
            createdAt: true,
          },
        },

        form: {
          select: {
            id: true,
            title: true,
            description: true,

            questions: {
              orderBy: {
                order: "asc",
              },

              select: {
                id: true,
                label: true,
                type: true,
                options: true,
                required: true,
              },
            },
          },
        },
      },
    }),

    prisma.followUpRequest.count({
      where: whereClause,
    }),
  ]);

  return {
    followUps,

    pagination: {
      totalItems,
      currentPage: parsedPage,
      totalPages: Math.ceil(totalItems / parsedLimit),
      limit: parsedLimit,
    },
  };
};

module.exports = {
  getActiveFollowUpFormService,
  createProjectFollowUpRequestService,
  getMyFollowUps,
};
