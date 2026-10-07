const prisma = require("../prismaClient");
const { createBadRequestError } = require("../utils");
const {
  buildFormattedResponses,
  flattenQuestions,
} = require("../utils/buildFormattedResponses");
const { aggregateSubmissions } = require("../utils/aggregateFormSubmissions");
const {
  buildAggregatePreviewResponse,
} = require("../utils/buildAggregatePreviewResponse");
const { startAnalysisProcessing } = require("./analysisProcessor.service");
const { assertFormInEnabledTier } = require("./companyAnalysisTierService");
const {
  getProjectForm,
} = require("./formCollaborationFormLoader");
const { getFormForUserService } = require("./submitFormAnalysisService");
const {
  parseInboxDirection,
  toCounterparty,
  mapProjectRef,
} = require("../utils/inboxItemMappers");
const {
  buildFormCollaborationInvitePayload,
  buildFormCollaborationResponseSubmittedPayload,
  FORM_COLLABORATION_ACTIVITY_ACTION,
  createNotification,
} = require("./notificationDispatchService");
const {
  shouldSkipCollaboratorActivityDedupe,
} = require("../utils/collaboratorActivityDedupe");

async function assertProjectForCollaboration(projectId, userId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      title: true,
      creatorId: true,
      companyId: true,
      status: true,
      mode: true,
      formId: true,
      multiAnalysisFormId: true,
    },
  });

  if (!project) {
    createBadRequestError("پروژه یافت نشد", 404);
  }

  if (project.status !== "WAITING_FOR_FORM") {
    createBadRequestError(
      "همکاری فرم فقط در وضعیت انتظار برای تکمیل فرم امکان‌پذیر است.",
      400,
    );
  }

  if (project.mode !== "SINGLE") {
    createBadRequestError(
      "همکاری فرم فعلاً فقط برای تحلیل تکی پشتیبانی می‌شود.",
      400,
    );
  }

  return project;
}

async function getOpenCollaboration(projectId) {
  return prisma.formCollaboration.findFirst({
    where: {
      projectId,
      status: "OPEN",
    },
    include: {
      responses: {
        include: {
          respondent: {
            select: { id: true, username: true },
          },
        },
      },
      delegations: {
        include: {
          assignee: { select: { id: true, username: true } },
          sender: { select: { id: true, username: true } },
        },
      },
    },
  });
}

const openFormCollaborationService = async (projectId, userId, body = {}) => {
  const project = await assertProjectForCollaboration(projectId, userId);

  if (project.creatorId !== userId) {
    createBadRequestError("فقط سازنده پروژه می‌تواند همکاری فرم را آغاز کند.", 403);
  }

  if (!project.companyId) {
    createBadRequestError("پروژه به شرکت متصل نیست.", 400);
  }

  const existing = await prisma.formCollaboration.findUnique({
    where: { projectId },
  });

  if (existing?.status === "OPEN") {
    const detail = await getCollaborationDetailService(projectId, userId);
    return { created: false, ...detail };
  }

  if (existing?.status === "APPLIED") {
    createBadRequestError("همکاری فرم این پروژه قبلاً اعمال شده است.", 409);
  }

  const { minSubmittedCount, requireAllDelegationsCompleted } = body;

  if (existing?.status === "CANCELLED") {
    await prisma.formCollaboration.update({
      where: { id: existing.id },
      data: {
        status: "OPEN",
        closedAt: null,
        appliedAt: null,
        appliedById: null,
        openedAt: new Date(),
        createdById: userId,
        minSubmittedCount:
          minSubmittedCount != null
            ? Number(minSubmittedCount)
            : existing.minSubmittedCount,
        requireAllDelegationsCompleted:
          requireAllDelegationsCompleted !== undefined
            ? Boolean(requireAllDelegationsCompleted)
            : existing.requireAllDelegationsCompleted,
      },
    });
  } else {
    await prisma.formCollaboration.create({
      data: {
        projectId,
        createdById: userId,
        status: "OPEN",
        minSubmittedCount:
          minSubmittedCount != null ? Number(minSubmittedCount) : null,
        requireAllDelegationsCompleted: Boolean(
          requireAllDelegationsCompleted,
        ),
      },
    });
  }

  const detail = await getCollaborationDetailService(projectId, userId);
  return { created: true, ...detail };
};

