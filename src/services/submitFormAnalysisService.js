const OpenAI = require("openai");
const { getFormById } = require("../repositories/analysisFormRepository");
const prisma = require("../prismaClient");
const { createBadRequestError } = require("../utils");

const openai = new OpenAI({
  apiKey: "ollama",
  baseURL: "http://localhost:11434/v1",
});

const submitFormAnalysisService = async (currentUser, body) => {
  const { formId, answers } = body;
  console.log("currentUser =>", currentUser);
  // 1. دریافت فرم و سوالات
  const form = await prisma.analysisForm.findUnique({
    where: { id: formId },
    select: { promptTemplate: true, questions: true },
  });

  if (!form) {
    createBadRequestError("فرم یافت نشد", 404);
  }

  // 2. دریافت پروفایل شرکت
  const company = await prisma.company.findUnique({
    where: { id: currentUser.companyId },
    select: {
      profile: true,
      adminData: { select: { data: true } },
    },
  });

  const companyProfile = company?.profile || {};
  const companyAdminData = company?.adminData?.data || null;

  // 3. ساخت prompt
  const questionsAndAnswers = form.questions
    .map((q) => {
      const answerRaw = answers[q.id];
      const answer = Array.isArray(answerRaw)
        ? answerRaw.join(" | ")
        : (answerRaw ?? "No Answer");
      return `Q: ${q.label}\nA: ${answer}`;
    })
    .join("\n\n");

  const promptText = `
Form Prompt:
${form.promptTemplate}
  
Questions and Answers:
${questionsAndAnswers}
  
Company Profile:
${companyProfile ? JSON.stringify(companyProfile, null, 2) : "Not Provided"}
  
Company Admin Data:
${companyAdminData ? JSON.stringify(companyAdminData, null, 2) : "Not Provided"}
  
Analyze this strategically.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "qwen2.5-coder:7b",
      messages: [{ role: "user", content: promptText }],
      max_tokens: 1000,
      temperature: 0.7,
    });

    return {
      aiResponse: completion.choices[0].message.content,
    };
  } catch (error) {
    console.error("Error calling Ollama:", error);
    throw new Error("خطا در دریافت پاسخ از هوش مصنوعی");
  }
};

const getFormForUserService = async (formId) => {
  if (!formId) {
    createBadRequestError("ایدی فرم الزامی است");
  }
  const form = await getFormById(formId);

  if (!form) {
    createBadRequestError("فرم یافت نشد", 404);
  }

  return form;
};

module.exports = { submitFormAnalysisService, getFormForUserService };
