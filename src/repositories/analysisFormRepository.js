const prisma = require("../prismaClient");
const {
  buildProfileStatus,
  COMPANY_PROFILE_INCLUDE,
} = require("../utils/profileStatus");

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
  let form = await prisma.analysisForm.findUnique({
    where: { id },
    include: {
      categories: {
        where: { isActive: true },
        orderBy: { order: "asc" },
        include: {
          questions: {
            orderBy: { order: "asc" },
            include: {
              options: {
                orderBy: { order: "asc" },
              },
            },
          },
        },
      },
      categoryGroups: {
        orderBy: { order: "asc" },
        include: {
          categories: true,
        },
      },
    },
  });

  if (form) {
    return {
      ...form,
      type: "single",
    };
  }

  form = await prisma.multiAnalysisForm.findUnique({
    where: { id },
    include: {
      categories: {
        where: { isActive: true },
        orderBy: { order: "asc" },
        include: {
          questions: {
            orderBy: { order: "asc" },
            include: {
              options: {
                orderBy: { order: "asc" },
              },
            },
          },
        },
      },
      categoryGroups: {
        orderBy: { order: "asc" },
        include: {
          categories: true,
        },
      },
    },
  });

  if (form) {
    return {
      ...form,
      type: "multi",
    };
  }

  return null;
};

const getSingleForms = async (companyId) => {
  const [forms, company] = await Promise.all([
    prisma.analysisForm.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        order: "asc",
      },
      include: {
        category: {
          select: {
            id: true,
            title: true,
            image: true,
            description: true,
          },
        },
        profileFields: true,
        goals: {
          select: {
            id: true,
            title: true,
          },
        },
        categories: {
          select: {
            id: true,
            _count: {
              select: {
                questions: true,
              },
            },
          },
        },
      },
    }),

    prisma.company.findUnique({
      where: {
        id: companyId,
      },
      include: COMPANY_PROFILE_INCLUDE,
    }),
  ]);

  const mappedForms = forms.map((form) => ({
    id: form.id,
    title: form.title,
    order: form.order,
    isActive: form.isActive,
    goals: form.goals,
    hasForm: form.categories.some((c) => c._count.questions > 0),
    ...buildProfileStatus(company, form.profileFields),
    category: form.category,
  }));

  const groupedMap = new Map();

  for (const form of mappedForms) {
    const categoryId = form.category?.id || "uncategorized";

    if (!groupedMap.has(categoryId)) {
      groupedMap.set(categoryId, {
        id: form.category?.id || null,
        title: form.category?.title || "بدون دسته‌بندی",
        image: form.category?.image || null,
        description: form.category?.description || null,
        forms: [],
      });
    }

    const { category, ...formData } = form;

    groupedMap.get(categoryId).forms.push(formData);
  }

  return [...groupedMap.values()];
};

const getAvailableMultiAnalysisFormsService = async ({ userId, companyId }) => {
  const multiForms = await prisma.multiAnalysisForm.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      order: "asc",
    },
    include: {
      category: {
        select: {
          id: true,
          title: true,
          image: true,
          description: true,
        },
      },
      requiredForms: {
        orderBy: {
          order: "asc",
        },
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
      categories: {
        select: {
          id: true,
          _count: {
            select: {
              questions: true,
            },
          },
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

  const mappedForms = multiForms.map((multiForm) => {
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
      hasForm: multiForm.categories.some((c) => c._count.questions > 0),
      isAvailable: missingAnalysisTitles.length === 0,
      category: multiForm.category,
    };
  });

  const groupedMap = new Map();

  for (const form of mappedForms) {
    const categoryId = form.category?.id || "uncategorized";

    if (!groupedMap.has(categoryId)) {
      groupedMap.set(categoryId, {
        id: form.category?.id || null,
        title: form.category?.title || "بدون دسته‌بندی",
        image: form.category?.image || null,
        description: form.category?.description || null,
        forms: [],
      });
    }

    const { category, ...formData } = form;

    groupedMap.get(categoryId).forms.push(formData);
  }

  return [...groupedMap.values()];
};

module.exports = {
  deleteFormRepo,
  getFormById,
  getSingleForms,
  getAvailableMultiAnalysisFormsService,
};
