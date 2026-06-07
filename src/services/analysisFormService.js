const {
  deleteFormRepo,
  getSingleForms,
  getAvailableMultiAnalysisFormsService,
} = require("../repositories/analysisFormRepository");
const {
  createBadRequestError,
  resolveNextProjectStep,
  getPublishedPromptContentsForAnalysisForm,
  getPublishedPromptContentsForMultiAnalysisForm,
  getCompanyProfileDataForForm,
  buildInitialAnalysisPrompt,
  buildFinalAnalysisPrompt,
  buildFinalAnalysisWithCorrectionPrompt,
  buildReadableFormResponses,
  parseFinalAnalysisResponse,
  buildInitialMultiAnalysisPrompt,
  buildSelectedSourceProjectSummaries,
} = require("../utils");
const prisma = require("../prismaClient");
const runAI = require("../ai");

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
          companyAdminData: { select: { data: true } },
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

const handleConversationStepService = async (
  projectId,
  userId,
  userInput = "",
) => {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      creatorId: userId,
    },
    include: {
      company: {
        include: {
          companyAdminData: true,
        },
      },
      form: {
        include: {
          profileFields: true,
        },
      },
      multiAnalysisForm: {
        include: {
          profileFields: true,
          requiredForms: {
            orderBy: {
              order: "asc",
            },
            include: {
              form: true,
            },
          },
        },
      },
      chatMessages: {
        orderBy: {
          createdAt: "asc",
        },
        select: {
          role: true,
          content: true,
        },
      },
      goals: {
        include: {
          goal: true,
        },
      },
      multiGoals: {
        include: {
          goal: true,
        },
      },
      selectedSourceProjects: {
        include: {
          form: true,
          sourceProject: {
            select: {
              summaryAnalysis: true,
            },
          },
        },
      },
    },
  });

  if (!project) {
    createBadRequestError("پروژه یافت نشد", 404);
  }

  const now = new Date();

  const formPrompts =
    project.mode === "SINGLE"
      ? project.formId
        ? await getPublishedPromptContentsForAnalysisForm(project.formId)
        : {}
      : project.multiAnalysisFormId
        ? await getPublishedPromptContentsForMultiAnalysisForm(
            project.multiAnalysisFormId,
          )
        : {};

  const selectedGoals =
    project.mode === "SINGLE"
      ? project.goals.map((item) => item.goal?.title).filter(Boolean)
      : project.multiGoals.map((item) => item.goal?.title).filter(Boolean);

  const rawTemperature =
    project.mode === "MULTI"
      ? project.multiAnalysisForm?.temperature
      : project.form?.temperature;

  const temperature =
    typeof rawTemperature === "number" &&
    rawTemperature >= 0.1 &&
    rawTemperature <= 1
      ? rawTemperature
      : 0.7;

  try {
    if (userInput && userInput.trim() !== "") {
      await prisma.chatMessage.create({
        data: {
          projectId,
          userId,
          role: "user",
          content: userInput,
          createdAt: now,
        },
      });
    }
    if (project.status === "ANALYSIS_PENDING") {
      let prompt = "";

      if (project.mode === "SINGLE") {
        const readableFormResponses = await buildReadableFormResponses({
          formId: project.formId,
          formResponses: project.formResponses,
        });

        const companyProfileData = await getCompanyProfileDataForForm(
          project.companyId,
          project.form?.profileFields || [],
        );

        prompt = buildInitialAnalysisPrompt({
          formPrompts,
          companyProfileData,
          readableFormResponses,
          selectedGoals,
          domain: project.domain,
          temperature,
        });
      } else if (project.mode === "MULTI") {
        const sourceProjectSummaries = buildSelectedSourceProjectSummaries(
          project.selectedSourceProjects,
        );

        const companyProfileData = await getCompanyProfileDataForForm(
          project.companyId,
          project.multiAnalysisForm?.profileFields || [],
        );

        prompt = buildInitialMultiAnalysisPrompt({
          formPrompts,
          selectedGoals,
          companyProfileData,
          sourceProjectSummaries,
          domain: project.domain,
          temperature,
        });
      }

      const aiResponse = await runAI({
        system: "",
        user: prompt,
        temperature: 0.7,
      });

      await prisma.chatMessage.create({
        data: {
          projectId,
          role: "assistant",
          content: aiResponse,
        },
      });

      await prisma.project.update({
        where: { id: projectId },
        data: {
          status: "REVIEWING",
          initialAnalysis: aiResponse,
        },
      });

      return { success: true, aiResponse, newStatus: "REVIEWING" };
    }

    if (project.status === "REVIEWING") {
      const { nextStatus, transitionReason } = resolveNextProjectStep({
        currentStatus: project.status,
        userInput,
      });

      if (nextStatus === "CHAT_MODE") {
        await prisma.project.update({
          where: { id: projectId },
          data: {
            status: "CHAT_MODE",
            chatModeStartedAt: project.chatModeStartedAt || now,
            chatModeEndedAt: null,
          },
        });

        return {
          success: true,
          aiResponse: null,
          newStatus: "CHAT_MODE",
          transitionReason,
          message: "لطفاً توضیح اصلاحی خود را وارد کنید.",
        };
      }

      if (nextStatus === "FINAL_ANALYSIS") {
        const prompt = buildFinalAnalysisPrompt({
          initialAnalysis: project.initialAnalysis,
        });

        const aiResponse = await runAI({
          system: "",
          user: prompt,
          temperature: 0.7,
          max_tokens: 3500,
        });

        const parsedAnalysis = parseFinalAnalysisResponse(aiResponse);

        await prisma.chatMessage.create({
          data: {
            projectId,
            role: "assistant",
            content: aiResponse,
            createdAt: new Date(),
          },
        });

        await prisma.project.update({
          where: { id: projectId },
          data: {
            status: "FINAL_ANALYSIS",
            riskAnalysis: parsedAnalysis.riskAnalysis,
            finalAnalysis: parsedAnalysis.finalAnalysis,
            summaryAnalysis: parsedAnalysis.summary,
          },
        });

        return {
          success: true,
          aiResponse,
          analysis: parsedAnalysis,
          newStatus: "FINAL_ANALYSIS",
          transitionReason,
        };
      }

      return {
        success: false,
        aiResponse: null,
        newStatus: "REVIEWING",
        message: "لطفاً با کلماتی مثل 'تایید' یا 'عدم تایید' پاسخ دهید.",
      };
    }

    if (project.status === "CHAT_MODE") {
      if (!userInput || userInput.trim() === "") {
        throw createBadRequestError("توضیح اصلاحی الزامی است");
      }

      const prompt = buildFinalAnalysisWithCorrectionPrompt({
        userCorrection: userInput,
        initialAnalysis: project.initialAnalysis,
      });

      const aiResponse = await runAI({
        system: "",
        user: prompt,
        temperature: 0.7,
        max_tokens: 3500,
      });

      const parsedAnalysis = parseFinalAnalysisResponse(aiResponse);

      await prisma.chatMessage.create({
        data: {
          projectId,
          role: "assistant",
          content: aiResponse,
          createdAt: new Date(),
        },
      });

      await prisma.project.update({
        where: { id: projectId },
        data: {
          status: "FINAL_ANALYSIS",
          riskAnalysis: parsedAnalysis.riskAnalysis,
          finalAnalysis: parsedAnalysis.finalAnalysis,
          summaryAnalysis: parsedAnalysis.summary,
          chatModeEndedAt: now,
        },
      });

      return {
        success: true,
        aiResponse,
        analysis: parsedAnalysis,
        newStatus: "FINAL_ANALYSIS",
        transitionReason: "FINAL_ANALYSIS_GENERATED_AFTER_CORRECTION",
      };
    }

    if (project.status === "FINAL_ANALYSIS") {
      return {
        success: true,
        aiResponse: project.finalAnalysis,
        analysis: {
          riskAnalysis: project.riskAnalysis,
          finalAnalysis: project.finalAnalysis,
          summary: project.summaryAnalysis,
        },
        newStatus: "FINAL_ANALYSIS",
        transitionReason: "FINAL_ANALYSIS_ALREADY_GENERATED",
      };
    }

    return {
      success: false,
      newStatus: project.status,
      transitionReason: "UNSUPPORTED_STATUS",
    };
  } catch (error) {
    console.error("Error in Service:", error);
    throw error;
  }
};

const getAnalysisModesService = async (userId, companyId) => {
  const singleForms = await getSingleForms();
  const multiForm = await getAvailableMultiAnalysisFormsService({
    userId,
    companyId,
  });
  return {
    singleForms,
    multiForm,
  };
};

module.exports = {
  getAnalysisModesService,
  submitFormAnswersService,
  handleConversationStepService,
};
