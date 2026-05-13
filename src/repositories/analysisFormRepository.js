const prisma = require("../prismaClient");

//ارتباط با دیتابیس جهت ساخت فرم تحلیل

const createWithQuestions = async (data) => {
  const { questions = [], prompts = [], goals = [], ...formData } = data;

  return prisma.analysisForm.create({
    data: {
      ...formData,
      questions: {
        create: questions.map((q) => ({
          label: q.label,
          type: q.type,
          options: q.options || null,
          required: q.required ?? true,
          order: q.order,
        })),
      },
      prompts: {
        create: prompts.map((p) => ({
          content: p.content,
        })),
      },
      goals: {
        create: goals.map((g) => ({
          title: g.title,
        })),
      },
    },
    include: {
      questions: true,
      prompts: true,
      goals: true,
    },
  });
};

// ارتباط با دیتابیس جهت ویرایش فرم تحلیل
const updateFormWithQuestions = async (id, data) => {
  const { questions = [], prompts = [], goals = [], ...formData } = data;

  return prisma.$transaction(async (tx) => {
    if (Object.keys(formData).length > 0) {
      await tx.analysisForm.update({
        where: { id },
        data: formData,
      });
    }

    await tx.formQuestion.deleteMany({
      where: { formId: id },
    });

    if (questions.length > 0) {
      await tx.formQuestion.createMany({
        data: questions.map((q) => ({
          formId: id,
          label: q.label,
          type: q.type,
          options: q.options || null,
          required: q.required ?? true,
          order: q.order,
        })),
      });
    }

    await tx.formPrompt.deleteMany({
      where: { formId: id },
    });

    if (prompts.length > 0) {
      await tx.formPrompt.createMany({
        data: prompts.map((p) => ({
          formId: id,
          title: p.title || null,
          content: p.content,
          order: p.order ?? null,
          isActive: p.isActive ?? true,
        })),
      });
    }

    await tx.formGoal.deleteMany({
      where: { formId: id },
    });

    if (goals.length > 0) {
      await tx.formGoal.createMany({
        data: goals.map((g) => ({
          formId: id,
          title: g.title,
          description: g.description || null,
          order: g.order ?? null,
          isActive: g.isActive ?? true,
        })),
      });
    }

    return tx.analysisForm.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: "asc" },
        },
        prompts: {
          orderBy: { order: "asc" },
        },
        goals: {
          orderBy: { order: "asc" },
        },
      },
    });
  });
};
// ارتباط با دیتابیس حهت حذف فرم تحلیل
const deleteFormRepo = async (id) => {
  return prisma.analysisForm.delete({
    where: { id },
  });
};

const getFormById = async (id) => {
  return prisma.analysisForm.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: {
          order: "asc",
        },
      },
    },
  });
};

const isFromExists = async (id) => {
  return await prisma.analysisForm.count({ where: { id } });
};

//چک وجود فرم های تحلیل
const getExistingFormsByIds = async (formIds) => {
  if (!formIds || formIds.length === 0) return [];

  const forms = await prisma.analysisForm.findMany({
    where: { id: { in: formIds } },
    select: { id: true },
  });

  return forms;
};

//لیست  همه فرم ها
const getAllAnalysisForms = async ({ page = 1, limit = 10, search = "" }) => {
  const skip = (page - 1) * limit;

  const where = search
    ? {
        title: {
          contains: search,
        },
      }
    : {};

  const [forms, total] = await Promise.all([
    prisma.analysisForm.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        title: true,
        order: true,
        isActive: true,
        info: true,
      },
    }),
    prisma.analysisForm.count({ where }),
  ]);

  return {
    forms,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getAnalysisFormById = async (id) => {
  const form = await prisma.analysisForm.findUnique({
    where: { id },
  });

  return form;
};

const getSingleForms = async () => {
  const forms = await prisma.analysisForm.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      order: true,
      isActive: true,
      goals: {
        select: {
          id: true,
          formId: true,
          title: true,
        },
      },
    },
  });

  return forms;
};

// روش‌های مرحله‌ای با فرم‌های هر step
const getStepFlows = async () => {
  const stepFlows = await prisma.stepFlow.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      isActive: true,
    },
  });

  // map برای ساده سازی ساختار stepها
  const formattedStepFlows = stepFlows.map((flow) => ({
    id: flow.id,
    title: flow.title,
    isActive: flow.isActive,
  }));

  return formattedStepFlows;
};

module.exports = {
  createWithQuestions,
  updateFormWithQuestions,
  deleteFormRepo,
  getFormById,
  getExistingFormsByIds,
  getAllAnalysisForms,
  getAnalysisFormById,
  getSingleForms,
  getStepFlows,
  isFromExists,
};
