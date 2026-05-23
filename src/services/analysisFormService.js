const {
  createWithQuestions,
  deleteFormRepo,
  getAllAnalysisForms,
  getAnalysisFormById,
  getSingleForms,
  isFromExists,
  getAvailableMultiAnalysisFormsService,
} = require("../repositories/analysisFormRepository");
const {
  createBadRequestError,
  resolveNextProjectStep,
  getPublishedPromptContentsForAnalysisForm,
  getPublishedPromptContentsForMultiAnalysisForm,
  buildWorkflowPrompt,
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
          profile: true,
          adminData: { select: { data: true } },
        },
      },
    },
  });

  let aiResponse = null;
  try {
    console.log("arrive to this");
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
  userInput,
  understood = false,
) => {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      creatorId: userId,
    },
    include: {
      company: {
        select: {
          profile: true,
          adminData: {
            select: {
              data: true,
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
      multiAnalysisForm: {
        include: {
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
      selectedSourceProjects: {
        include: {
          form: true,
          sourceProject: {
            include: {
              form: true,
              goals: {
                include: {
                  goal: true,
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
            },
          },
        },
      },
    },
  });

  if (!project) {
    createBadRequestError("پروژه یافت نشد", 404);
  }

  const isSingle = project.mode === "SINGLE";
  const isStep = project.mode === "MULTI";

  let selectedGoals = [];
  let formPrompts = [];
  let readableFormResponses = {};
  let sourceProjectsContext = [];

  const staticContext = {
    companyProfile: project.company?.profile || {},
    adminData: project.company?.adminData?.data || null,
  };

  if (isSingle) {
    if (
      project.formId &&
      project.formResponses &&
      Object.keys(project.formResponses).length > 0
    ) {
      const formQuestions = await prisma.formQuestion.findMany({
        where: {
          formId: project.formId,
        },
        select: {
          id: true,
          label: true,
        },
      });

      const idToLabelMap = {};
      formQuestions.forEach((q) => {
        idToLabelMap[q.id] = q.label;
      });

      readableFormResponses = Object.keys(project.formResponses).reduce(
        (acc, key) => {
          acc[idToLabelMap[key] || key] = project.formResponses[key];
          return acc;
        },
        {},
      );
    }

    if (project.formId) {
      formPrompts = await getPublishedPromptContentsForAnalysisForm(
        project.formId,
      );
    }

    selectedGoals = project.goals.map((g) => g.goal.title);
  }

  if (isStep) {
    if (project.multiAnalysisFormId) {
      formPrompts = await getPublishedPromptContentsForMultiAnalysisForm(
        project.multiAnalysisFormId,
      );
    }

    selectedGoals = project.multiGoals.map((g) => g.goal.title);

    for (const item of project.selectedSourceProjects) {
      const sourceProject = item.sourceProject;
      let sourceReadableResponses = {};

      if (
        sourceProject?.formId &&
        sourceProject?.formResponses &&
        Object.keys(sourceProject.formResponses).length > 0
      ) {
        const sourceQuestions = await prisma.formQuestion.findMany({
          where: {
            formId: sourceProject.formId,
          },
          select: {
            id: true,
            label: true,
          },
        });

        const sourceQuestionMap = {};
        sourceQuestions.forEach((q) => {
          sourceQuestionMap[q.id] = q.label;
        });

        sourceReadableResponses = Object.keys(
          sourceProject.formResponses || {},
        ).reduce((acc, key) => {
          acc[sourceQuestionMap[key] || key] = sourceProject.formResponses[key];
          return acc;
        }, {});
      }

      sourceProjectsContext.push({
        requiredFormId: item.formId,
        requiredFormTitle:
          item.form?.title || sourceProject?.form?.title || "فرم نامشخص",
        sourceProjectId: sourceProject?.id,
        sourceProjectTitle: sourceProject?.title,
        sourceProjectStatus: sourceProject?.status,
        sourceGoals: sourceProject?.goals?.map((g) => g.goal.title) || [],
        formResponses: sourceReadableResponses,
        initialAnalysis: sourceProject?.initialAnalysis || null,
        riskAnalysis: sourceProject?.riskAnalysis || null,
        finalAnalysis: sourceProject?.finalAnalysis || null,
        chatHistory:
          sourceProject?.chatMessages?.map((m) => ({
            role: m.role,
            content: m.content,
          })) || [],
      });
    }
  }

  const chatHistory = project.chatMessages
    .filter((msg) => msg.role !== "system")
    .map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

  const { isUnderstood, nextStatus, transitionReason } = resolveNextProjectStep(
    {
      currentStatus: project.status,
      userInput,
      understood,
    },
  );

  let sourceProjectsFinalAnalyses = [];

  if (isStep) {
    sourceProjectsFinalAnalyses = sourceProjectsContext
      .filter((item) => item.finalAnalysis && item.finalAnalysis.trim())
      .map((item) => ({
        requiredFormId: item.requiredFormId,
        requiredFormTitle: item.requiredFormTitle,
        sourceProjectId: item.sourceProjectId,
        sourceProjectTitle: item.sourceProjectTitle,
        finalAnalysis: item.finalAnalysis,
      }));
  }
  const prompt = buildWorkflowPrompt({
    staticContext,
    formPrompts,
    readableFormResponses,
    selectedGoals,
    chatHistory,
    userInput,
    isStep,
    sourceProjectsFinalAnalyses,
  });

  try {
    const now = new Date();

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

    const aiResponse = await runAI({
      system: "",
      user: prompt,
      temperature: 0.7,
      max_tokens: 2000,
    });

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
    } else if (project.status === "REVIEWING" && nextStatus === "CHAT_MODE") {
      updateData.status = "CHAT_MODE";
      updateData.chatModeStartedAt = project.chatModeStartedAt || now;
      updateData.chatModeEndedAt = null;
    } else if (project.status === "CHAT_MODE" && isUnderstood) {
      updateData.status = "RISK_ANALYSIS";
      updateData.riskAnalysis = aiResponse;
      updateData.chatModeEndedAt = now;
    } else if (project.status === "CHAT_MODE" && !isUnderstood) {
      updateData.status = "CHAT_MODE";
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
      where: {
        id: projectId,
      },
      data: updateData,
    });

    return {
      success: true,
      aiResponse,
      newStatus: updateData.status,
      transitionReason,
    };
  } catch (error) {
    console.error("Error in handleConversationStep:", error);
    error;
  }
};

const createForm = async (data) => {
  return createWithQuestions(data);
};

const updateAnalysisFormService = async ({
  id,
  questions,
  goals,
  promptDefinition,
  ...rest
}) => {
  // ۱. بررسی وجود فرم
  const existingForm = await prisma.analysisForm.findUnique({
    where: { id },
  });

  if (!existingForm) {
    createBadRequestError("فرم تحلیل یافت نشد", 404);
  }

  // ۲. اجرای تراکنش برای آپدیت اطلاعات پایه و جایگزینی کامل زیرمجموعه‌ها
  return await prisma.$transaction(async (tx) => {
    // پاکسازی رکوردهای قبلی برای جایگزینی
    if (questions) {
      await tx.analysisFormQuestion.deleteMany({
        where: { analysisFormId: id },
      });
    }
    if (goals) {
      await tx.analysisFormGoal.deleteMany({ where: { analysisFormId: id } });
    }
    // توجه: اگر promptDefinition را هم آپدیت می‌کنید، ابتدا باید سگمنت‌های قبلی پاک شوند
    if (promptDefinition) {
      const existingDef = await tx.promptDefinition.findFirst({
        where: { analysisFormId: id },
      });
      if (existingDef) {
        await tx.promptSegmentDefinition.deleteMany({
          where: { promptDefinitionId: existingDef.id },
        });
      }
    }

    // ۳. آپدیت فرم و درج رکوردهای جدید
    return await tx.analysisForm.update({
      where: { id },
      data: {
        ...rest,
        ...(questions
          ? {
              questions: {
                create: questions.map((q) => ({
                  label: q.label,
                  type: q.type,
                  options: q.options || null,
                  required: q.required ?? true,
                  order: q.order,
                })),
              },
            }
          : {}),
        ...(goals
          ? {
              goals: {
                create: goals.map((g) => ({ title: g.title })),
              },
            }
          : {}),
        ...(promptDefinition
          ? {
              promptDefinition: {
                update: {
                  // فرض بر این است که promptDefinition قبلاً ساخته شده
                  segments: {
                    create: (promptDefinition.segments || []).map((s) => ({
                      key: s.key,
                      label: s.label,
                      sortOrder: s.sortOrder,
                      description: s.description || null,
                      isRequired: s.isRequired ?? true,
                    })),
                  },
                },
              },
            }
          : {}),
      },
      include: {
        questions: true,
        goals: true,
        promptDefinition: {
          include: {
            segments: { orderBy: { sortOrder: "asc" } },
            versions: true,
          },
        },
      },
    });
  });
};

const createPromptVersionForAnalysisForm = async (analysisFormId, data) => {
  const { versionKey = null, status = "DRAFT", values = [] } = data;

  return prisma.$transaction(async (tx) => {
    const form = await tx.analysisForm.findUnique({
      where: { id: analysisFormId },
      include: {
        promptDefinition: {
          include: {
            segments: {
              orderBy: { sortOrder: "asc" },
            },
            versions: true,
          },
        },
      },
    });

    if (!form) {
      createBadRequestError("Analysis form not found", 404);
    }

    if (!form.promptDefinition) {
      createBadRequestError("This analysis form has no prompt definition");
    }

    const promptDefinition = form.promptDefinition;
    const segments = promptDefinition.segments;

    if (!segments.length) {
      createBadRequestError("Prompt definition has no segments");
    }

    const segmentMap = new Map(segments.map((s) => [s.key, s]));

    const nextVersionNumber =
      promptDefinition.versions.length > 0
        ? Math.max(...promptDefinition.versions.map((v) => v.versionNumber)) + 1
        : 1;

    const providedKeys = values.map((v) => v.segmentKey);
    const duplicateKeys = providedKeys.filter(
      (key, index) => providedKeys.indexOf(key) !== index,
    );

    if (duplicateKeys.length > 0) {
      createBadRequestError(
        400,
        `Duplicate segment keys in values: ${[...new Set(duplicateKeys)].join(", ")}`,
      );
    }

    for (const value of values) {
      if (!segmentMap.has(value.segmentKey)) {
        createBadRequestError(400, `Invalid segmentKey: ${value.segmentKey}`);
      }
    }

    const requiredSegments = segments.filter((s) => s.isRequired);
    for (const segment of requiredSegments) {
      const found = values.find((v) => v.segmentKey === segment.key);
      if (!found || !found.content || !found.content.trim()) {
        createBadRequestError(
          400,
          `Missing required content for segment: ${segment.key}`,
        );
      }
    }

    if (status === "PUBLISHED") {
      await tx.promptVersion.updateMany({
        where: {
          promptDefinitionId: promptDefinition.id,
          status: "PUBLISHED",
        },
        data: {
          status: "ARCHIVED",
        },
      });
    }

    const createdVersion = await tx.promptVersion.create({
      data: {
        promptDefinitionId: promptDefinition.id,
        versionNumber: nextVersionNumber,
        versionKey,
        status,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
        segmentValues: {
          create: values.map((v) => {
            const segment = segmentMap.get(v.segmentKey);
            return {
              segmentDefinitionId: segment.id,
              content: v.content,
            };
          }),
        },
      },
      include: {
        promptDefinition: true,
        segmentValues: {
          include: {
            segmentDefinition: true,
          },
        },
      },
    });

    return createdVersion;
  });
};

const updatePromptVersionForAnalysisForm = async (
  analysisFormId,
  versionId,
  data,
) => {
  const { versionKey = null, values = [] } = data;

  if (!analysisFormId) {
    createBadRequestError("آیدی فرم ارسال نشده");
  }

  if (!versionId) {
    createBadRequestError("آیدی نسخه پرامپت ارسال نشده");
  }

  return prisma.$transaction(async (tx) => {
    const form = await tx.analysisForm.findUnique({
      where: { id: analysisFormId },
      include: {
        promptDefinition: {
          include: {
            segments: {
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    });

    if (!form) {
      createBadRequestError("فرم تحلیل پیدا نشد", 404);
    }

    if (!form.promptDefinition) {
      createBadRequestError("برای این فرم، ساختار پرامپت تعریف نشده است", 400);
    }

    const promptDefinition = form.promptDefinition;
    const segments = promptDefinition.segments;

    const version = await tx.promptVersion.findFirst({
      where: {
        id: versionId,
        promptDefinitionId: promptDefinition.id,
      },
      include: {
        segmentValues: true,
      },
    });

    if (!version) {
      createBadRequestError("نسخه پرامپت پیدا نشد", 404);
    }

    if (version.status !== "DRAFT") {
      createBadRequestError("فقط نسخه‌های DRAFT قابل ویرایش هستند", 400);
    }

    if (!segments.length) {
      createBadRequestError(
        "هیچ segmentی برای این prompt definition تعریف نشده",
        400,
      );
    }

    const segmentMap = new Map(segments.map((s) => [s.key, s]));
    const providedKeys = values.map((v) => v.segmentKey);

    const duplicateKeys = providedKeys.filter(
      (key, index) => providedKeys.indexOf(key) !== index,
    );

    if (duplicateKeys.length > 0) {
      createBadRequestError(
        `segmentKey تکراری ارسال شده: ${[...new Set(duplicateKeys)].join(", ")}`,
      );
    }

    for (const value of values) {
      if (!segmentMap.has(value.segmentKey)) {
        createBadRequestError(`segmentKey نامعتبر است: ${value.segmentKey}`);
      }
    }

    const requiredSegments = segments.filter((s) => s.isRequired);

    for (const segment of requiredSegments) {
      const found = values.find((v) => v.segmentKey === segment.key);
      if (!found || !found.content || !found.content.trim()) {
        createBadRequestError(
          `مقدار segment اجباری ارسال نشده است: ${segment.key}`,
        );
      }
    }

    await tx.promptVersionSegmentValue.deleteMany({
      where: {
        promptVersionId: version.id,
      },
    });

    await tx.promptVersion.update({
      where: { id: version.id },
      data: {
        versionKey,
      },
    });

    if (values.length > 0) {
      await tx.promptVersionSegmentValue.createMany({
        data: values.map((v) => ({
          promptVersionId: version.id,
          segmentDefinitionId: segmentMap.get(v.segmentKey).id,
          content: v.content,
        })),
      });
    }

    return tx.promptVersion.findUnique({
      where: { id: version.id },
      include: {
        segmentValues: {
          include: {
            segmentDefinition: true,
          },
          orderBy: {
            segmentDefinition: {
              sortOrder: "asc",
            },
          },
        },
      },
    });
  });
};

const publishPromptVersionForAnalysisForm = async (
  analysisFormId,
  versionId,
) => {
  if (!analysisFormId) {
    createBadRequestError("آیدی فرم ارسال نشده");
  }

  if (!versionId) {
    createBadRequestError("آیدی نسخه پرامپت ارسال نشده");
  }

  return prisma.$transaction(async (tx) => {
    const form = await tx.analysisForm.findUnique({
      where: { id: analysisFormId },
      include: {
        promptDefinition: {
          include: {
            segments: true,
          },
        },
      },
    });

    if (!form) {
      createBadRequestError("فرم تحلیل پیدا نشد", 404);
    }

    if (!form.promptDefinition) {
      createBadRequestError("برای این فرم، prompt definition وجود ندارد", 400);
    }

    const promptDefinition = form.promptDefinition;

    const version = await tx.promptVersion.findFirst({
      where: {
        id: versionId,
        promptDefinitionId: promptDefinition.id,
      },
      include: {
        segmentValues: {
          include: {
            segmentDefinition: true,
          },
        },
      },
    });

    if (!version) {
      createBadRequestError("نسخه پرامپت پیدا نشد", 404);
    }

    const requiredSegments = promptDefinition.segments.filter(
      (s) => s.isRequired,
    );

    for (const segment of requiredSegments) {
      const found = version.segmentValues.find(
        (v) => v.segmentDefinitionId === segment.id,
      );

      if (!found || !found.content || !found.content.trim()) {
        createBadRequestError(
          `این نسخه قابل انتشار نیست. segment اجباری بدون مقدار است: ${segment.key}`,
        );
      }
    }

    await tx.promptVersion.updateMany({
      where: {
        promptDefinitionId: promptDefinition.id,
        status: "PUBLISHED",
      },
      data: {
        status: "ARCHIVED",
      },
    });

    await tx.promptVersion.update({
      where: { id: version.id },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });

    return tx.promptVersion.findUnique({
      where: { id: version.id },
      include: {
        segmentValues: {
          include: {
            segmentDefinition: true,
          },
          orderBy: {
            segmentDefinition: {
              sortOrder: "asc",
            },
          },
        },
      },
    });
  });
};

const updatePromptDefinitionForAnalysisForm = async (analysisFormId, data) => {
  const { segments = [] } = data;

  if (!analysisFormId) {
    createBadRequestError("آیدی فرم ارسال نشده");
  }

  if (!Array.isArray(segments) || segments.length === 0) {
    createBadRequestError("segments باید یک آرایه غیرخالی باشد");
  }

  return prisma.$transaction(async (tx) => {
    const form = await tx.analysisForm.findUnique({
      where: { id: analysisFormId },
      include: {
        promptDefinition: {
          include: {
            segments: true,
            versions: true,
          },
        },
      },
    });

    if (!form) {
      createBadRequestError("فرم تحلیل پیدا نشد", 404);
    }

    if (!form.promptDefinition) {
      createBadRequestError("برای این فرم، prompt definition وجود ندارد", 400);
    }

    const promptDefinition = form.promptDefinition;

    const hasPublishedVersion = promptDefinition.versions.some(
      (v) => v.status === "PUBLISHED",
    );

    if (hasPublishedVersion) {
      createBadRequestError(
        "بعد از انتشار نسخه پرامپت، ویرایش ساختار prompt مجاز نیست",
        400,
      );
    }

    const keys = segments.map((s) => s.key);
    const duplicateKeys = keys.filter(
      (key, index) => keys.indexOf(key) !== index,
    );

    if (duplicateKeys.length > 0) {
      createBadRequestError(
        `کلید segment تکراری است: ${[...new Set(duplicateKeys)].join(", ")}`,
      );
    }

    await tx.promptSegmentDefinition.deleteMany({
      where: {
        promptDefinitionId: promptDefinition.id,
      },
    });

    await tx.promptSegmentDefinition.createMany({
      data: segments.map((segment) => ({
        promptDefinitionId: promptDefinition.id,
        key: segment.key,
        label: segment.label,
        description: segment.description || null,
        sortOrder: segment.sortOrder,
        isRequired: segment.isRequired ?? true,
      })),
    });

    return tx.promptDefinition.findUnique({
      where: { id: promptDefinition.id },
      include: {
        segments: {
          orderBy: {
            sortOrder: "asc",
          },
        },
        versions: {
          orderBy: {
            versionNumber: "desc",
          },
        },
      },
    });
  });
};

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
  search = String(search || "").trim();

  if (Number.isNaN(page) || page < 1) page = 1;
  if (Number.isNaN(limit) || limit < 1 || limit > 100) limit = 10;

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

const createMultiAnalysisFormService = async ({
  title,
  description,
  isActive = true,
  order,
  requiredForms = [],
  goals = [],
  promptDefinition,
}) => {
  if (!title?.trim()) {
    createBadRequestError("عنوان تحلیل چندمرحله‌ای الزامی است");
  }

  // requiredForms validation
  if (!Array.isArray(requiredForms) || requiredForms.length === 0) {
    createBadRequestError(
      "حداقل یک فرم برای تحلیل چندمرحله‌ای باید انتخاب شود",
    );
  }

  const requiredFormIds = requiredForms
    .map((item) => item.formId)
    .filter(Boolean);

  if (requiredFormIds.length !== requiredForms.length) {
    createBadRequestError("برای همه requiredForms مقدار formId الزامی است");
  }

  const uniqueRequiredFormIds = new Set(requiredFormIds);
  if (requiredFormIds.length !== uniqueRequiredFormIds.size) {
    createBadRequestError("فرم تکراری در requiredForms مجاز نیست");
  }

  // check forms exist
  const existingAnalysisForms = await prisma.analysisForm.findMany({
    where: { id: { in: requiredFormIds } },
    select: { id: true },
  });

  if (existingAnalysisForms.length !== requiredFormIds.length) {
    createBadRequestError("یک یا چند فرم تحلیل انتخاب‌شده یافت نشد", 404);
  }

  // goals validation (MultiAnalysisGoal فقط title دارد)
  if (goals && !Array.isArray(goals)) {
    createBadRequestError("goals باید آرایه باشد");
  }

  for (const goal of goals) {
    if (!goal?.title?.trim()) {
      createBadRequestError("عنوان goal الزامی است");
    }
  }

  // جلوگیری از تکرار title در goals (در schema هم unique است)
  const goalTitles = (goals || []).map((g) => g.title.trim());
  const uniqueGoalTitles = new Set(goalTitles);
  if (goalTitles.length !== uniqueGoalTitles.size) {
    createBadRequestError("عنوان goal تکراری مجاز نیست");
  }

  // promptDefinition validation + normalize segment.sortOrder
  let normalizedSegments = null;

  if (promptDefinition) {
    if (
      !Array.isArray(promptDefinition.segments) ||
      promptDefinition.segments.length === 0
    ) {
      createBadRequestError(
        "promptDefinition باید حداقل یک segment داشته باشد",
      );
    }

    normalizedSegments = promptDefinition.segments.map((segment, index) => {
      const key = segment.key?.trim();
      const label = segment.label?.trim();

      // در ورودی ممکن است order یا sortOrder بیاید، ولی در DB باید sortOrder ذخیره شود
      const sortOrder =
        typeof segment.sortOrder === "number"
          ? segment.sortOrder
          : typeof segment.order === "number"
            ? segment.order
            : null;

      if (!key) createBadRequestError("key برای همه segmentها الزامی است");
      if (!label) createBadRequestError("label برای همه segmentها الزامی است");
      if (typeof sortOrder !== "number") {
        createBadRequestError(
          "sortOrder (یا order) برای همه segmentها باید عدد باشد",
        );
      }

      return {
        key,
        label,
        description: segment.description?.trim() || null,
        sortOrder,
        isRequired: segment.isRequired ?? true,
        _index: index,
      };
    });

    // unique key
    const segmentKeys = normalizedSegments.map((s) => s.key);
    const uniqueSegmentKeys = new Set(segmentKeys);
    if (segmentKeys.length !== uniqueSegmentKeys.size) {
      createBadRequestError(
        "key تکراری در promptDefinition.segments مجاز نیست",
      );
    }

    // unique sortOrder (در schema هم unique است)
    const segmentSortOrders = normalizedSegments.map((s) => s.sortOrder);
    const uniqueSegmentSortOrders = new Set(segmentSortOrders);
    if (segmentSortOrders.length !== uniqueSegmentSortOrders.size) {
      createBadRequestError(
        "sortOrder تکراری در promptDefinition.segments مجاز نیست",
      );
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const createdMultiAnalysisForm = await tx.multiAnalysisForm.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        isActive: isActive ?? true,
        order: typeof order === "number" ? order : null, // چون در schema Int? هست

        requiredForms: {
          create: requiredForms.map((item, index) => ({
            formId: item.formId,
            order:
              typeof item.order === "number"
                ? item.order
                : typeof item.sortOrder === "number"
                  ? item.sortOrder
                  : index + 1, // fallback
          })),
        },

        goals: {
          create: (goals || []).map((goal) => ({
            title: goal.title.trim(),
          })),
        },
      },
    });

    if (promptDefinition) {
      const createdPromptDefinition = await tx.promptDefinition.create({
        data: {
          ownerType: "MULTI_ANALYSIS_FORM",
          multiAnalysisFormId: createdMultiAnalysisForm.id,
        },
      });

      // create segments مطابق schema: sortOrder
      for (const seg of normalizedSegments) {
        await tx.promptSegmentDefinition.create({
          data: {
            promptDefinitionId: createdPromptDefinition.id,
            key: seg.key,
            label: seg.label,
            description: seg.description,
            sortOrder: seg.sortOrder,
            isRequired: seg.isRequired,
          },
        });
      }
    }

    const finalResult = await tx.multiAnalysisForm.findUnique({
      where: { id: createdMultiAnalysisForm.id },
      include: {
        requiredForms: {
          include: { form: true },
          orderBy: { order: "asc" },
        },
        goals: {
          orderBy: { createdAt: "asc" },
        },
        promptDefinition: {
          include: {
            segments: {
              orderBy: { sortOrder: "asc" }, // مطابق schema
            },
            versions: {
              include: {
                segmentValues: {
                  include: { segmentDefinition: true },
                },
              },
              orderBy: { versionNumber: "desc" },
            },
          },
        },
      },
    });

    return finalResult;
  });

  return result;
};

const updateMultiAnalysisFormService = async ({
  id,
  title,
  description,
  goals,
}) => {
  if (!id) {
    createBadRequestError("شناسه تحلیل چندمرحله‌ای الزامی است");
  }

  const existingMultiAnalysisForm = await prisma.multiAnalysisForm.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existingMultiAnalysisForm) {
    createBadRequestError("تحلیل چندمرحله‌ای یافت نشد", 404);
  }

  const updateData = {};

  if (title !== undefined) {
    if (!title?.trim()) {
      createBadRequestError("عنوان تحلیل چندمرحله‌ای نمی‌تواند خالی باشد");
    }

    updateData.title = title.trim();
  }

  if (description !== undefined) {
    updateData.description = description?.trim() || null;
  }

  if (goals !== undefined) {
    if (!Array.isArray(goals)) {
      createBadRequestError("goals باید آرایه باشد");
    }

    for (const goal of goals) {
      if (!goal?.title?.trim()) {
        createBadRequestError("عنوان goal الزامی است");
      }
    }

    const goalTitles = goals.map((g) => g.title.trim());
    const uniqueGoalTitles = new Set(goalTitles);

    if (goalTitles.length !== uniqueGoalTitles.size) {
      createBadRequestError("عنوان goal تکراری مجاز نیست");
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.multiAnalysisForm.update({
      where: { id },
      data: updateData,
    });

    if (goals !== undefined) {
      await tx.multiAnalysisGoal.deleteMany({
        where: {
          multiAnalysisFormId: id,
        },
      });

      if (goals.length > 0) {
        await tx.multiAnalysisGoal.createMany({
          data: goals.map((goal) => ({
            multiAnalysisFormId: id,
            title: goal.title.trim(),
          })),
        });
      }
    }

    return tx.multiAnalysisForm.findUnique({
      where: { id },
      include: {
        requiredForms: {
          include: {
            form: true,
          },
          orderBy: {
            order: "asc",
          },
        },
        goals: {
          orderBy: {
            createdAt: "asc",
          },
        },
        promptDefinition: {
          include: {
            segments: {
              orderBy: {
                sortOrder: "asc",
              },
            },
            versions: {
              include: {
                segmentValues: {
                  include: {
                    segmentDefinition: true,
                  },
                },
              },
              orderBy: {
                versionNumber: "desc",
              },
            },
          },
        },
      },
    });
  });

  return result;
};

const createPromptVersionForMultiAnalysisForm = async ({
  multiAnalysisFormId,
  versionKey,
  status = "DRAFT",
  segmentValues,
}) => {
  const multiAnalysisForm = await prisma.multiAnalysisForm.findUnique({
    where: { id: multiAnalysisFormId },
    select: { id: true, title: true },
  });

  if (!multiAnalysisForm) {
    createBadRequestError("فرم تحلیل چندمرحله‌ای موردنظر یافت نشد", 404);
  }

  const promptDefinition = await prisma.promptDefinition.findFirst({
    where: {
      ownerType: "MULTI_ANALYSIS_FORM",
      multiAnalysisFormId,
    },
    include: {
      segments: {
        orderBy: { sortOrder: "asc" },
      },
      versions: {
        select: {
          id: true,
          versionNumber: true,
          status: true,
        },
        orderBy: {
          versionNumber: "desc",
        },
      },
    },
  });

  if (!promptDefinition) {
    createBadRequestError(
      "برای این فرم تحلیل چندمرحله‌ای هنوز promptDefinition تعریف نشده است",
    );
  }

  const segments = promptDefinition.segments || [];

  if (!segments.length) {
    createBadRequestError(
      "promptDefinition این فرم هیچ segmentی ندارد و امکان ساخت نسخه جدید وجود ندارد",
    );
  }

  const providedValues = segmentValues || [];

  const providedKeys = providedValues
    .map((item) => item.segmentKey?.trim())
    .filter(Boolean);
  const uniqueProvidedKeys = new Set(providedKeys);

  if (providedKeys.length !== uniqueProvidedKeys.size) {
    createBadRequestError("segmentKey تکراری در segmentValues مجاز نیست");
  }

  const segmentMap = new Map();
  for (const segment of segments) {
    segmentMap.set(segment.key, segment);
  }

  const invalidKeys = providedKeys.filter((key) => !segmentMap.has(key));

  if (invalidKeys.length) {
    createBadRequestError(
      `segmentKeyهای نامعتبر ارسال شده‌اند: ${invalidKeys.join(", ")}`,
    );
  }

  const requiredSegments = segments.filter((segment) => segment.isRequired);

  for (const requiredSegment of requiredSegments) {
    const relatedValue = providedValues.find(
      (item) => item.segmentKey === requiredSegment.key,
    );

    if (!relatedValue || !relatedValue.content?.trim()) {
      createBadRequestError(
        `مقدار segment الزامی "${requiredSegment.key}" ارسال نشده است`,
      );
    }
  }

  if (!["DRAFT", "PUBLISHED"].includes(status)) {
    createBadRequestError("status فقط می‌تواند DRAFT یا PUBLISHED باشد");
  }

  const latestVersionNumber = promptDefinition.versions[0]?.versionNumber || 0;
  const nextVersionNumber = latestVersionNumber + 1;

  const result = await prisma.$transaction(async (tx) => {
    if (status === "PUBLISHED") {
      await tx.promptVersion.updateMany({
        where: {
          promptDefinitionId: promptDefinition.id,
          status: "PUBLISHED",
        },
        data: {
          status: "ARCHIVED",
        },
      });
    }

    const createdVersion = await tx.promptVersion.create({
      data: {
        promptDefinitionId: promptDefinition.id,
        versionNumber: nextVersionNumber,
        versionKey: versionKey?.trim() || null,
        status,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
        segmentValues: {
          create: providedValues.map((item) => {
            const segment = segmentMap.get(item.segmentKey);

            return {
              segmentDefinitionId: segment.id,
              content: item.content.trim(),
            };
          }),
        },
      },
      include: {
        segmentValues: {
          include: {
            segmentDefinition: true,
          },
        },
      },
    });

    return createdVersion;
  });

  return result;
};

const updatePromptDefinitionForMultiAnalysisForm = async ({
  multiAnalysisFormId,
  segments,
}) => {
  if (!multiAnalysisFormId?.trim()) {
    createBadRequestError("شناسه فرم تحلیل چندمرحله‌ای الزامی است");
  }

  if (!Array.isArray(segments) || segments.length === 0) {
    createBadRequestError("حداقل یک segment باید ارسال شود");
  }

  const multiAnalysisForm = await prisma.multiAnalysisForm.findUnique({
    where: {
      id: multiAnalysisFormId,
    },
    select: {
      id: true,
    },
  });

  if (!multiAnalysisForm) {
    createBadRequestError("فرم تحلیل چندمرحله‌ای موردنظر یافت نشد", 404);
  }

  /**
   * Normalize + validate segments
   */
  const normalizedSegments = segments.map((segment) => {
    const key = segment.key?.trim();
    const label = segment.label?.trim();
    const description = segment.description?.trim() || null;

    const sortOrder =
      typeof segment.sortOrder === "number"
        ? segment.sortOrder
        : typeof segment.order === "number"
          ? segment.order
          : null;

    if (!key) {
      createBadRequestError("key برای همه segmentها الزامی است");
    }

    if (!label) {
      createBadRequestError(`label برای segment "${key}" الزامی است`);
    }

    if (typeof sortOrder !== "number") {
      createBadRequestError(
        `sortOrder یا order برای segment "${key}" باید عدد باشد`,
      );
    }

    return {
      key,
      label,
      description,
      sortOrder,
      isRequired: segment.isRequired ?? true,
    };
  });

  /**
   * Check duplicate keys
   */
  const segmentKeys = normalizedSegments.map((s) => s.key);
  const uniqueSegmentKeys = new Set(segmentKeys);

  if (segmentKeys.length !== uniqueSegmentKeys.size) {
    createBadRequestError("key تکراری در segments مجاز نیست");
  }

  /**
   * Check duplicate sortOrder
   */
  const segmentSortOrders = normalizedSegments.map((s) => s.sortOrder);
  const uniqueSegmentSortOrders = new Set(segmentSortOrders);

  if (segmentSortOrders.length !== uniqueSegmentSortOrders.size) {
    createBadRequestError("sortOrder تکراری در segments مجاز نیست");
  }

  const existingPromptDefinition = await prisma.promptDefinition.findFirst({
    where: {
      ownerType: "MULTI_ANALYSIS_FORM",
      multiAnalysisFormId,
    },
    include: {
      versions: {
        select: {
          id: true,
          status: true,
          versionNumber: true,
        },
      },
      segments: {
        select: {
          id: true,
          key: true,
          sortOrder: true,
        },
      },
    },
  });

  const hasPublishedVersion = existingPromptDefinition?.versions?.some(
    (version) => version.status === "PUBLISHED",
  );

  if (hasPublishedVersion) {
    createBadRequestError(
      "به دلیل وجود نسخه منتشرشده، تغییر ساختار promptDefinition مجاز نیست",
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    let promptDefinitionId = existingPromptDefinition?.id;

    if (!existingPromptDefinition) {
      const createdPromptDefinition = await tx.promptDefinition.create({
        data: {
          ownerType: "MULTI_ANALYSIS_FORM",
          multiAnalysisFormId,
        },
      });

      promptDefinitionId = createdPromptDefinition.id;
    } else {
      await tx.promptSegmentDefinition.deleteMany({
        where: {
          promptDefinitionId: existingPromptDefinition.id,
        },
      });
    }

    await tx.promptSegmentDefinition.createMany({
      data: normalizedSegments.map((segment) => ({
        promptDefinitionId,
        key: segment.key,
        label: segment.label,
        description: segment.description,
        sortOrder: segment.sortOrder,
        isRequired: segment.isRequired,
      })),
    });

    const updatedPromptDefinition = await tx.promptDefinition.findUnique({
      where: {
        id: promptDefinitionId,
      },
      include: {
        segments: {
          orderBy: {
            sortOrder: "asc",
          },
        },
        versions: {
          include: {
            segmentValues: {
              include: {
                segmentDefinition: true,
              },
            },
          },
          orderBy: {
            versionNumber: "desc",
          },
        },
      },
    });

    return updatedPromptDefinition;
  });

  return result;
};

const updatePromptVersionForMultiAnalysisForm = async ({
  multiAnalysisFormId,
  versionId,
  versionKey,
  segmentValues,
}) => {
  if (!multiAnalysisFormId?.trim()) {
    createBadRequestError("شناسه فرم تحلیل چندمرحله‌ای الزامی است");
  }

  if (!versionId?.trim()) {
    createBadRequestError("شناسه نسخه prompt الزامی است");
  }

  const promptVersion = await prisma.promptVersion.findFirst({
    where: {
      id: versionId,
      promptDefinition: {
        ownerType: "MULTI_ANALYSIS_FORM",
        multiAnalysisFormId,
      },
    },
    include: {
      promptDefinition: {
        include: {
          segments: {
            orderBy: {
              sortOrder: "asc",
            },
          },
        },
      },
      segmentValues: {
        include: {
          segmentDefinition: true,
        },
      },
    },
  });

  if (!promptVersion) {
    createBadRequestError(
      "نسخه prompt موردنظر برای این تحلیل چندمرحله‌ای یافت نشد",
      404,
    );
  }

  if (promptVersion.status !== "DRAFT") {
    createBadRequestError("فقط نسخه‌های DRAFT قابل ویرایش هستند");
  }

  const definitionSegments = promptVersion.promptDefinition.segments || [];

  if (!definitionSegments.length) {
    createBadRequestError("promptDefinition این فرم هیچ segmentی ندارد");
  }

  const shouldUpdateSegmentValues = typeof segmentValues !== "undefined";

  let normalizedSegmentValues = null;

  if (shouldUpdateSegmentValues) {
    if (!Array.isArray(segmentValues)) {
      createBadRequestError("segmentValues باید آرایه باشد");
    }

    const segmentMap = new Map();

    for (const segment of definitionSegments) {
      segmentMap.set(segment.key, segment);
    }

    normalizedSegmentValues = segmentValues.map((item) => {
      const segmentKey = item.segmentKey?.trim();
      const content = item.content?.trim();

      if (!segmentKey) {
        createBadRequestError("segmentKey برای همه segmentValues الزامی است");
      }

      if (!content) {
        createBadRequestError(
          `content برای segment "${segmentKey}" الزامی است`,
        );
      }

      return {
        segmentKey,
        content,
      };
    });

    const providedKeys = normalizedSegmentValues.map((item) => item.segmentKey);
    const uniqueProvidedKeys = new Set(providedKeys);

    if (providedKeys.length !== uniqueProvidedKeys.size) {
      createBadRequestError("segmentKey تکراری در segmentValues مجاز نیست");
    }

    const invalidKeys = providedKeys.filter((key) => !segmentMap.has(key));

    if (invalidKeys.length) {
      createBadRequestError(
        `segmentKeyهای نامعتبر ارسال شده‌اند: ${invalidKeys.join(", ")}`,
      );
    }

    const requiredSegments = definitionSegments.filter(
      (segment) => segment.isRequired,
    );

    for (const requiredSegment of requiredSegments) {
      const relatedValue = normalizedSegmentValues.find(
        (item) => item.segmentKey === requiredSegment.key,
      );

      if (!relatedValue || !relatedValue.content) {
        createBadRequestError(
          `مقدار segment الزامی "${requiredSegment.key}" ارسال نشده است`,
        );
      }
    }
  }

  const shouldUpdateVersionKey = typeof versionKey !== "undefined";
  const normalizedVersionKey = shouldUpdateVersionKey
    ? versionKey?.trim() || null
    : promptVersion.versionKey;

  if (!shouldUpdateVersionKey && !shouldUpdateSegmentValues) {
    createBadRequestError(
      "حداقل یکی از فیلدهای versionKey یا segmentValues باید ارسال شود",
    );
  }

  if (
    shouldUpdateVersionKey &&
    normalizedVersionKey &&
    normalizedVersionKey !== promptVersion.versionKey
  ) {
    const existingVersionWithSameKey = await prisma.promptVersion.findFirst({
      where: {
        promptDefinitionId: promptVersion.promptDefinitionId,
        versionKey: normalizedVersionKey,
        id: {
          not: promptVersion.id,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingVersionWithSameKey) {
      createBadRequestError("versionKey تکراری است");
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    if (shouldUpdateSegmentValues) {
      await tx.promptVersionSegmentValue.deleteMany({
        where: {
          promptVersionId: promptVersion.id,
        },
      });
    }

    const segmentMap = new Map();

    for (const segment of definitionSegments) {
      segmentMap.set(segment.key, segment);
    }

    const updatedVersion = await tx.promptVersion.update({
      where: {
        id: promptVersion.id,
      },
      data: {
        versionKey: normalizedVersionKey,

        ...(shouldUpdateSegmentValues
          ? {
              segmentValues: {
                create: normalizedSegmentValues.map((item) => {
                  const segment = segmentMap.get(item.segmentKey);

                  return {
                    segmentDefinitionId: segment.id,
                    content: item.content,
                  };
                }),
              },
            }
          : {}),
      },
      include: {
        promptDefinition: {
          include: {
            segments: {
              orderBy: {
                sortOrder: "asc",
              },
            },
          },
        },
        segmentValues: {
          include: {
            segmentDefinition: true,
          },
          orderBy: {
            segmentDefinition: {
              sortOrder: "asc",
            },
          },
        },
      },
    });

    return updatedVersion;
  });

  return result;
};

const publishPromptVersionForMultiAnalysisForm = async ({
  multiAnalysisFormId,
  versionId,
}) => {
  const promptVersion = await prisma.promptVersion.findFirst({
    where: {
      id: versionId,
      promptDefinition: {
        ownerType: "MULTI_ANALYSIS_FORM",
        multiAnalysisFormId,
      },
    },
    include: {
      promptDefinition: true,
      segmentValues: {
        include: {
          segmentDefinition: true,
        },
      },
    },
  });

  if (!promptVersion) {
    createBadRequestError(
      "نسخه prompt موردنظر برای این تحلیل چندمرحله‌ای یافت نشد",
      404,
    );
  }

  if (!promptVersion.segmentValues.length) {
    createBadRequestError("نسخه prompt بدون segmentValue قابل انتشار نیست");
  }

  const requiredSegments = await prisma.promptSegmentDefinition.findMany({
    where: {
      promptDefinitionId: promptVersion.promptDefinitionId,
      isRequired: true,
    },
    select: {
      id: true,
      key: true,
    },
  });

  const existingSegmentValueIds = new Set(
    promptVersion.segmentValues.map((item) => item.segmentDefinitionId),
  );

  const missingRequiredSegments = requiredSegments.filter(
    (segment) => !existingSegmentValueIds.has(segment.id),
  );

  if (missingRequiredSegments.length) {
    createBadRequestError(
      `برخی segmentهای الزامی مقدار ندارند: ${missingRequiredSegments
        .map((item) => item.key)
        .join(", ")}`,
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.promptVersion.updateMany({
      where: {
        promptDefinitionId: promptVersion.promptDefinitionId,
        status: "PUBLISHED",
        id: {
          not: promptVersion.id,
        },
      },
      data: {
        status: "ARCHIVED",
      },
    });

    const publishedVersion = await tx.promptVersion.update({
      where: {
        id: promptVersion.id,
      },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
      include: {
        segmentValues: {
          include: {
            segmentDefinition: true,
          },
        },
      },
    });

    return publishedVersion;
  });

  return result;
};

module.exports = {
  createForm,
  deleteForm,
  getAllAnalysisFormsService,
  getAnalysisFormByIdService,
  getAnalysisModesService,
  submitFormAnswersService,
  handleConversationStepService,
  createPromptVersionForAnalysisForm,
  updatePromptVersionForAnalysisForm,
  publishPromptVersionForAnalysisForm,
  updatePromptDefinitionForAnalysisForm,
  createMultiAnalysisFormService,
  createPromptVersionForMultiAnalysisForm,
  updatePromptDefinitionForMultiAnalysisForm,
  updatePromptVersionForMultiAnalysisForm,
  publishPromptVersionForMultiAnalysisForm,
  updateAnalysisFormService,
  updateMultiAnalysisFormService,
};
