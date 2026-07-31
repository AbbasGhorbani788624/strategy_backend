const prisma = require("../prismaClient");
const { createBadRequestError } = require("../utils");
const axios = require("axios");

const createChatService = async ({
  companyId,
  userId,
  userGoal,
  conversationId,
}) => {
  try {

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
      organization_request_limit: company.chatMessageLimit ,
      organization_id: companyId,
      user_id: userId,
      conversation_id: conversationId,
      user_goal: userGoal,
    };
let response;

try {
  response = await axios.post(
    "185.237.85.53:8080/chatbot/chatbot",
    payload,
    {
      timeout: 300000,
    }
  );
} catch (error) {
  if (error.response?.status === 400) {
    throw createBadRequestError(
      "تعداد درخواست های شما بیش از حد مجاز میباشد",
      400
    );
  }

  throw error;
}
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
      forms.map((form) => [form.title.trim().toLowerCase(), form])
    );

    const multiFormsMap = new Map(
      multiForms.map((form) => [form.title.trim().toLowerCase(), form])
    );

    const rawAnalyses = Array.isArray(response.data.recommendedAnalyses)
      ? response.data.recommendedAnalyses
      : [];


    const recommendedAnalyses = rawAnalyses.map((item) => {
      const normalizedTitle = item.title?.trim().toLowerCase();

      const multiForm = normalizedTitle
        ? multiFormsMap.get(normalizedTitle)
        : null;

      const form = normalizedTitle
        ? formsMap.get(normalizedTitle)
        : null;

      if (!multiForm && !form) {
        console.warn(
          `Analysis form not found for title: ${item.title}`
        );
      }

      return {
        ...item,
        analysisId: multiForm?.id ?? form?.id ?? null,
        type: multiForm ? 2 : form ? 1 : null,
      };
    });



    return {
      ...response.data,
      recommendedAnalyses,
    };
  } catch (error) {

    throw error;
  }
};

const getChatService = async ({ conversationId }) => {
  const response = await axios.get(
    `185.237.85.53:8080/chatbot/history/${conversationId}`,
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
  createChatService,
  getChatService,
};
