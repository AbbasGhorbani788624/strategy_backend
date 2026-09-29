const prisma = require("../prismaClient");
const { createBadRequestError } = require("../utils");

function createCategoryInclude(depth = 4) {
  return {
    questions: {
      orderBy: { order: "asc" },
      include: {
        options: { orderBy: { order: "asc" } },
      },
    },
    children:
      depth > 0
        ? {
            orderBy: { order: "asc" },
            include: createCategoryInclude(depth - 1),
          }
        : undefined,
  };
}

const createFormInclude = () => ({
  categories: {
    where: { parentId: null, isActive: true },
    orderBy: { order: "asc" },
    include: createCategoryInclude(),
  },
});

const getProjectForm = async (project) => {
  if (project.mode === "SINGLE") {
    if (!project.formId) {
      createBadRequestError("فرم پروژه یافت نشد");
    }

    return prisma.analysisForm.findUnique({
      where: { id: project.formId },
      include: createFormInclude(),
    });
  }

  if (project.mode === "MULTI") {
    if (!project.multiAnalysisFormId) {
      createBadRequestError("فرم پروژه یافت نشد");
    }

    return prisma.multiAnalysisForm.findUnique({
      where: { id: project.multiAnalysisFormId },
      include: createFormInclude(),
    });
  }

  createBadRequestError("نوع پروژه نامعتبر است");
};

module.exports = {
  getProjectForm,
};
