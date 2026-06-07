const prisma = require("../prismaClient");

const deleteFormRepo = async (id) => {
  return prisma.$transaction(async (tx) => {
    const form = await tx.analysisForm.findUnique({
      where: { id },
      include: {
        promptDefinition: {
          include: {
            versions: true,
          },
        },
      },
    });

    if (!form) {
      createBadRequestError("فرم پیدا نشد", 404);
    }

    const promptVersionIds =
      form.promptDefinition?.versions?.map((v) => v.id) || [];

    const relatedProject = await tx.project.findFirst({
      where: {
        OR: [
          { analysisFormId: id },
          ...(promptVersionIds.length
            ? [{ promptVersionId: { in: promptVersionIds } }]
            : []),
        ],
      },
      select: {
        id: true,
      },
    });

    if (relatedProject) {
      createBadRequestError(
        "این فرم در پروژه استفاده شده و قابل حذف نیست",
        400,
      );
    }

    await tx.formQuestion.deleteMany({
      where: { formId: id },
    });

    await tx.formGoal.deleteMany({
      where: { formId: id },
    });

    if (form.promptDefinition) {
      const promptDefinitionId = form.promptDefinition.id;

      await tx.promptVersionSegmentValue.deleteMany({
        where: {
          promptVersion: {
            promptDefinitionId,
          },
        },
      });

      await tx.promptVersion.deleteMany({
        where: {
          promptDefinitionId,
        },
      });

      await tx.promptSegmentDefinition.deleteMany({
        where: {
          promptDefinitionId,
        },
      });

      await tx.promptDefinition.delete({
        where: {
          id: promptDefinitionId,
        },
      });
    }

    return tx.analysisForm.delete({
      where: { id },
    });
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

const getExistingFormsByIds = async (formIds) => {
  if (!formIds || formIds.length === 0) return [];

  const forms = await prisma.analysisForm.findMany({
    where: { id: { in: formIds } },
    select: { id: true },
  });

  return forms;
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
      _count: {
        select: {
          questions: true,
        },
      },
    },
  });

  return forms.map((form) => ({
    id: form.id,
    title: form.title,
    order: form.order,
    isActive: form.isActive,
    goals: form.goals,
    hasForm: form._count.questions > 0,
  }));
};

const getAvailableMultiAnalysisFormsService = async ({ userId, companyId }) => {
  const multiForms = await prisma.multiAnalysisForm.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
    include: {
      requiredForms: {
        orderBy: { order: "asc" },
        include: {
          form: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
      goals: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  if (!multiForms.length) return [];

  const completedProjects = await prisma.project.findMany({
    where: {
      creatorId: userId?.userId,
      companyId,
      mode: "SINGLE",
      status: "FINAL_ANALYSIS",
    },
    select: {
      formId: true,
    },
  });

  const completedFormIds = new Set(completedProjects.map((p) => p.formId));

  return multiForms.map((multiForm) => {
    const requiredAnalysisTitles = multiForm.requiredForms.map(
      (r) => r.form.title,
    );

    const missingAnalysisTitles = multiForm.requiredForms
      .filter((r) => !completedFormIds.has(r.formId))
      .map((r) => r.form.title);

    return {
      id: multiForm.id,
      title: multiForm.title,
      description: multiForm.description,
      goals: multiForm.goals,
      requiredAnalysisTitles,
      missingAnalysisTitles,
      isAvailable: missingAnalysisTitles.length === 0,
    };
  });
};

module.exports = {
  deleteFormRepo,
  getFormById,
  getExistingFormsByIds,
  getSingleForms,
  getAvailableMultiAnalysisFormsService,
};
