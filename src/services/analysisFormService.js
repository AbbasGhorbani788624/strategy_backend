const {
  createWithQuestions,
  updateFormWithQuestions,
  deleteFormRepo,
  getAllAnalysisForms,
  getAnalysisFormById,
  getSingleForms,
  getStepFlows,
  isFromExists,
} = require("../repositories/analysisFormRepository");
const { findById } = require("../repositories/userRepository");
const { createBadRequestError } = require("../utils");
const prisma = require("../prismaClient");
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: "ollama",
  baseURL: "http://localhost:11434/v1",
});

const submitFormAnswersService = async (projectId, userId, answers) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      creatorId: true,
      companyId: true,
      formId: true,
      status: true,
    },
  });

  if (!project) {
    createBadRequestError("پروژه یافت نشد", 404);
  }

  if (project.creatorId !== userId) {
    createBadRequestError("شما مجوز ویرایش این پروژه را ندارید", 401);
  }

  if (!project.formId) {
    createBadRequestError("این پروژه فرم فعالی برای ثبت پاسخ ندارد");
  }

  if (project.status !== "WAITING_FOR_FORM") {
    createBadRequestError("در وضعیت فعلی امکان ثبت فرم وجود ندارد");
  }

  const form = await prisma.analysisForm.findUnique({
    where: { id: project.formId },
    include: {
      questions: {
        orderBy: {
          order: "asc",
        },
      },
    },
  });

  if (!form) {
    createBadRequestError("فرم مربوط به این پروژه یافت نشد");
  }

  const questions = form.questions || [];
  const questionIds = questions.map((q) => q.id);
  const answerKeys = Object.keys(answers || {});

  const invalidAnswerKeys = answerKeys.filter(
    (key) => !questionIds.includes(key),
  );

  if (invalidAnswerKeys.length > 0) {
    createBadRequestError("برخی پاسخ‌های ارسالی معتبر نیستند");
  }

  const requiredQuestions = questions.filter((q) => q.required);

  const unansweredRequiredQuestions = requiredQuestions.filter((q) => {
    const value = answers[q.id];

    return (
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim() === "") ||
      (Array.isArray(value) && value.length === 0)
    );
  });

  if (unansweredRequiredQuestions.length > 0) {
    createBadRequestError("پاسخ به همه سوالات اجباری الزامی است");
  }

  const updatedProject = await prisma.project.update({
    where: { id: projectId },
    data: {
      formResponses: answers,
      status: "ANALYSIS_PENDING",
    },
    include: {
      company: {
        select: {
          profile: true,
          adminData: { select: { data: true } },
        },
      },
    },
  });

  let aiResponse = null;
  try {
    aiResponse = await handleConversationStepService(projectId, userId, "");
  } catch (error) {
    console.error("Failed to start analysis after form submission:", error);
  }
  return {
    project: updatedProject,
    aiResponse,
  };
};

