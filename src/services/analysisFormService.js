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
  parseFinalAnalysisResponse,
  buildInitialMultiAnalysisPrompt,
  buildSelectedSourceProjectSummaries,
  getOrderedPromptSegments,
  pickPromptSegments,
  extractAnalysisData,
  safeStringify,
} = require("../utils");
const prisma = require("../prismaClient");
const axios = require("axios");
const {
  buildFormattedResponses,
  flattenQuestions,
} = require("../utils/buildFormattedResponses");

function createCategoryInclude(depth = 4) {
  return {
    questions: {
      orderBy: {
        order: "asc",
      },
      include: {
        options: {
          orderBy: {
            order: "asc",
          },
        },
      },
    },

    children:
      depth > 0
        ? {
            orderBy: {
              order: "asc",
            },
            include: createCategoryInclude(depth - 1),
          }
        : undefined,
  };
}

const sendPromptToAnalyze = async (prompt, mode = "SINGLE") => {
  try {
    const payload = typeof prompt === "string" ? JSON.parse(prompt) : prompt;

    const endpoint = mode === "MULTI" ? "full_analyze" : "analyze";
    const url = `http://185.237.85.53:8080/${endpoint}`;

    // console.log("analyze request payload =>", JSON.stringify(payload, null, 2));

    const response = await axios.post(url, payload, {
      headers: { "Content-Type": "application/json" },
    });

    // console.log("analyze status =>", response.status);
    // console.log("analyze data =>", response.data);

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // console.error("status =>", error.response?.status);
      // console.error("statusText =>", error.response?.statusText);
      // console.error(
      //   "response data =>",
      //   JSON.stringify(error.response?.data, null, 2),
      // );
      // console.error(
      //   "detail =>",
      //   JSON.stringify(error.response?.data?.detail, null, 2),
      // );
    } else {
      console.error("unknown error =>", error);
    }
    throw error;
  }
};

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
    where: {
      id: project.formId,
    },

    include: {
      categoryGroups: {
        orderBy: {
          order: "asc",
        },

        include: {
          categories: {
            orderBy: {
              category: {
                order: "asc",
              },
            },

            include: {
              category: {
                include: createCategoryInclude(),
              },
            },
          },
        },
      },

      categories: {
        where: {
          parentId: null,
        },

        orderBy: {
          order: "asc",
        },

        include: createCategoryInclude(),
      },
    },
  });

  if (!form) {
    createBadRequestError("فرم مربوط به این پروژه یافت نشد");
  }

  const { questions, questionMap, questionIdSet } = flattenQuestions(
    form.categories,
  );
  const answerKeys = Object.keys(answers || {});

  const invalidAnswerKeys = answerKeys.filter((key) => !questionIdSet.has(key));

  if (invalidAnswerKeys.length > 0) {
    createBadRequestError("برخی پاسخ‌های ارسالی معتبر نیستند");
  }

  const unansweredRequiredQuestions = questions.filter((question) => {
    if (!question.required) return false;

    const value = answers[question.id];

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

  if (unansweredRequiredQuestions.length > 0) {
    createBadRequestError("پاسخ به همه سوالات اجباری الزامی است");
  }

  const formattedResponses = buildFormattedResponses(form, answers);
  console.dir(formattedResponses, {
    depth: null,
  });

  const updatedProject = await prisma.project.update({
    where: { id: projectId },
    data: {
      formResponses: formattedResponses,
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
  const now = new Date();

  const project = await prisma.project.findFirst({
    where: { id: projectId, creatorId: userId },
    include: {
      company: { include: { companyAdminData: true } },
      form: {
        include: {
          profileFields: true,
          promptDefinition: {
            include: {
              versions: {
                where: { status: "PUBLISHED" },
                orderBy: { versionNumber: "desc" },
                take: 1,
                include: {
                  values: {
                    include: {
                      segmentDefinition: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      multiAnalysisForm: {
        include: {
          profileFields: true,
          requiredForms: {
            orderBy: { order: "asc" },
            include: { form: true },
          },
          promptDefinition: {
            include: {
              versions: {
                where: { status: "PUBLISHED" },
                orderBy: { versionNumber: "desc" },
                take: 1,
                include: {
                  values: {
                    include: {
                      segmentDefinition: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      goals: { include: { goal: true } },
      multiGoals: { include: { goal: true } },
      selectedSourceProjects: {
        include: {
          form: true,
          sourceProject: { select: { summaryAnalysis: true } },
        },
      },
    },
  });

  if (!project) {
    createBadRequestError("پروژه یافت نشد", 404);
  }

  const trimmedInput = userInput?.trim() || "";

  const isSingle = project.mode === "SINGLE";
  const isMulti = project.mode === "MULTI";

  const analysisTitle = isSingle
    ? project.form?.title
    : project.multiAnalysisForm?.title;

  if (!analysisTitle) {
    createBadRequestError("عنوان فرم تحلیل یافت نشد", 400);
  }

  const selectedGoals = (isSingle ? project.goals : project.multiGoals)
    .map((item) => item.goal?.title)
    .filter(Boolean);

  const rawTemperature = isMulti
    ? project.multiAnalysisForm?.temperature
    : project.form?.temperature;

  const temperature =
    typeof rawTemperature === "number" &&
    rawTemperature >= 0.1 &&
    rawTemperature <= 1
      ? rawTemperature
      : 0.7;

  const activePromptVersion = isSingle
    ? project.form?.promptDefinition?.versions?.[0]
    : project.multiAnalysisForm?.promptDefinition?.versions?.[0];

  if (!activePromptVersion) {
    createBadRequestError(
      "نسخه منتشرشده پرامپت برای فرم این پروژه یافت نشد",
      400,
    );
  }

  const orderedPromptSegments = getOrderedPromptSegments(activePromptVersion);

  const firstPromptSegment = pickPromptSegments(orderedPromptSegments, [0]);

  const secondAndThirdPromptSegments = pickPromptSegments(
    orderedPromptSegments,
    [1, 2],
  );

  if (!firstPromptSegment.length) {
    createBadRequestError("سگمنت مرحله اول پرامپت یافت نشد", 400);
  }

  let companyProfileData = null;
  let readableFormResponses = null;
  let sourceProjectSummaries = null;

  if (isSingle) {
    readableFormResponses = project.formResponses;

    companyProfileData = await getCompanyProfileDataForForm(
      project.companyId,
      project.form?.profileFields || [],
    );
  }

  if (isMulti) {
    sourceProjectSummaries = buildSelectedSourceProjectSummaries(
      project.selectedSourceProjects,
    );

    companyProfileData = await getCompanyProfileDataForForm(
      project.companyId,
      project.multiAnalysisForm?.profileFields || [],
    );
  }

  const generateAndPersistFinalAnalysis = async (
    prompt,
    transitionReason,
    mode,
  ) => {
    const aiResponse = await sendPromptToAnalyze(prompt, mode);

    const {
      finalAnalysis,
      riskAnalysis,
      riskPercentage,
      summaryAnalysis,
      keyStrategicInsights,
    } = extractAnalysisData(aiResponse);

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        status: "FINAL_ANALYSIS",

        finalAnalysis,
        riskAnalysis,
        riskPercentage,
        summaryAnalysis,
        keyStrategicInsights,

        chatModeEndedAt: new Date(),
      },
    });

    return {
      success: true,
      aiResponse,
      transitionReason,

      analysis: {
        finalAnalysis: updatedProject.finalAnalysis,
        riskAnalysis: updatedProject.riskAnalysis,
        riskPercentage: updatedProject.riskPercentage,
      },
    };
  };

  switch (project.status) {
    case "ANALYSIS_PENDING": {
      const prompt = isSingle
        ? buildInitialAnalysisPrompt({
            promptSegments: firstPromptSegment,
            title: analysisTitle,
            companyProfileData,
            readableFormResponses,
            selectedGoals,
            domain: project.domain,
            temperature,
          })
        : buildInitialMultiAnalysisPrompt({
            promptSegments: firstPromptSegment,
            title: analysisTitle,
            companyProfileData,
            selectedGoals,
            sourceProjectSummaries,
            domain: project.domain,
            temperature,
          });

      const aiResponse = await sendPromptToAnalyze(prompt, project.mode);

      const initialAnalysis = safeStringify(
        aiResponse?.final_output ?? aiResponse,
      );

      await prisma.project.update({
        where: { id: projectId },
        data: {
          status: "REVIEWING",
          initialAnalysis,
        },
      });

      return {
        success: true,
        aiResponse: initialAnalysis,
        newStatus: "REVIEWING",
        transitionReason: "INITIAL_ANALYSIS_GENERATED",
      };
    }

    case "REVIEWING": {
      if (trimmedInput) {
        await prisma.project.update({
          where: { id: projectId },
          data: {
            status: "CHAT_MODE",
            chatModeStartedAt: now,
            chatModeEndedAt: null,
          },
        });

        const prompt = buildFinalAnalysisWithCorrectionPrompt({
          promptSegments: orderedPromptSegments,
          title: analysisTitle,
          mode: project.mode,
          userCorrection: trimmedInput,
          temperature,
          companyProfileData,
          selectedGoals,
          domain: project.domain,
          readableFormResponses,
          sourceProjectSummaries,
        });

        return generateAndPersistFinalAnalysis(
          prompt,
          "FINAL_ANALYSIS_AFTER_USER_CORRECTION",
          project.mode,
        );
      }

      if (secondAndThirdPromptSegments.length < 2) {
        createBadRequestError("سگمنت‌های مرحله نهایی پرامپت یافت نشد", 400);
      }

      const prompt = buildFinalAnalysisPrompt({
        promptSegments: secondAndThirdPromptSegments,
        initialAnalysis: project.initialAnalysis,
        title: analysisTitle,
        temperature,
      });

      const result = await generateAndPersistFinalAnalysis(
        prompt,
        "FINAL_ANALYSIS_APPROVED",
        project.mode,
      );

      return {
        ...result,
        newStatus: "FINAL_ANALYSIS",
      };
    }

    case "CHAT_MODE": {
      if (!trimmedInput) {
        createBadRequestError("توضیح اصلاحی الزامی است", 400);
      }

      await prisma.chatMessage.create({
        data: {
          projectId,
          userId,
          role: "user",
          content: trimmedInput,
          createdAt: now,
        },
      });

      const prompt = buildFinalAnalysisWithCorrectionPrompt({
        promptSegments: orderedPromptSegments,
        title: analysisTitle,
        mode: project.mode,
        userCorrection: trimmedInput,
        temperature,
        companyProfileData,
        selectedGoals,
        domain: project.domain,
        readableFormResponses,
        sourceProjectSummaries,
      });

      return generateAndPersistFinalAnalysis(
        prompt,
        "FINAL_ANALYSIS_GENERATED_AFTER_CORRECTION",
        project.mode,
      );
    }

    case "FINAL_ANALYSIS":
      return {
        success: true,
        aiResponse: project.finalAnalysis,
        analysis: {
          finalAnalysis: project.finalAnalysis,
          riskAnalysis: project.riskAnalysis,
          summary: project.summaryAnalysis,
        },
        newStatus: "FINAL_ANALYSIS",
        transitionReason: "FINAL_ANALYSIS_ALREADY_GENERATED",
      };

    default:
      return {
        success: false,
        newStatus: project.status,
        transitionReason: "UNSUPPORTED_STATUS",
      };
  }
};

const getAnalysisModesService = async (userId, companyId) => {
  const singleForms = await getSingleForms(companyId);
  const multiForm = await getAvailableMultiAnalysisFormsService({
    userId,
    companyId,
  });
  return {
    singleForms,
    multiForm,
  };
};

const getCompanyAnalysisStatisticsService = async (userId) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      companyId: true,
    },
  });

  if (!user?.companyId) {
    createBadRequestError("کاربر عضو سازمان نیست", 404);
  }

  const companyId = user.companyId;

  const [
    singleAnalysisCount,
    multiAnalysisCount,
    singleAnalysis,
    multiAnalysis,
  ] = await Promise.all([
    prisma.analysisForm.count(),

    prisma.multiAnalysisForm.count(),

    prisma.analysisForm.findMany({
      select: {
        id: true,
        title: true,

        _count: {
          select: {
            projects: {
              where: {
                companyId,
              },
            },
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.multiAnalysisForm.findMany({
      select: {
        id: true,
        title: true,

        _count: {
          select: {
            projects: {
              where: {
                companyId,
              },
            },
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  return {
    summary: {
      singleAnalysisCount,

      multiAnalysisCount,
    },

    usage: {
      singleAnalysis: singleAnalysis.map((item) => ({
        id: item.id,

        title: item.title,

        usageCount: item._count.projects,
      })),

      multiAnalysis: multiAnalysis.map((item) => ({
        id: item.id,

        title: item.title,

        usageCount: item._count.projects,
      })),
    },
  };
};

module.exports = {
  getAnalysisModesService,
  submitFormAnswersService,
  handleConversationStepService,
  getCompanyAnalysisStatisticsService,
};
