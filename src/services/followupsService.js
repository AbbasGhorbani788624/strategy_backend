const prisma = require("../prismaClient");
const { createBadRequestError } = require("../utils");

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
    createBadRequestError("شناسه پروژه الزامی است", 400);
  }

  if (!formId) {
    createBadRequestError("شناسه فرم پیگیری الزامی است", 400);
  }

  if (!responses || typeof responses !== "object" || Array.isArray(responses)) {
    createBadRequestError("پاسخ‌های فرم پیگیری معتبر نیست", 400);
  }
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId: userId,
    },
  });

  if (!project) {
    createBadRequestError(
      "پروژه پیدا نشد یا شما به این پروژه دسترسی ندارید",
      404,
    );
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
    createBadRequestError("فرم پیگیری فعال پیدا نشد", 404);
  }

  if (!form.questions || form.questions.length === 0) {
    createBadRequestError("فرم پیگیری هیچ سوالی ندارد", 400);
  }

  const questionIds = form.questions.map((question) => question.id);

  const responseQuestionIds = Object.keys(responses);

  const invalidQuestionId = responseQuestionIds.find(
    (questionId) => !questionIds.includes(questionId),
  );

  if (invalidQuestionId) {
    createBadRequestError("یکی از پاسخ‌ها مربوط به سوال نامعتبر است", 400);
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
        createBadRequestError(`پاسخ سوال "${question.label}" الزامی است`, 400);
      }
    }

    if (answer !== undefined && answer !== null && answer !== "") {
      if (question.type === "CHECKBOX") {
        if (!Array.isArray(answer)) {
          createBadRequestError(
            `پاسخ سوال "${question.label}" باید آرایه باشد`,
            400,
          );
        }
      }

      if (question.type === "RADIO" || question.type === "DROPDOWN") {
        if (typeof answer !== "string") {
          createBadRequestError(
            `پاسخ سوال "${question.label}" باید متن باشد`,
            400,
          );
        }

        if (
          Array.isArray(question.options) &&
          question.options.length > 0 &&
          !question.options.includes(answer)
        ) {
          createBadRequestError(
            `گزینه انتخاب‌شده برای سوال "${question.label}" معتبر نیست`,
            400,
          );
        }
      }

      if (question.type === "NUMBER") {
        if (typeof answer !== "number") {
          createBadRequestError(
            `پاسخ سوال "${question.label}" باید عدد باشد`,
            400,
          );
        }
      }

      if (question.type === "TEXT" || question.type === "TEXTAREA") {
        if (typeof answer !== "string") {
          createBadRequestError(
            `پاسخ سوال "${question.label}" باید متن باشد`,
            400,
          );
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
  getActiveFollowUpFormService,
};