const handleConversationStepService = async (projectId, userId, userInput) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      company: {
        select: {
          profile: true,
          adminData: { select: { data: true } },
        },
      },
      chatMessages: {
        orderBy: { createdAt: "asc" },
        select: { role: true, content: true },
      },
      goals: {
        include: {
          goal: true,
        },
      },
    },
  });

  if (!project) {
    createBadRequestError("پروژه یافت نشد", 404);
  }

  const staticContext = {
    companyProfile: project.company?.profile || {},
    adminData: project.company?.adminData?.data || null,
    formId: project.formId,
    formResponses: project.formResponses || {},
  };

  let readableFormResponses = {};

  if (
    staticContext.formId &&
    Object.keys(staticContext.formResponses).length > 0
  ) {
    const formQuestions = await prisma.formQuestion.findMany({
      where: { formId: staticContext.formId },
      select: { id: true, label: true },
    });

    const idToLabelMap = {};

    formQuestions.forEach((q) => {
      idToLabelMap[q.id] = q.label;
    });

    readableFormResponses = Object.keys(staticContext.formResponses).reduce(
      (acc, key) => {
        acc[idToLabelMap[key] || key] = staticContext.formResponses[key];

        return acc;
      },
      {},
    );
  }

  let formPrompts = [];

  if (project.formId) {
    const form = await prisma.analysisForm.findUnique({
      where: { id: project.formId },
      include: {
        prompts: true,
      },
    });

    if (form) {
      formPrompts = form.prompts.map((p) => p.content);
    }
  }

  const selectedGoals = project.goals.map((g) => g.goal.title);

  const chatHistory = project.chatMessages
    .filter((msg) => msg.role !== "system")
    .map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

  let currentInstruction = "";
  let nextStatus = project.status;

  const lowerInput = userInput.toLowerCase().trim();

  switch (project.status) {
    case "ANALYSIS_PENDING":
      currentInstruction = `شما مشاور استراتژیک هستید. با توجه به داده‌های شرکت، داده‌های ادمین و پاسخ‌های فرم، "مسئله اصلی" و "فرضیات اولیه" را به صورت ساختاریافته و واضح ارائه دهید.
      ساختار پاسخ:
      1. مسئله اصلی:
      2. فرضیات کلیدی:`;

      nextStatus = "REVIEWING";
      break;

    case "REVIEWING":
      const isApproved = [
        "خوب",
        "تایید",
        "بله",
        "ادامه",
        "ok",
        "yes",
        "تایید میکنم",
        "اوکی",
      ].some((k) => lowerInput.includes(k));

      const isRejected = [
        "نه",
        "رد",
        "اشتباه",
        "خوب نیست",
        "no",
        "reject",
        "wrong",
        "نمی‌خوام",
      ].some((k) => lowerInput.includes(k));

      if (isApproved) {
        nextStatus = "RISK_ANALYSIS";

        currentInstruction = `کاربر فرضیات اولیه را تایید کرد. لطفاً بر اساس این فرضیات، "تحلیل ریسک" (شامل ریسک‌های مالی، عملیاتی و استراتژیک) را ارائه دهید. تحلیل باید شامل موارد زیر باشد:
        1. ریسک‌های مالی
        2. ریسک‌های عملیاتی
        3. ریسک‌های استراتژیک
        4. راهکارهای پیشنهادی برای کاهش ریسک‌ها`;
      } else if (isRejected) {
        nextStatus = "CHAT_MODE";

        currentInstruction = `کاربر فرضیات اولیه را رد کرد. شما باید با پرسیدن سوالات هوشمندانه و هدفمند، "مسئله واقعی" یا "نکات نادیده گرفته شده" را شفاف کنید.
        دستورالعمل:
        1. مستقیماً تحلیل ارائه ندهید.
        2. به جای تحلیل، سوالاتی بپرسید که باعث شفافیت بیشتر شود.
        3. سعی کنید بفهمید چرا فرضیات رد شده‌اند.
        4. حداکثر ۲ تا ۳ سوال کلیدی در هر پاسخ بپرسید.
        5. وقتی احساس کردید تمام اطلاعات لازم برای تحلیل ریسک جمع‌آوری شده است، مستقیماً تحلیل ریسک را ارائه دهید.`;
      } else {
        currentInstruction = `لطفاً فرضیات را تایید کنید یا رد کنید.`;
        nextStatus = "REVIEWING";
      }

      break;

    case "CHAT_MODE":
      currentInstruction = `شما در حال شفاف‌سازی مسئله هستید.
      - اگر کاربر سوالی پرسیده، پاسخ دهید.
      - اگر کاربر اطلاعات جدیدی داده، آن را در نظر بگیرید.
      - اگر هنوز اطلاعات کافی نیست، سوال بپرسید.
      - وقتی اطلاعات کافی جمع شد، تحلیل ریسک کامل ارائه دهید.`;

      break;

    case "RISK_ANALYSIS":
      const wantsFinal = [
        "تحلیل نهایی",
        "ادامه",
        "تایید",
        "بله",
        "ok",
        "yes",
        "اوکی",
      ].some((k) => lowerInput.includes(k));

      if (wantsFinal) {
        nextStatus = "FINAL_ANALYSIS";

        currentInstruction = `کاربر درخواست تحلیل نهایی دارد. لطفاً تحلیل نهایی استراتژیک با راهکارهای اجرایی ارائه دهید.`;
      } else {
        currentInstruction =
          "تحلیل ریسک ارائه شد. برای دریافت تحلیل نهایی، عبارت 'تحلیل نهایی' را بنویسید.";

        nextStatus = "RISK_ANALYSIS";
      }

      break;

    case "FINAL_ANALYSIS":
      currentInstruction =
        "تحلیل نهایی انجام شده است. اگر سوالی دارید پاسخ دهید.";

      nextStatus = "FINAL_ANALYSIS";

      break;
  }

  const prompt = `
نقش: مشاور استراتژیک هوشمند.


${
  selectedGoals.length > 0
    ? selectedGoals.map((g) => `- ${g}`).join("\n")
    : "هدفی انتخاب نشده است."
}


${
  formPrompts.length > 0
    ? formPrompts.map((p, i) => `(${i + 1}) ${p}`).join("\n\n")
    : "فرمی وجود ندارد."
}


${JSON.stringify(staticContext.companyProfile, null, 2)}

${
  staticContext.adminData
    ? `

