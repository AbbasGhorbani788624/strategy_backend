const prisma = require("../prismaClient");

const PROFILE_RELATIONS = {
  COMPANY_BASIC_INFO: "basicInfo",
  COMPANY_MANAGER: "managers",
  REVENUE_CENTER: "revenueCenters",
  COMPANY_SHAREHOLDER: "shareholders",
  ORGANIZATION_UNIT: "organizationUnits",
  COMPANY_LICENSE_CERTIFICATE: "licenseCertificates",
  COMPANY_MEMBERSHIP: "memberships",
  COMPANY_PRODUCT_SERVICE: "productServices",
  COMPANY_MARKET: "markets",
  KEY_CUSTOMER: "keyCustomers",
  COMPANY_BALANCE_SHEET: "balanceSheets",
  COMPANY_INCOME_STATEMENT: "incomeStatements",
  COMPANY_RESOURCE_CAPABILITY: "resourceCapabilities",
};
const MODEL_TITLES = {
  COMPANY_BASIC_INFO: "اطلاعات پایه شرکت",
  COMPANY_MANAGER: "مدیران شرکت",
  REVENUE_CENTER: "مراکز درآمد",
  COMPANY_SHAREHOLDER: "سهامداران",
  ORGANIZATION_UNIT: "چارت سازمانی",
  COMPANY_LICENSE_CERTIFICATE: "مجوزها و گواهینامه‌ها",
  COMPANY_MEMBERSHIP: "عضویت‌ها",
  COMPANY_PRODUCT_SERVICE: "محصولات و خدمات",
  COMPANY_MARKET: "بازارها",
  KEY_CUSTOMER: "مشتریان کلیدی",
  COMPANY_BALANCE_SHEET: "ترازنامه",
  COMPANY_INCOME_STATEMENT: "صورت سود و زیان",
  COMPANY_RESOURCE_CAPABILITY: "منابع و قابلیت‌ها",
};

const isProfileFieldCompleted = (company, profileFieldKey) => {
  const [entity, field] = profileFieldKey.split(".");

  const relation = PROFILE_RELATIONS[entity];

  if (!relation) return false;

  const value = company?.[relation];

  if (!value) return false;

  // One To One
  if (!Array.isArray(value)) {
    return (
      value[field] !== null && value[field] !== undefined && value[field] !== ""
    );
  }

  // One To Many
  return value.some((item) => {
    const fieldValue = item[field];

    return fieldValue !== null && fieldValue !== undefined && fieldValue !== "";
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
    where: {
      id,
    },

    include: {
      categories: {
        where: {
          isActive: true,
        },

        orderBy: {
          order: "asc",
        },
      },

      questions: {
        orderBy: {
          order: "asc",
        },

        include: {
          options: {
            orderBy: {
              order: "asc",
            },
          },
        },
      },

      categoryGroups: {
        orderBy: {
          order: "asc",
        },

        include: {
          categories: true,
        },
      },
    },
  });
};

const getSingleForms = async (companyId) => {
  const [forms, company] = await Promise.all([
    prisma.analysisForm.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        profileFields: true,

        goals: {
          select: {
            id: true,
            formId: true,
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

      include: {
        basicInfo: true,
        managers: true,
        revenueCenters: true,
        shareholders: true,
        organizationUnits: true,
        licenseCertificates: true,
        memberships: true,
        productServices: true,
        markets: true,
        keyCustomers: true,
        balanceSheets: true,
        incomeStatements: true,
        resourceCapabilities: true,
      },
    }),
  ]);

  const missingModels = new Set();

  return forms.map((form) => {
    for (const field of form.profileFields) {
      const completed = isProfileFieldCompleted(company, field.profileFieldKey);

      if (completed) continue;

      const [model] = field.profileFieldKey.split(".");

      missingModels.add({
        key: model,
        title: MODEL_TITLES[model],
      });
    }

    return {
      id: form.id,
      title: form.title,
      order: form.order,
      isActive: form.isActive,
      goals: form.goals,
      hasForm: form.categories.some(
        (category) => category._count.questions > 0,
      ),

      disabled: missingModels.size > 0,
      missingModels: [...missingModels],
    };
  });
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
  getSingleForms,
  getAvailableMultiAnalysisFormsService,
};