const getCollaborationDetailService = async (projectId, userId) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, creatorId: true, companyId: true, title: true },
  });

  if (!project) {
    createBadRequestError("پروژه یافت نشد", 404);
  }

  const collaboration = await prisma.formCollaboration.findUnique({
    where: { projectId },
    include: {
      responses: {
        include: {
          respondent: { select: { id: true, username: true } },
        },
        orderBy: { submittedAt: "desc" },
      },
      delegations: {
        include: {
          assignee: { select: { id: true, username: true } },
          sender: { select: { id: true, username: true } },
        },
      },
      createdBy: { select: { id: true, username: true } },
    },
  });

  if (!collaboration) {
    createBadRequestError("همکاری فرم برای این پروژه یافت نشد.", 404);
  }

  const isCreator = project.creatorId === userId;
  const isAssignee = collaboration.delegations.some(
    (item) => item.assigneeId === userId,
  );
  const hasResponse = collaboration.responses.some(
    (item) => item.respondentId === userId,
  );

  if (!isCreator && !isAssignee && !hasResponse) {
    createBadRequestError("دسترسی به همکاری فرم مجاز نیست.", 403);
  }

  return { project, collaboration };
};

async function validateAnswers(form, answers) {
  const { questionIdSet } = flattenQuestions(form.categories);
  const answerKeys = Object.keys(answers || {});
  const invalidAnswerKeys = answerKeys.filter((key) => !questionIdSet.has(key));

  if (invalidAnswerKeys.length > 0) {
    createBadRequestError("برخی پاسخ‌های ارسالی معتبر نیستند");
  }
}

function isDelegationAnswered(delegation, myResponse) {
  return (
    delegation?.status === "SUBMITTED" || myResponse?.status === "SUBMITTED"
  );
}

function resolveDelegationDisplayStatus({
  mode,
  delegationStatus,
  myResponse,
  collaborationStatus,
  projectStatus,
}) {
  if (delegationStatus === "CANCELLED") {
    return "CANCELLED";
  }

  if (delegationStatus === "EXPIRED") {
    return "EXPIRED";
  }

  if (mode === "READ_ONLY") {
    return delegationStatus === "VIEWED" ? "VIEWED" : "PENDING";
  }

  const answered =
    delegationStatus === "SUBMITTED" || myResponse?.status === "SUBMITTED";

  if (answered) {
    if (
      collaborationStatus !== "OPEN" ||
      projectStatus !== "WAITING_FOR_FORM"
    ) {
      return "CLOSED";
    }

    return "ANSWERED";
  }

  if (
    collaborationStatus !== "OPEN" ||
    projectStatus !== "WAITING_FOR_FORM"
  ) {
    return "CLOSED";
  }

  return "PENDING";
}

function resolveProjectAnalysisFormId(project) {
  return project?.formId || project?.multiAnalysisFormId || null;
}

function resolveInboxViewMode({
  mode,
  canSubmit,
  myResponse,
  readOnlyContent,
  displayStatus,
  viewerRole,
  hasFormSchema,
}) {
  if (displayStatus === "CLOSED" || displayStatus === "CANCELLED") {
    return "CLOSED";
  }

  if (mode === "READ_ONLY") {
    return "READ_ONLY_SNAPSHOT";
  }

  if (canSubmit) {
    return "EDIT";
  }

  if (myResponse?.status === "SUBMITTED") {
    return "SUBMITTED_READONLY";
  }

  if (viewerRole === "SENDER") {
    if (readOnlyContent || hasFormSchema || displayStatus === "PENDING") {
      return "READ_ONLY_SNAPSHOT";
    }
  }

  if (readOnlyContent || hasFormSchema) {
    return "READ_ONLY_SNAPSHOT";
  }

  return "CLOSED";
}

