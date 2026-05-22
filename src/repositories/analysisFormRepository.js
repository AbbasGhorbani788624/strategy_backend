const prisma = require("../prismaClient");

const createWithQuestions = async (data) => {
  const { questions = [], goals = [], promptDefinition, ...formData } = data;

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
      goals: {
        create: goals.map((g) => ({
          title: g.title,
        })),
      },
      ...(promptDefinition
        ? {
            promptDefinition: {
              create: {
                ownerType: "ANALYSIS_FORM",
                segments: {
                  create: (promptDefinition.segments || []).map((s) => ({
                    key: s.key,
                    label: s.label,
                    sortOrder: s.sortOrder,
                    description: s.description || null,
                    isRequired: s.isRequired ?? true,
                  })),
                },
              },
            },
          }
        : {}),
    },
    include: {
      questions: true,
      goals: true,
      promptDefinition: {
        include: {
          segments: {
            orderBy: {
              sortOrder: "asc",
            },
          },
          versions: true,
        },
      },
    },
  });
};

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

const isFromExists = async (id) => {
  return await prisma.analysisForm.count({ where: { id } });
};

const getExistingFormsByIds = async (formIds) => {
  if (!formIds || formIds.length === 0) return [];

  const forms = await prisma.analysisForm.findMany({
    where: { id: { in: formIds } },
    select: { id: true },
  });

  return forms;
};

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
        createdAt: true,
        updatedAt: true,

        _count: {
          select: {
            questions: true,
            goals: true,
          },
        },

        promptDefinition: {
          select: {
            id: true,

            _count: {
              select: {
                segments: true,
                versions: true,
              },
            },

            versions: {
              where: {
                status: "PUBLISHED",
              },
              orderBy: {
                versionNumber: "desc",
              },
              take: 1,
              select: {
                id: true,
                versionNumber: true,
                versionKey: true,
                status: true,
                publishedAt: true,
              },
            },
          },
        },
      },
    }),

    prisma.analysisForm.count({ where }),
  ]);

  const mappedForms = forms.map((form) => {
    const publishedVersion = form.promptDefinition?.versions?.[0] || null;

    return {
      id: form.id,
      title: form.title,
      order: form.order,
      isActive: form.isActive,
      info: form.info,
      createdAt: form.createdAt,
      updatedAt: form.updatedAt,

      questionsCount: form._count.questions,
      goalsCount: form._count.goals,

      promptDefinition: form.promptDefinition
        ? {
            id: form.promptDefinition.id,
            segmentsCount: form.promptDefinition._count.segments,
            versionsCount: form.promptDefinition._count.versions,
            publishedVersion,
          }
        : null,
    };
  });

  return {
    forms: mappedForms,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getAnalysisFormById = async (id) => {
  return prisma.analysisForm.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: {
          order: "asc",
        },
      },
      goals: true,
      promptDefinition: {
        include: {
          segments: {
            orderBy: {
              sortOrder: "asc",
            },
          },
          versions: {
            orderBy: {
              versionNumber: "desc",
            },
            include: {
              segmentValues: {
                include: {
                  segmentDefinition: true,
                },
                orderBy: {
                  segmentDefinition: {
                    sortOrder: "asc",
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
  createWithQuestions,
  deleteFormRepo,
  getFormById,
  getExistingFormsByIds,
  getAllAnalysisForms,
  getAnalysisFormById,
  getSingleForms,
  isFromExists,
  getAvailableMultiAnalysisFormsService,
};
