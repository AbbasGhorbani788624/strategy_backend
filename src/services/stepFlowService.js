const {
  getExistingFormsByIds,
} = require("../repositories/analysisFormRepository");
const {
  createStepFlow,
  updateStepFlow,
  getStepFlowById,
  deleteStepFlow,
  getStepFlowByIdWidthDetail,
  getAllStepFlows,
  createStepSession,
  getStepSessionById,
  updateStepSession,
  getActiveStepFlows,
} = require("../repositories/stepFlowRepository");
const { createBadRequestError } = require("../utils");
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: "ollama",
  baseURL: "http://localhost:11434/v1",
});

const createStepFlowService = async (input) => {
  // چک order تکراری
  const orders = input.steps.map((s) => s.order);
  const uniqueOrders = new Set(orders);
  if (orders.length !== uniqueOrders.size) {
    const err = new Error("ترتیب مراحل نباید تکراری باشد");
    err.statusCode = 400;
    throw err;
  }

  // چک formId تکراری
  const formIds = input.steps.map((s) => s.formId);
  const uniqueFormIds = new Set(formIds);
  if (formIds.length !== uniqueFormIds.size) {
    const err = new Error("فرم‌ها نباید در مراحل دوبار استفاده شوند");
    err.statusCode = 400;
    throw err;
  }

  // چک وجود فرم‌ها در دیتابیس
  const existingForms = await getExistingFormsByIds(formIds);
  const existingFormIds = existingForms.map((f) => f.id);
  const notFound = formIds.filter((f) => !existingFormIds.includes(f));
  if (notFound.length > 0) {
    const err = new Error(`فرم(ها) یافت نشد: ${notFound.join(", ")}`);
    err.statusCode = 400;
    throw err;
  }

  return await createStepFlow(input);
};

const updateStepFlowService = async (id, input) => {
  if (!id) {
    createBadRequestError("شناسه مسیر مرحله‌ای الزامی است");
  }

  const existingStepFlow = await getStepFlowById(id);
  if (!existingStepFlow) {
    createBadRequestError("مسیر مرحله‌ای با شناسه داده شده یافت نشد", 404);
  }

  if (input.steps && input.steps.length > 0) {
    // چک order تکراری
    const orders = input.steps.map((s) => s.order);
    const uniqueOrders = new Set(orders);
    if (orders.length !== uniqueOrders.size) {
      const err = new Error("ترتیب مراحل نباید تکراری باشد");
      err.statusCode = 400;
      throw err;
    }

    // چک formId تکراری
    const formIds = input.steps.map((s) => s.formId);
    const uniqueFormIds = new Set(formIds);
    if (formIds.length !== uniqueFormIds.size) {
      const err = new Error("فرم‌ها نباید در مراحل دوبار استفاده شوند");
      err.statusCode = 400;
      throw err;
    }

    // چک وجود فرم‌ها در دیتابیس
    const existingForms = await getExistingFormsByIds(formIds);
    const existingFormIds = existingForms.map((f) => f.id);
    const notFound = formIds.filter((f) => !existingFormIds.includes(f));
    if (notFound.length > 0) {
      const err = new Error(`فرم(ها) یافت نشد: ${notFound.join(", ")}`);
      err.statusCode = 400;
      throw err;
    }
  }

  return await updateStepFlow(id, input);
};

const deleteStepFlowService = async (id) => {
  if (!id) {
    createBadRequestError("شناسه مسیر مرحله‌ای الزامی است");
  }

  const existingStepFlow = await getStepFlowById(id);
  if (!existingStepFlow) {
    createBadRequestError("فرم مرحله ای با این ایدی وجود ندارد", 404);
  }
  await deleteStepFlow(id);
};

//گرفتن لیست فرم های مرحله ای
const getAllStepFlowsService = async (query) => {
  let { page = 1, limit = 10, search = "" } = query;

  page = parseInt(page);
  limit = parseInt(limit);

  if (page < 1) page = 1;
  if (limit < 1 || limit > 100) limit = 10;

  return await getAllStepFlows({ page, limit, search });
};