async function assertCanSubmitResponse(
  project,
  collaboration,
  userId,
  existingResponse,
) {
  if (collaboration.status !== "OPEN") {
    createBadRequestError("همکاری فرم بسته شده است.", 400);
  }

  if (existingResponse?.status === "SUBMITTED") {
    createBadRequestError(
      "پاسخ فرم قبلاً ثبت نهایی شده و قابل ویرایش نیست.",
      400,
    );
  }

  const isCreator = project.creatorId === userId;

  if (isCreator) {
    return;
  }

  const delegation = collaboration.delegations.find(
    (item) => item.assigneeId === userId,
  );

  if (!delegation || delegation.mode !== "FILL") {
    createBadRequestError("شما مجوز ثبت پاسخ برای این فرم را ندارید.", 403);
  }

  if (delegation.status === "CANCELLED" || delegation.status === "EXPIRED") {
    createBadRequestError("دعوتنامه فرم دیگر معتبر نیست.", 400);
  }

  if (isDelegationAnswered(delegation, existingResponse)) {
    createBadRequestError("پاسخ شما قبلاً ثبت شده و قابل ویرایش نیست.", 400);
  }
}

const submitMyCollaborationResponseService = async (
  projectId,
  userId,
  answers,
  { submit = true } = {},
) => {
  const project = await assertProjectForCollaboration(projectId, userId);

  const collaboration = await getOpenCollaboration(projectId);

  if (!collaboration) {
    createBadRequestError("همکاری فعال برای این پروژه یافت نشد.", 404);
  }

  const existingResponse = await prisma.formCollaborationResponse.findUnique({
    where: {
      collaborationId_respondentId: {
        collaborationId: collaboration.id,
        respondentId: userId,
      },
    },
    select: { id: true, status: true },
  });

  await assertCanSubmitResponse(
    project,
    collaboration,
    userId,
    existingResponse,
  );

  await assertFormInEnabledTier(project.companyId, {
    formId: project.formId,
    multiAnalysisFormId: project.multiAnalysisFormId,
  });

  const form = await getProjectForm(project);
  await validateAnswers(form, answers);

  const formattedResponses = buildFormattedResponses(form, answers, {
    keepInternalFields: true,
  });

  const status = submit ? "SUBMITTED" : "DRAFT";
  const submittedAt = submit ? new Date() : null;

  const response = await prisma.formCollaborationResponse.upsert({
    where: {
      collaborationId_respondentId: {
        collaborationId: collaboration.id,
        respondentId: userId,
      },
    },
    create: {
      collaborationId: collaboration.id,
      respondentId: userId,
      rawAnswers: answers,
      formattedResponses,
      status,
      submittedAt,
    },
    update: {
      rawAnswers: answers,
      formattedResponses,
      status,
      submittedAt,
    },
  });

  if (submit) {
    const delegation = collaboration.delegations.find(
      (item) => item.assigneeId === userId && item.mode === "FILL",
    );

    if (delegation) {
      await prisma.formCollaborationDelegation.update({
        where: { id: delegation.id },
        data: {
          linkedResponseId: response.id,
          status: "SUBMITTED",
        },
      });
    }

    const granterId = delegation?.senderId;
    if (granterId && granterId !== userId) {
      const respondent = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true },
      });

      const respondentUsername = respondent?.username || "همکار";
      const type = "FORM_COLLABORATION_RESPONSE_SUBMITTED";

      const skip = await shouldSkipCollaboratorActivityDedupe({
        recipientId: granterId,
        type,
        referenceId: project.id,
        actorUserId: userId,
        action: FORM_COLLABORATION_ACTIVITY_ACTION,
      });

      if (!skip) {
        await createNotification(
          buildFormCollaborationResponseSubmittedPayload({
            userId: granterId,
            projectId: project.id,
            projectTitle: project.title,
            assigneeUserId: userId,
            assigneeUsername: respondentUsername,
            collaborationId: collaboration.id,
            delegationId: delegation?.id,
          }),
        );
      }
    }
  }

  return { response, collaborationId: collaboration.id };
};

