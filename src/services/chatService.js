const prisma = require("../prismaClient");
const { createBadRequestError } = require("../utils");
const axios = require("axios");


const createChatService = async ({
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
      createBadRequestError("",404);
    }

  
    const payload = {
      organization_request_limit: company.chatMessageLimit || 10,
      organization_id: companyId,
      user_id: userId,
      conversation_id: conversationId,
      user_goal: userGoal,
    };
     console.log("payload =>",payload)
  
    const response = await axios.post(
      `http://185.237.85.53:8080/chatbot/chatbot`,
      payload
    );



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
      const multiForm = normalizedTitle ? multiFormsMap.get(normalizedTitle) : null;
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
      ...response.data,
      recommendedAnalyses,
    };
  };


  const getChatService = async ({
    conversationId,
  }) => {
    const response = await axios.get(
      `http://185.237.85.53:8080/chatbot/history/${conversationId}`,
      {
        params: {
          organization_id: conversationId,
          user_id: conversationId,
        },
      }
    );
    console.log("response =>",response.data)
  
    return response.data;
  };

  module.exports = {
    createChatService,
    getChatService
  };