// دریافت لیست مسیرهای مرحله‌ای فعال
const getActiveFlowsService = async () => {
  const flows = await getActiveStepFlows();

  return flows.map((flow) => ({
    id: flow.id,
    title: flow.title,
    stepsCount: flow.steps.length,
    steps: flow.steps.map((s) => ({
      order: s.order,
      formTitle: s.form.title,
      required: s.required,
    })),
  }));
};

//  شروع جلسه مرحله‌ای
const startStepSessionService = async (currentUser, flowId) => {
  // بررسی وجود flow
  const flow = await getStepFlowByIdWidthDetail(flowId);
  if (!flow) {
    createBadRequestError("مسیر مرحله‌ای یافت نشد", 404);
  }

  // بررسی تعداد مراحل
  if (!flow.steps || flow.steps.length === 0) {
    createBadRequestError("این مسیر هیچ مرحله‌ای ندارد", 400);
  }

  // ایجاد جلسه
  const session = await createStepSession({
    userId: currentUser.id,
    flowId: flow.id,
  });

  const allForms = flow.steps.map((step, index) => ({
    stepNumber: index + 1,
    formId: step.form.id,
    formTitle: step.form.title,
    formInfo: step.form.info,
    promptTemplate: step.form.promptTemplate,
    questions: step.form.questions,
  }));

  return {
    sessionId: session.id,
    currentStep: 1,
    totalSteps: flow.steps.length,
    forms: allForms,
    completedSteps: [],
    isCompleted: false,
  };
};

//  تحلیل هر مرحله (مرحله‌ای)
const analyzeStepService = async (currentUser, sessionId, answers) => {
  // دریافت جلسه
  const session = await getStepSessionById(sessionId);
  if (!session) {
    createBadRequestError("جلسه یافت نشد", 404);
  }

  if (session.userId !== currentUser.id) {
    createBadRequestError("دسترسی غیرمجاز", 403);
  }

  // یافتن مرحله فعلی
  const currentStepIndex = session.currentStep - 1;
  const currentStep = session.flow.steps[currentStepIndex];

  if (!currentStep) {
    createBadRequestError("مرحله یافت نشد", 400);
  }

  // دریافت پروفایل شرکت
  const company = await prisma.company.findUnique({
    where: { id: currentUser.companyId },
    select: {
      profile: true,
      adminData: { select: { data: true } },
    },
  });

  const companyProfile = company?.profile || {};
  const companyAdminData = company?.adminData?.data || null;

  // ساخت prompt
  const questionsAndAnswers = currentStep.form.questions
    .map((q) => {
      const answerRaw = answers[q.id];
      const answer = Array.isArray(answerRaw)
        ? answerRaw.join(" | ")
        : (answerRaw ?? "No Answer");
      return `Q: ${q.label}\nA: ${answer}`;
    })
    .join("\n\n");

  const promptText = `
Form: ${currentStep.form.title}
Prompt Template: ${currentStep.form.promptTemplate}
  
Questions and Answers:
${questionsAndAnswers}
  
Company Profile:
${JSON.stringify(companyProfile, null, 2)}
  
Company Admin Data:
${companyAdminData ? JSON.stringify(companyAdminData, null, 2) : "Not Provided"}
  
Analyze this step strategically.
`;

  // ارسال به AI
  const completion = await openai.chat.completions.create({
    model: "qwen2.5-coder:7b",
    messages: [{ role: "user", content: promptText }],
    max_tokens: 1000,
    temperature: 0.7,
  });

  const stepAnalysis = completion.choices[0].message.content;

  // ذخیره در session data
  const sessionData = session.data || { completedSteps: [], stepAnalyses: {} };
  sessionData.completedSteps.push({
    step: session.currentStep,
    formId: currentStep.form.id,
    formTitle: currentStep.form.title,
    answers,
    analysis: stepAnalysis,
  });
  sessionData.stepAnalyses[session.currentStep] = stepAnalysis;

  // آپدیت جلسه
  const nextStep = session.currentStep + 1;
  const isCompleted = nextStep > session.flow.steps.length;

  await updateStepSession(sessionId, {
    currentStep: isCompleted ? session.currentStep : nextStep,
    data: sessionData,
    status: isCompleted ? "COMPLETED" : "ACTIVE",
  });

  // اگر آخرین مرحله نیست، فقط stepNumber رو برگردون
  if (!isCompleted) {
    return {
      sessionId: session.id,
      currentStep: nextStep,
      totalSteps: session.flow.steps.length,
      stepAnalysis,
      nextStepNumber: nextStep, // فقط شماره مرحله بعد
      completedSteps: sessionData.completedSteps.length,
      isCompleted: false,
    };
  }

  // اگر آخرین مرحله است
  return {
    sessionId: session.id,
    currentStep: session.flow.steps.length,
    totalSteps: session.flow.steps.length,
    stepAnalysis,
    isCompleted: true,
    allStepsData: sessionData.completedSteps,
  };
};