const createDelegationsService = async (
  projectId,
  userId,
  { assigneeIds, mode, message, dueAt, snapshotResponses },
) => {
  const project = await assertProjectForCollaboration(projectId, userId);

  if (project.creatorId !== userId) {
    createBadRequestError("فقط سازنده می‌تواند دعوتنامه ارسال کند.", 403);
  }

  const collaboration = await getOpenCollaboration(projectId);

  if (!collaboration) {
    createBadRequestError("ابتدا همکاری فرم را آغاز کنید.", 400);
  }

  if (!Array.isArray(assigneeIds) || !assigneeIds.length) {
    createBadRequestError("لیست اعضا الزامی است.", 400);
  }

  if (mode !== "FILL" && mode !== "READ_ONLY") {
    createBadRequestError("نوع دعوتنامه نامعتبر است.", 400);
  }

  const normalizedIds = [...new Set(assigneeIds.filter(Boolean))].filter(
    (id) => id !== userId,
  );

  const colleagues = await prisma.user.findMany({
    where: {
      id: { in: normalizedIds },
      companyId: project.companyId,
    },
    select: { id: true, username: true },
  });

  if (colleagues.length !== normalizedIds.length) {
    createBadRequestError("برخی کاربران عضو شرکت نیستند.", 400);
  }

  const senderName =
    (
      await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true },
      })
    )?.username || "همکار";

  const created = [];

  for (const colleague of colleagues) {
    const delegation = await prisma.formCollaborationDelegation.upsert({
      where: {
        collaborationId_assigneeId: {
          collaborationId: collaboration.id,
          assigneeId: colleague.id,
        },
      },
      create: {
        collaborationId: collaboration.id,
        assigneeId: colleague.id,
        senderId: userId,
        mode,
        status: "PENDING",
        snapshotResponses: mode === "READ_ONLY" ? snapshotResponses : null,
        message: message || null,
        dueAt: dueAt ? new Date(dueAt) : null,
      },
      update: {
        mode,
        status: "PENDING",
        snapshotResponses: mode === "READ_ONLY" ? snapshotResponses : null,
        message: message || null,
        dueAt: dueAt ? new Date(dueAt) : null,
        senderId: userId,
      },
    });

    created.push(delegation);

    await createNotification(
      buildFormCollaborationInvitePayload({
        userId: colleague.id,
        delegationId: delegation.id,
        projectId: project.id,
        projectTitle: project.title,
        mode,
        senderUsername: senderName,
      }),
    );
  }

  return { delegations: created };
};

