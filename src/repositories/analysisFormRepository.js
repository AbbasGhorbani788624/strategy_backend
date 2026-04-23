const prisma = require("../prismaClient");

//ارتباط با دیتابیس جهت ساخت فرم تحلیل

const createWithQuestions = async (data) => {
  const { questions, ...formData } = data;

  return prisma.analysisForm.create({
    data: {
      ...formData,
      questions: {
        create: questions.map((q) => ({
          label: q.label,
          type: q.type,
          options: q.options || null,
          required: q.required || false,
          order: q.order,
        })),
      },
    },
    include: {
      questions: true,
    },
  });
};

// ارتباط با دیتابیس جهت ویرایش فرم تحلیل
const updateFormWithQuestions = async (id, data) => {
  const { questions, ...formData } = data;

  return prisma.$transaction(async (tx) => {
    // آپدیت فرم
    const form = await tx.analysisForm.update({
      where: { id },
      data: formData,
    });

    if (questions) {
      // حذف سوال‌های قبلی
      await tx.formQuestion.deleteMany({
        where: { formId: id },
      });

      // ایجاد سوال‌های جدید
      await tx.formQuestion.createMany({
        data: questions.map((q) => ({
          formId: id,
          label: q.label,
          type: q.type,
          options: q.options || null,
          required: q.required || false,
          order: q.order,
        })),
      });
    }

    return tx.analysisForm.findUnique({
      where: { id },
      include: {
        questions: {
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
      questions: true,
    },
  });
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
    include: {
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          label: true,
          type: true,
          options: true,
          required: true,
          order: true,
        },
      },
    },
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
      // steps: {
      //   orderBy: { order: "asc" },
      //   select: {
      //     form: {
      //       select: {
      //         id: true,
      //         title: true,
      //         order: true,
      //         isActive: true,
      //       },
      //     },
      //   },
      // },
    },
  });

  // map برای ساده سازی ساختار stepها
  const formattedStepFlows = stepFlows.map((flow) => ({
    id: flow.id,
    title: flow.title,
    isActive: flow.isActive,
    // steps: flow.steps.map((s) => ({
    //   id: s.form.id,
    //   title: s.form.title,
    //   order: s.form.order,
    //   isActive: s.form.isActive,
    // })),
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
};
