const prisma = require("../prismaClient");

const createStepFlow = async (data) => {
  const { title, isActive = true, steps } = data;

  const stepFlow = await prisma.stepFlow.create({
    data: {
      title,
      isActive,
      steps: {
        create: steps.map((s) => ({
          formId: s.formId,
          order: s.order,
          required: s.required,
        })),
      },
    },
    include: {
      steps: true,
    },
  });

  return stepFlow;
};

const updateStepFlow = async (id, data) => {
  const { title, isActive, steps } = data;

  const updatedStepFlow = await prisma.stepFlow.update({
    where: { id },
    data: {
      title,
      isActive,
      steps: steps
        ? {
            // حذف مراحل موجود که تو body نیومدن
            deleteMany: {
              id: { notIn: steps.filter((s) => s.id).map((s) => s.id) },
            },
            // update یا create مراحل
            upsert: steps.map((s) => ({
              where: { id: s.id || "00000000-0000-0000-0000-000000000000" }, // اگر id نبود، create می‌کنه
              update: {
                formId: s.formId,
                order: s.order,
                required: s.required,
              },
              create: {
                formId: s.formId,
                order: s.order,
                required: s.required,
              },
            })),
          }
        : undefined,
    },
    include: { steps: true },
  });

  return updatedStepFlow;
};

const deleteStepFlow = async (id) => {
  await prisma.stepFlow.delete({
    where: { id },
    include: { steps: true },
  });
};

// چک وجود  یک flow
const getStepFlowById = async (id) => {
  return await prisma.stepFlow.findUnique({
    where: { id },
    include: { steps: true },
  });
};

const isStepFlowExists = async (id) => {
  return await prisma.stepFlow.count({
    where: { id },
  });
};

const getAllStepFlows = async ({ page = 1, limit = 10, search = "" }) => {
  const skip = (page - 1) * limit;

  const where = search
    ? {
        title: {
          contains: search,
        },
      }
    : {};

  const [stepFlows, total] = await Promise.all([
    prisma.stepFlow.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        title: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        steps: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            flowId: true,
            formId: true,
            order: true,
            required: true,
            form: {
              select: {
                title: true,
                order: true,
                isActive: true,
              },
            },
          },
        },
      },
    }),
    prisma.stepFlow.count({ where }),
  ]);

  return {
    stepFlows,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getActiveStepFlows = async () => {
  return prisma.stepFlow.findMany({
    where: { isActive: true },
    include: {
      steps: {
        orderBy: { order: "asc" },
        include: {
          form: {
            select: {
              id: true,
              title: true,
              info: true,
            },
          },
        },
      },
    },
  });
};

// دریافت StepFlow با جزئیات کامل
const getStepFlowByIdWidthDetail = async (flowId) => {
  return prisma.stepFlow.findUnique({
    where: { id: flowId },
    include: {
      steps: {
        orderBy: { order: "asc" },
        include: {
          form: {
            select: {
              id: true,
              title: true,
              info: true,
              promptTemplate: true,
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
          },
        },
      },
    },
  });
};

// ایجاد StepSession
const createStepSession = async (data) => {
  return prisma.stepSession.create({
    data: {
      userId: data.userId,
      flowId: data.flowId,
      currentStep: 1,
      data: {
        completedSteps: [],
        stepAnalyses: {},
      },
      status: "ACTIVE",
    },
  });
};

// دریافت StepSession
const getStepSessionById = async (sessionId) => {
  return prisma.stepSession.findUnique({
    where: { id: sessionId },
    include: {
      flow: {
        include: {
          steps: {
            orderBy: { order: "asc" },
            include: {
              form: {
                select: {
                  id: true,
                  title: true,
                  info: true,
                  promptTemplate: true,
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
              },
            },
          },
        },
      },
    },
  });
};

// آپدیت StepSession بعد از هر مرحله
const updateStepSession = async (sessionId, updateData) => {
  return prisma.stepSession.update({
    where: { id: sessionId },
    data: updateData,
  });
};

module.exports = {
  createStepFlow,
  updateStepFlow,
  deleteStepFlow,
  getStepFlowById,
  getAllStepFlows,
  getActiveStepFlows,
  getStepFlowByIdWidthDetail,
  createStepSession,
  getStepSessionById,
  updateStepSession,
  isStepFlowExists,
};