const listFormDelegationInboxService = async (userId, query = {}) => {
  const { page = 1, limit = 10, search, mode, status } = query;
  const direction = parseInboxDirection(query);

  const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
  const parsedLimit = Math.max(parseInt(limit, 10) || 10, 1);
  const skip = (parsedPage - 1) * parsedLimit;

  const filters = [
    direction === "sent"
      ? { senderId: userId }
      : { assigneeId: userId },
  ];

  if (mode === "FILL" || mode === "READ_ONLY") {
    filters.push({ mode });
  }

  if (status) {
    filters.push({ status });
  }

  if (search) {
    filters.push({
      OR: [
        {
          collaboration: {
            project: {
              title: { contains: search },
            },
          },
        },
        ...(direction === "received"
          ? [{ sender: { username: { contains: search } } }]
          : [{ assignee: { username: { contains: search } } }]),
      ],
    });
  }

  const where = { AND: filters };

  const collaborationInclude = {
    project: {
      select: {
        id: true,
        title: true,
        status: true,
        formId: true,
        mode: true,
      },
    },
    ...(direction === "received"
      ? {
          responses: {
            where: { respondentId: userId },
            take: 1,
            select: {
              id: true,
              status: true,
              submittedAt: true,
            },
          },
        }
      : {}),
  };

  const [items, totalItems] = await Promise.all([
    prisma.formCollaborationDelegation.findMany({
      where,
      skip,
      take: parsedLimit,
      orderBy: { createdAt: "desc" },
      include: {
        sender: { select: { id: true, username: true } },
        assignee: { select: { id: true, username: true } },
        collaboration: {
          include: collaborationInclude,
        },
      },
    }),
    prisma.formCollaborationDelegation.count({ where }),
  ]);

  const enrichedItems = items.map((item) => {
    const myResponse =
      direction === "sent"
        ? null
        : item.collaboration.responses?.[0] ?? null;
    const { responses, ...collaborationWithoutResponses } = item.collaboration;

    const displayStatus = resolveDelegationDisplayStatus({
      mode: item.mode,
      delegationStatus: item.status,
      myResponse,
      collaborationStatus: item.collaboration.status,
      projectStatus: item.collaboration.project.status,
    });

    const projectRef = mapProjectRef(item.collaboration.project);
    const counterparty =
      direction === "received"
        ? toCounterparty(item.sender)
        : toCounterparty(item.assignee);

    return {
      id: item.id,
      direction,
      collaborationId: item.collaborationId,
      assigneeId: item.assigneeId,
      senderId: item.senderId,
      mode: item.mode,
      status: item.status,
      message: item.message,
      dueAt: item.dueAt,
      linkedResponseId: item.linkedResponseId,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      sender: item.sender,
      assignee: item.assignee,
      resource: projectRef,
      project: projectRef,
      counterparty,
      collaboration: collaborationWithoutResponses,
      responseStatus: myResponse?.status ?? null,
      submittedAt: myResponse?.submittedAt ?? null,
      displayStatus,
    };
  });

  if (direction === "sent") {
    const assigneeIds = [...new Set(items.map((i) => i.assigneeId))];
    if (assigneeIds.length) {
      const assigneeResponses = await prisma.formCollaborationResponse.findMany({
        where: {
          collaborationId: { in: items.map((i) => i.collaborationId) },
          respondentId: { in: assigneeIds },
        },
        select: {
          collaborationId: true,
          respondentId: true,
          status: true,
          submittedAt: true,
        },
      });
      const responseKey = (collaborationId, respondentId) =>
        `${collaborationId}:${respondentId}`;
      const responseMap = new Map(
        assigneeResponses.map((r) => [
          responseKey(r.collaborationId, r.respondentId),
          r,
        ]),
      );
      for (let i = 0; i < enrichedItems.length; i += 1) {
        const row = items[i];
        const resp = responseMap.get(
          `${row.collaborationId}:${row.assigneeId}`,
        );
        if (resp) {
          enrichedItems[i].responseStatus = resp.status;
          enrichedItems[i].submittedAt = resp.submittedAt;
        }
      }
    }
  }

  return {
    items: enrichedItems,
    pagination: {
      totalItems,
      currentPage: parsedPage,
      totalPages: Math.ceil(totalItems / parsedLimit),
      limit: parsedLimit,
    },
  };
};

const markDelegationViewedService = async (delegationId, userId) => {
  const { delegation } = await getFormDelegationInboxItemService(
    delegationId,
    userId,
    null,
    { markReadOnlyViewed: true, includeForm: false },
  );

  return delegation;
};