${JSON.stringify(staticContext.adminData, null, 2)}
`
    : ""
}

${
  Object.keys(readableFormResponses).length > 0
    ? `

${JSON.stringify(readableFormResponses, null, 2)}
`
    : ""
}


${currentInstruction}


${chatHistory.map((h) => `${h.role}: ${h.content}`).join("\n")}


${userInput}
`;

  try {
    if (userInput.trim() !== "") {
      await prisma.chatMessage.create({
        data: {
          projectId,
          userId,
          role: "user",
          content: userInput,
        },
      });
    }

    const completion = await openai.chat.completions.create({
      model: "qwen2.5-coder:7b",
      messages: [
        {
          role: "system",
          content: "شما یک مشاور استراتژیک و تحلیلگر حرفه‌ای کسب‌وکار هستید.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 1500,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0].message.content;

    await prisma.chatMessage.create({
      data: {
        projectId,
        userId: null,
        role: "assistant",
        content: aiResponse,
      },
    });

    const updateData = {
      status: nextStatus,
    };

    if (project.status === "ANALYSIS_PENDING") {
      updateData.initialAnalysis = aiResponse;
    } else if (
      project.status === "REVIEWING" &&
      nextStatus === "RISK_ANALYSIS"
    ) {
      updateData.riskAnalysis = aiResponse;
    } else if (project.status === "CHAT_MODE") {
      updateData.status = "RISK_ANALYSIS";
      updateData.riskAnalysis = aiResponse;
    } else if (project.status === "RISK_ANALYSIS") {
      if (nextStatus === "FINAL_ANALYSIS") {
        updateData.finalAnalysis = aiResponse;
      } else {
        updateData.riskAnalysis = aiResponse;
      }
    } else if (project.status === "FINAL_ANALYSIS") {
      updateData.finalAnalysis = aiResponse;
    }

    await prisma.project.update({
      where: { id: projectId },
      data: updateData,
    });

    return {
      success: true,
      aiResponse,
      newStatus: updateData.status,
    };
  } catch (error) {
    console.error("Error in handleConversationStep:", error);
    throw error;
  }
};

//ساخت فرم تحلیل
const createForm = async (data) => {
  return createWithQuestions(data);
};

//ویرایش قرم تحلیل
const updateForm = async (id, data) => {
  if (!id) {
    createBadRequestError("آیدی فرم ارسال نشده");
  }
  const existing = await isFromExists(id);

  if (!existing) {
    createBadRequestError("فرم پیدا نشد", 404);
  }

  return updateFormWithQuestions(id, data);
};

// حذف فرم تحلیل
const deleteForm = async (id) => {
  if (!id) {
    createBadRequestError("آیدی فرم ارسال نشده");
  }

  const existing = await isFromExists(id);
  if (!existing) {
    createBadRequestError("فرم پیدا نشد", 404);
  }

  return deleteFormRepo(id);
};

const getAllAnalysisFormsService = async (query) => {
  let { page = 1, limit = 10, search = "" } = query;

  page = parseInt(page);
  limit = parseInt(limit);

  if (page < 1) page = 1;
  if (limit < 1 || limit > 100) limit = 10;

  return await getAllAnalysisForms({ page, limit, search });
};

const getAnalysisFormByIdService = async (id) => {
  if (!id) {
    createBadRequestError("شناسه فرم الزامی است");
  }

  const form = await getAnalysisFormById(id);

  if (!form) {
    createBadRequestError("فرم مورد نظر یافت نشد", 404);
  }

  return form;
};

const getAnalysisModesService = async (currentUser) => {
  const singleForms = await getSingleForms();
  const stepFlows = await getStepFlows();
  const user = await findById(currentUser?.id);

  return {
    singleForms,
    stepFlows,
    profileCompleted: user.profileCompleted,
  };
};

module.exports = {
  createForm,
  updateForm,
  deleteForm,
  getAllAnalysisFormsService,
  getAnalysisFormByIdService,
  getAnalysisModesService,
  submitFormAnswersService,
  handleConversationStepService,
};