//  تحلیل نهایی (وقتی همه مراحل پر شدند)
const generateFinalAnalysisService = async (currentUser, sessionId) => {
  const session = await getStepSessionById(sessionId);
  if (!session) {
    createBadRequestError("جلسه یافت نشد", 404);
  }

  if (session.userId !== currentUser.id) {
    createBadRequestError("دسترسی غیرمجاز", 403);
  }

  if (session.status !== "COMPLETED") {
    createBadRequestError("همه مراحل تکمیل نشده‌اند", 400);
  }

  // دریافت پروفایل شرکت و adminData
  const company = await prisma.company.findUnique({
    where: { id: currentUser.companyId },
    select: {
      profile: true,
      adminData: { select: { data: true } },
    },
  });

  const companyProfile = company?.profile || {};
  const companyAdminData = company?.adminData?.data || null;

  // ساخت prompt نهایی با همه مراحل
  const allStepsText = session.data.completedSteps
    .map((step) => {
      const qa = Object.entries(step.answers || {})
        .map(([q, a]) => `Q: ${q}\nA: ${Array.isArray(a) ? a.join(" | ") : a}`)
        .join("\n");
      return `
=== step ${step.step}: ${step.formTitle} ===
${qa}

Analysis of this step:
${step.analysis}
`;
    })
    .join("\n\n");

  const finalPrompt = `
${allStepsText}

Company Profile:
${JSON.stringify(companyProfile, null, 2)}

Company Admin Data:
${companyAdminData ? JSON.stringify(companyAdminData, null, 2) : "Not Provided"}

Analyze this strategically.

`;

  const completion = await openai.chat.completions.create({
    model: "qwen2.5-coder:7b",
    messages: [{ role: "user", content: finalPrompt }],
    max_tokens: 2000,
    temperature: 0.7,
  });

  const finalAnalysis = completion.choices[0].message.content;

  return {
    sessionId: session.id,
    finalAnalysis,
    allStepsData: session.data.completedSteps,
    canCreateProject: true,
  };
};

module.exports = {
  createStepFlowService,
  updateStepFlowService,
  deleteStepFlowService,
  getAllStepFlowsService,
  getActiveFlowsService,
  startStepSessionService,
  analyzeStepService,
  generateFinalAnalysisService,
};

//دادن فرم های به صورت تک زمان شروع شدن پرکردن فرم های مرحله ای اگر تعداد فرم ها زیاد بود ازش استفاده کن و روند رو کلا عوض کن
// const startStepSessionService = async (currentUser, flowId) => {
//   // بررسی وجود flow
//   const flow = await getStepFlowByIdWidthDetail(flowId);
//   if (!flow) {
//     createBadRequestError("مسیر مرحله‌ای یافت نشد", 404);
//   }

//   // بررسی تعداد مراحل
//   if (!flow.steps || flow.steps.length === 0) {
//     createBadRequestError("این مسیر هیچ مرحله‌ای ندارد", 400);
//   }

//   // ایجاد جلسه
//   const session = await createStepSession({
//     userId: currentUser.id,
//     flowId: flow.id,
//   });

// اولین فرم
// const firstStep = flow.steps[0];

// return {
//   sessionId: session.id,
//   currentStep: 1,
//   totalSteps: flow.steps.length,
//   currentForm: {
//     formId: firstStep.form.id,
//     formTitle: firstStep.form.title,
//     formInfo: firstStep.form.info,
//     promptTemplate: firstStep.form.promptTemplate,
//     questions: firstStep.form.questions,
//   },
//   completedSteps: [],
//   isCompleted: false,
// };
// };