const getFormDelegationInboxItemService = async (
  delegationId,
  userId,
  companyId,
  options = {},
) => {
  const { markReadOnlyViewed = true, includeForm = true } = options;

  const delegationRecord = await prisma.formCollaborationDelegation.findUnique({
    where: { id: delegationId },
    include: {
      sender: { select: { id: true, username: true } },
      assignee: { select: { id: true, username: true } },
      collaboration: {
        select: {
          id: true,
          projectId: true,
          status: true,
          openedAt: true,
          appliedAt: true,
          project: {
            select: {
              id: true,
              title: true,
              status: true,
              formId: true,
              multiAnalysisFormId: true,
              mode: true,
              companyId: true,
              company: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  const isAssignee = delegationRecord?.assigneeId === userId;
  const isSender = delegationRecord?.senderId === userId;

  if (!delegationRecord || (!isAssignee && !isSender)) {
    createBadRequestError("دعوتنامه یافت نشد.", 404);
  }

  const project = delegationRecord.collaboration.project;

  if (project.companyId && companyId && project.companyId !== companyId) {
    createBadRequestError("دسترسی به این دعوتنامه مجاز نیست.", 403);
  }

  let delegationStatus = delegationRecord.status;

  if (
    isAssignee &&
    markReadOnlyViewed &&
    delegationRecord.mode === "READ_ONLY" &&
    delegationStatus === "PENDING"
  ) {
    await prisma.formCollaborationDelegation.update({
      where: { id: delegationId },
      data: { status: "VIEWED" },
    });
    delegationStatus = "VIEWED";
  }

  const collaboration = delegationRecord.collaboration;
  const collaborationOpen = collaboration.status === "OPEN";
  const projectWaitingForForm = project.status === "WAITING_FOR_FORM";
  const delegationActive =
    delegationStatus !== "CANCELLED" && delegationStatus !== "EXPIRED";

  const responseSelect = {
    id: true,
    status: true,
    rawAnswers: true,
    formattedResponses: true,
    submittedAt: true,
    updatedAt: true,
  };

  const assigneeResponse = await prisma.formCollaborationResponse.findUnique({
    where: {
      collaborationId_respondentId: {
        collaborationId: collaboration.id,
        respondentId: delegationRecord.assigneeId,
      },
    },
    select: responseSelect,
  });

  const senderResponse = isSender
    ? await prisma.formCollaborationResponse.findUnique({
        where: {
          collaborationId_respondentId: {
            collaborationId: collaboration.id,
            respondentId: delegationRecord.senderId,
          },
        },
        select: responseSelect,
      })
    : null;

  const myResponse = isAssignee ? assigneeResponse : null;
  const responseForStatus = isAssignee ? myResponse : assigneeResponse;

  const alreadyAnswered = isDelegationAnswered(
    delegationRecord,
    responseForStatus,
  );

  const canSubmit =
    isAssignee &&
    delegationRecord.mode === "FILL" &&
    collaborationOpen &&
    projectWaitingForForm &&
    delegationActive &&
    !alreadyAnswered;

  const canEditResponse = canSubmit;

  const displayStatus = resolveDelegationDisplayStatus({
    mode: delegationRecord.mode,
    delegationStatus,
    myResponse: responseForStatus,
    collaborationStatus: collaboration.status,
    projectStatus: project.status,
  });

  const readOnlyContent =
    delegationRecord.mode === "READ_ONLY"
      ? delegationRecord.snapshotResponses ?? null
      : null;

  const submittedView =
    delegationRecord.mode === "FILL" &&
    responseForStatus?.status === "SUBMITTED"
      ? {
          rawAnswers: responseForStatus.rawAnswers,
          formattedResponses: responseForStatus.formattedResponses,
          submittedAt: responseForStatus.submittedAt,
        }
      : null;

  const analysisFormId = resolveProjectAnalysisFormId(project);
  const viewerRole = isAssignee ? "ASSIGNEE" : "SENDER";
  const workflowOpenForFill =
    delegationRecord.mode === "FILL" &&
    collaborationOpen &&
    projectWaitingForForm &&
    delegationActive &&
    displayStatus !== "CLOSED";

  const shouldLoadFormForAssignee =
    includeForm &&
    isAssignee &&
    canSubmit &&
    analysisFormId &&
    companyId;

  const shouldLoadFormForSender =
    includeForm &&
    isSender &&
    workflowOpenForFill &&
    analysisFormId &&
    companyId;

  const shouldLoadForm = shouldLoadFormForAssignee || shouldLoadFormForSender;

  let form = null;
  if (shouldLoadForm) {
    try {
      form = await getFormForUserService(companyId, analysisFormId);
    } catch (error) {
      if (error.statusCode !== 404 && error.statusCode !== 403) {
        throw error;
      }
    }
  }

  const viewMode = resolveInboxViewMode({
    mode: delegationRecord.mode,
    canSubmit,
    myResponse: responseForStatus,
    readOnlyContent,
    displayStatus,
    viewerRole,
    hasFormSchema: Boolean(form),
  });

  const delegation = {
    id: delegationRecord.id,
    collaborationId: delegationRecord.collaborationId,
    assigneeId: delegationRecord.assigneeId,
    senderId: delegationRecord.senderId,
    mode: delegationRecord.mode,
    status: delegationStatus,
    message: delegationRecord.message,
    dueAt: delegationRecord.dueAt,
    linkedResponseId: delegationRecord.linkedResponseId,
    createdAt: delegationRecord.createdAt,
    updatedAt: delegationRecord.updatedAt,
    sender: delegationRecord.sender,
    assignee: delegationRecord.assignee,
  };

  const projectPayload = {
    id: project.id,
    title: project.title,
    status: project.status,
    mode: project.mode,
    formId: project.formId,
    multiAnalysisFormId: project.multiAnalysisFormId,
    analysisFormId,
    analysisTitle: form?.title ?? null,
    formTitle: form?.title ?? null,
    companyName: project.company?.name ?? null,
  };

  return {
    delegation,
    project: projectPayload,
    collaboration: {
      id: collaboration.id,
      projectId: collaboration.projectId,
      status: collaboration.status,
      openedAt: collaboration.openedAt,
      appliedAt: collaboration.appliedAt,
    },
    form,
    readOnlyContent,
    submittedView,
    myResponse: isAssignee ? myResponse : null,
    senderResponse: isSender ? senderResponse : undefined,
    assigneeResponse: isSender ? assigneeResponse : undefined,
    meta: {
      canSubmit,
      canEditResponse,
      displayStatus,
      viewMode,
      projectId: project.id,
      collaborationId: collaboration.id,
      formId: analysisFormId,
      responseStatus: responseForStatus?.status ?? null,
      viewerRole,
      readOnlySnapshotMissing:
        delegationRecord.mode === "READ_ONLY" && readOnlyContent == null,
      reasonsDisabled: canSubmit
        ? []
        : buildDelegationDisabledReasons({
            viewerRole,
            mode: delegationRecord.mode,
            collaborationOpen,
            projectWaitingForForm,
            delegationActive,
            hasFormId: Boolean(analysisFormId),
            alreadyAnswered,
          }),
    },
  };
};

function buildDelegationDisabledReasons({
  viewerRole,
  mode,
  collaborationOpen,
  projectWaitingForForm,
  delegationActive,
  hasFormId,
  alreadyAnswered,
}) {
  const reasons = [];

  if (viewerRole === "SENDER") {
    reasons.push("NOT_ASSIGNEE");
    return reasons;
  }

  if (mode !== "FILL") {
    reasons.push("NOT_FILL_MODE");
  }

  if (alreadyAnswered) {
    reasons.push("ALREADY_SUBMITTED");
  }

  if (!collaborationOpen) {
    reasons.push("COLLABORATION_NOT_OPEN");
  }

  if (!projectWaitingForForm) {
    reasons.push("PROJECT_NOT_WAITING_FOR_FORM");
  }

  if (!delegationActive) {
    reasons.push("DELEGATION_INACTIVE");
  }

  if (!hasFormId) {
    reasons.push("PROJECT_FORM_NOT_FOUND");
  }

  return reasons;
}

function buildSubmissionPool(collaboration) {
  return collaboration.responses
    .filter((item) => item.status === "SUBMITTED")
    .map((item) => ({
      respondentId: item.respondentId,
      displayName: item.respondent?.username || item.respondentId,
      rawAnswers: item.rawAnswers,
      formattedResponses: item.formattedResponses,
      submittedAt: item.submittedAt,
    }));
}

async function computeProjectAggregateResult(projectId, userId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      creatorId: true,
      companyId: true,
      mode: true,
      formId: true,
      multiAnalysisFormId: true,
    },
  });

  if (!project) {
    createBadRequestError("پروژه یافت نشد", 404);
  }

  if (project.creatorId !== userId) {
    createBadRequestError("فقط سازنده می‌تواند پیش‌نمایش تجمیع را ببیند.", 403);
  }

  const collaboration = await prisma.formCollaboration.findUnique({
    where: { projectId },
    include: {
      responses: {
        where: { status: "SUBMITTED" },
        include: {
          respondent: { select: { id: true, username: true } },
        },
      },
    },
  });

  if (!collaboration) {
    createBadRequestError("همکاری فرم یافت نشد.", 404);
  }

  const form = await getProjectForm(project);
  const submissions = buildSubmissionPool(collaboration);
  const aggregateResult = aggregateSubmissions(submissions, form);

  return {
    collaboration,
    form,
    aggregateResult,
  };
}

function buildCollaborationPreviewMeta(collaboration) {
  return {
    id: collaboration.id,
    status: collaboration.status,
    minSubmittedCount: collaboration.minSubmittedCount,
    requireAllDelegationsCompleted:
      collaboration.requireAllDelegationsCompleted,
  };
}

const getAggregatePreviewService = async (projectId, userId) => {
  const { collaboration, form, aggregateResult } =
    await computeProjectAggregateResult(projectId, userId);

  const previewPayload = buildAggregatePreviewResponse(aggregateResult);

  return {
    collaboration: buildCollaborationPreviewMeta(collaboration),
    ...previewPayload,
  };
};

function assertProductRulesForApply(collaboration, submissions) {
  if (
    collaboration.minSubmittedCount != null &&
    submissions.length < collaboration.minSubmittedCount
  ) {
    createBadRequestError(
      `حداقل ${collaboration.minSubmittedCount} پاسخ برای ادامه لازم است.`,
      400,
    );
  }

  if (collaboration.requireAllDelegationsCompleted) {
    const fillAssignees = collaboration.delegations.filter(
      (item) => item.mode === "FILL",
    );
    const submittedIds = new Set(submissions.map((item) => item.respondentId));

    const missing = fillAssignees.filter(
      (item) => !submittedIds.has(item.assigneeId),
    );

    if (missing.length > 0) {
      createBadRequestError(
        "همه دعوت‌شدگان FILL باید پاسخ خود را ثبت کنند.",
        400,
      );
    }
  }
}

const applyAggregatedFormService = async (projectId, userId) => {
  const project = await assertProjectForCollaboration(projectId, userId);

  if (project.creatorId !== userId) {
    createBadRequestError("فقط سازنده می‌تواند تجمیع را اعمال کند.", 403);
  }

  const collaboration = await prisma.formCollaboration.findUnique({
    where: { projectId },
    include: {
      responses: {
        where: { status: "SUBMITTED" },
        include: {
          respondent: { select: { id: true, username: true } },
        },
      },
      delegations: true,
    },
  });

  if (!collaboration || collaboration.status !== "OPEN") {
    createBadRequestError("همکاری فعال یافت نشد.", 400);
  }

  const form = await getProjectForm(project);
  const submissions = buildSubmissionPool(collaboration);

  assertProductRulesForApply(collaboration, submissions);

  const aggregateResult = aggregateSubmissions(submissions, form);

  const aggregatedFormResponses = aggregateResult.formResponses;

  const updatedProject = await prisma.project.update({
    where: { id: projectId },
    data: {
      formResponses: aggregatedFormResponses,
      status: "ANALYSIS_PENDING",
    },
    include: {
      company: {
        select: {
          companyAdminData: {
            select: { data: true },
          },
        },
      },
    },
  });

  await prisma.formCollaboration.update({
    where: { id: collaboration.id },
    data: {
      status: "APPLIED",
      appliedAt: new Date(),
      appliedById: userId,
      closedAt: new Date(),
    },
  });

  let queueResult = null;

  try {
    const queueUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, companyId: true },
    });

    queueResult = await startAnalysisProcessing({
      projectId,
      user: queueUser,
      userInput: "",
      understood: false,
      source: "formCollaborationService.applyAggregatedFormService",
    });
  } catch (error) {
    console.error("Failed to queue analysis after apply aggregated:", error);
    throw error;
  }

  return {
    project: updatedProject,
    aggregateResult: buildAggregatePreviewResponse(aggregateResult),
    jobId: queueResult?.jobId ?? null,
    status: queueResult?.status ?? "AI_PROCESSING",
  };
};

module.exports = {
  openFormCollaborationService,
  getCollaborationDetailService,
  submitMyCollaborationResponseService,
  createDelegationsService,
  listFormDelegationInboxService,
  getFormDelegationInboxItemService,
  markDelegationViewedService,
  getAggregatePreviewService,
  applyAggregatedFormService,
  assertCanSubmitResponse,
  buildSubmissionPool,
  resolveInboxViewMode,
  resolveProjectAnalysisFormId,
};
