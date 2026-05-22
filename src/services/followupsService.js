const prisma = require("../prismaClient");
const { createBadRequestError } = require("../utils");

const createFollowUpFormService = async (body) => {
  const { title, description, isActive = true, order, questions } = body;

  const form = await prisma.followUpForm.create({
    data: {
      title: title.trim(),
      description: description || null,
      isActive: typeof isActive === "boolean" ? isActive : true,
      order: Number.isInteger(order) ? order : null,
      questions: {
        create: questions,
      },
    },
    include: {
      questions: {
        orderBy: {
          order: "asc",
        },
      },
    },
  });

  return form;
};

const getActiveFollowUpFormService = async () => {
  const form = await prisma.followUpForm.findFirst({
    where: {
      isActive: true,
    },
    orderBy: [
      {
        order: "asc",
      },
      {
        createdAt: "desc",
      },
    ],
    include: {
      questions: {
        orderBy: {
          order: "asc",
        },
      },
    },
  });

  if (!form) {
    createBadRequestError("فرم فعالی برای پیگیری وجود ندارد", 404);
  }

  return form;
};

createProjectFollowUpRequest = async ({ projectId, userId, body }) => {
  const { formId, title, responses } = body;

  if (!projectId) {
    throw createError("شناسه پروژه الزامی است", 400);
  }

  if (!formId) {
    throw createError("شناسه فرم پیگیری الزامی است", 400);
  }

  if (!responses || typeof responses !== "object" || Array.isArray(responses)) {
    throw createError("پاسخ‌های فرم پیگیری معتبر نیست", 400);
  }

  /**
   * نکته مهم:
   * اینجا فرض شده مدل Project فیلدی به نام userId دارد.
   * اگر در پروژه تو نام فیلد مالک پروژه چیز دیگری است،
   * مثلا ownerId یا createdById، همین قسمت را تغییر بده.
   */
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId: userId,
    },
  });

  if (!project) {
    throw createError("پروژه پیدا نشد یا شما به این پروژه دسترسی ندارید", 404);
  }

  const form = await prisma.followUpForm.findFirst({
    where: {
      id: formId,
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
    throw createError("فرم پیگیری فعال پیدا نشد", 404);
  }

  if (!form.questions || form.questions.length === 0) {
    throw createError("فرم پیگیری هیچ سوالی ندارد", 400);
  }

  const questionIds = form.questions.map((question) => question.id);

  const responseQuestionIds = Object.keys(responses);

  const invalidQuestionId = responseQuestionIds.find(
    (questionId) => !questionIds.includes(questionId),
  );

  if (invalidQuestionId) {
    throw createError("یکی از پاسخ‌ها مربوط به سوال نامعتبر است", 400);
  }

  for (const question of form.questions) {
    const answer = responses[question.id];

    if (question.required) {
      const isEmpty =
        answer === undefined ||
        answer === null ||
        answer === "" ||
        (Array.isArray(answer) && answer.length === 0);

      if (isEmpty) {
        throw createError(`پاسخ سوال "${question.label}" الزامی است`, 400);
      }
    }

    if (answer !== undefined && answer !== null && answer !== "") {
      if (question.type === "CHECKBOX") {
        if (!Array.isArray(answer)) {
          throw createError(
            `پاسخ سوال "${question.label}" باید آرایه باشد`,
            400,
          );
        }
      }

      if (question.type === "RADIO" || question.type === "DROPDOWN") {
        if (typeof answer !== "string") {
          throw createError(`پاسخ سوال "${question.label}" باید متن باشد`, 400);
        }

        if (
          Array.isArray(question.options) &&
          question.options.length > 0 &&
          !question.options.includes(answer)
        ) {
          throw createError(
            `گزینه انتخاب‌شده برای سوال "${question.label}" معتبر نیست`,
            400,
          );
        }
      }

      if (question.type === "NUMBER") {
        if (typeof answer !== "number") {
          throw createError(`پاسخ سوال "${question.label}" باید عدد باشد`, 400);
        }
      }

      if (question.type === "TEXT" || question.type === "TEXTAREA") {
        if (typeof answer !== "string") {
          throw createError(`پاسخ سوال "${question.label}" باید متن باشد`, 400);
        }
      }
    }
  }

  const followUpRequest = await prisma.followUpRequest.create({
    data: {
      projectId,
      userId,
      formId,
      title: title?.trim() || form.title,
      status: "PENDING",
      responses,
    },
    include: {
      project: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      form: {
        include: {
          questions: {
            orderBy: {
              order: "asc",
            },
          },
        },
      },
    },
  });

  return followUpRequest;
};

module.exports = {
  createFollowUpFormService,
  getActiveFollowUpFormService,
};
