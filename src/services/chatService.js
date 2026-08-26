const prisma = require("../prismaClient");
const { createBadRequestError } = require("../utils");
const axios = require("axios");
const { enqueueChatMessage, getChatJobById } = require("./chat.queue.service");

const enrichRecommendedAnalyses = async (responseData) => {
  const [forms, multiForms] = await Promise.all([
    prisma.analysisForm.findMany({
      select: {
        id: true,
        title: true,
      },
    }),
    prisma.multiAnalysisForm.findMany({
      select: {
        id: true,
        title: true,
      },
    }),
  ]);

  const formsMap = new Map(
    forms.map((form) => [form.title.trim().toLowerCase(), form]),
  );

  const multiFormsMap = new Map(
    multiForms.map((form) => [form.title.trim().toLowerCase(), form]),
  );

  const rawAnalyses = Array.isArray(responseData.recommendedAnalyses)
    ? responseData.recommendedAnalyses
    : [];

  const recommendedAnalyses = rawAnalyses.map((item) => {
    const normalizedTitle = item.title?.trim().toLowerCase();

    const multiForm = normalizedTitle
      ? multiFormsMap.get(normalizedTitle)
      : null;

    const form = normalizedTitle ? formsMap.get(normalizedTitle) : null;

    if (!multiForm && !form) {
      console.warn(`Analysis form not found for title: ${item.title}`);
    }

    return {
      ...item,
      analysisId: multiForm?.id ?? form?.id ?? null,
      type: multiForm ? 2 : form ? 1 : null,
    };
  });

  return {
    ...responseData,
    recommendedAnalyses,
  };
};

const processChatMessageService = async ({
  companyId,
  userId,
  userGoal,
  conversationId,
}) => {
  const company = await prisma.company.findUnique({
    where: {
      id: companyId,
    },
    select: {
      chatMessageLimit: true,
    },
  });

  if (!company) {
    throw createBadRequestError("Company not found", 404);
  }

  const payload = {
    organization_request_limit: company.chatMessageLimit,
    organization_id: companyId,
    user_id: userId,
    conversation_id: conversationId,
    user_goal: userGoal,
  };

  let response;

  try {
    response = await axios.post(
      "https://strategy.ratorai.com/ai/chatbot/chatbot",
      payload,
      {
        timeout: 300000,
      },
    );
  } catch (error) {
    if (error.response?.status === 400) {
      throw createBadRequestError(
        "تعداد درخواست های شما بیش از حد مجاز میباشد",
        400,
      );
    }

    throw error;
  }

  return enrichRecommendedAnalyses(response.data);
};

const enqueueChatService = async ({
  companyId,
  userId,
  userGoal,
  conversationId,
}) => {
  return enqueueChatMessage({
    companyId,
    userId,
    userGoal,
    conversationId,
    source: "chatService.enqueueChatService:POST /api/chat",
  });
};

const getChatJobStatusService = async ({ jobId, conversationId }) => {
  const job = await getChatJobById(jobId);

  if (!job) {
    createBadRequestError("Chat job not found", 404);
  }

  if (job.data?.conversationId !== conversationId) {
    createBadRequestError("Chat job not found", 404);
  }

  const state = await job.getState();

  if (state === "completed") {
    return {
      jobId: job.id,
      status: "COMPLETED",
      result: job.returnvalue,
    };
  }

  if (state === "failed") {
    return {
      jobId: job.id,
      status: "FAILED",
      error: job.failedReason || "Chat request failed",
    };
  }

  return {
    jobId: job.id,
    status: "PROCESSING",
  };
};

const getChatService = async ({ conversationId }) => {
  const response = await axios.get(
    `https://strategy.ratorai.com/ai/chatbot/history/${conversationId}`,
    {
      params: {
        organization_id: conversationId,
        user_id: conversationId,
      },
    },
  );

  return response.data;
};

module.exports = {
  processChatMessageService,
  enqueueChatService,
  getChatJobStatusService,
  getChatService,
};
