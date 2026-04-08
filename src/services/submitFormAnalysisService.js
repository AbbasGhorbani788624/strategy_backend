const OpenAI = require("openai");
const { getFormById } = require("../repositories/analysisFormRepository");
const prisma = require("../prismaClient");
const {} = require("../utils");

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});
const submitFormAnalysisService = async (currentUser, body) => {
  const { formId, answers } = body;

  // فرم و سوالات
  const form = await prisma.analysisForm.findUnique({
    where: { id: formId },
    select: { promptTemplate: true, questions: true },
  });

  if (!form) {
    createBadRequestError("فرم یافت نشد", 404);
  }

  // پروفایل شرکت و AdminData
  const company = await prisma.company.findUnique({
    where: { id: currentUser.companyId },
    select: {
      profile: true,
      adminData: { select: { data: true } },
    },
  });

  const companyProfile = company?.profile || {};
  const companyAdminData = company?.adminData?.data || null;

  // ساخت prompt نهایی با سوال و جواب‌ها
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
${JSON.stringify(companyProfile, null, 2)}

Company Admin Data:
${companyAdminData ? JSON.stringify(companyAdminData, null, 2) : "Not Provided"}

Analyze this from a strategic perspective.
What are the short-term and long-term implications?
Where could this fail?
What would a top 1% expert notice here that others wouldn’t?
`;

  const completion = await openai.chat.completions.create({
    model: "openrouter/free",
    messages: [{ role: "user", content: promptText }],
    max_tokens: 1000,
  });

  return {
    aiResponse: completion.choices[0].message.content,
  };
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
