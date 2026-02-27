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
  const stepFlow = await prisma.stepFlow.delete({
    where: { id },
    include: { steps: true },
  });

  return stepFlow;
};

// چک وجود  یک flow
const getStepFlowById = async (id) => {
  return await prisma.stepFlow.findUnique({
    where: { id },
    include: { steps: true },
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
    data: stepFlows,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

module.exports = {
  createStepFlow,
  updateStepFlow,
  deleteStepFlow,
  getStepFlowById,
  getAllStepFlows,
};
