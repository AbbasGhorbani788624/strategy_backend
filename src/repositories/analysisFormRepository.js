const prisma = require("../prismaClient");
const {
  buildProfileStatus,
  COMPANY_PROFILE_INCLUDE,
} = require("../utils/profileStatus");
const {
  getRequiredItemTitle,
  isRequiredItemCompleted,
} = require("../utils/multiAnalysisRequiredFormUtils");
const {
  getEnabledTierFormKeys,
  isAnalysisAllowed,
} = require("../services/companyAnalysisTierService");

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
  const [forms, company, enabledKeys] = await Promise.all([
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
    getEnabledTierFormKeys(companyId),
  ]);

  const mappedForms = forms.map((form) => {
    const profileStatus = buildProfileStatus(company, form.profileFields);
    const isAllowed = isAnalysisAllowed(enabledKeys, form.id, "single");

    return {
      id: form.id,
      title: form.title,
      titleFa: form.titleFa,
      order: form.order,
      isActive: form.isActive,
      directFinalAnalysis: form.directFinalAnalysis,
      isShowText: form.isShowText,
      goals: form.goals,
      hasForm: form.categories.some((c) => c._count.questions > 0),
      ...profileStatus,
      isAllowed,
      disabled: profileStatus.disabled || !isAllowed,
      category: form.category,
      info: form.info,
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

const getAvailableMultiAnalysisFormsService = async ({ userId, companyId }) => {
  const [multiForms, enabledKeys] = await Promise.all([
    prisma.multiAnalysisForm.findMany({
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
            requiredMultiAnalysisForm: {
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
    }),
    getEnabledTierFormKeys(companyId),
  ]);

  if (!multiForms.length) return [];

  const completedSingleProjects = await prisma.project.findMany({
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

  const completedMultiProjects = await prisma.project.findMany({
    where: {
      creatorId: userId?.userId,
      companyId,
      mode: "MULTI",
      status: "FINAL_ANALYSIS",
    },
    select: {
      multiAnalysisFormId: true,
    },
  });

  const completedFormIds = new Set(
    completedSingleProjects.map((p) => p.formId).filter(Boolean),
  );
  const completedMultiFormIds = new Set(
    completedMultiProjects.map((p) => p.multiAnalysisFormId).filter(Boolean),
  );

  const mappedForms = multiForms.map((multiForm) => {
    const requiredAnalysisTitles = multiForm.requiredForms
      .map((r) => getRequiredItemTitle(r))
      .filter(Boolean);

    const missingAnalysisTitles = multiForm.requiredForms
      .filter(
        (r) =>
          !isRequiredItemCompleted(r, completedFormIds, completedMultiFormIds),
      )
      .map((r) => getRequiredItemTitle(r))
      .filter(Boolean);

    const isAllowed = isAnalysisAllowed(enabledKeys, multiForm.id, "multi");

    return {
      id: multiForm.id,
      title: multiForm.title,
      titleFa: multiForm.titleFa,
      description: multiForm.description,
      directFinalAnalysis: multiForm.directFinalAnalysis,
      isShowText: multiForm.isShowText,
      goals: multiForm.goals,
      requiredAnalysisTitles,
      missingAnalysisTitles,
      hasForm: multiForm.categories.some((c) => c._count.questions > 0),
      isAvailable:
        requiredAnalysisTitles.length === 0 ||
        missingAnalysisTitles.length < requiredAnalysisTitles.length,
      isAllowed,
      disabled: !isAllowed,
      category: multiForm.category,
      info: multiForm?.description,
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

const mergeAnalysisFormCategories = (singleCategories, multiCategories) => {
  const categoryOrder = [];
  const mergedMap = new Map();

  const upsertCategory = (category) => {
    const categoryId = category.id || "uncategorized";

    if (!mergedMap.has(categoryId)) {
      mergedMap.set(categoryId, {
        id: category.id,
        title: category.title,
        image: category.image,
        description: category.description,
        forms: [],
      });
      categoryOrder.push(categoryId);
    }

    return categoryId;
  };

  for (const category of singleCategories) {
    const categoryId = upsertCategory(category);
    mergedMap
      .get(categoryId)
      .forms.push(
        ...category.forms.map((form) => ({ ...form, type: "single" })),
      );
  }

  for (const category of multiCategories) {
    const categoryId = upsertCategory(category);
    mergedMap
      .get(categoryId)
      .forms.push(
        ...category.forms.map((form) => ({ ...form, type: "multi" })),
      );
  }

  return categoryOrder.map((id) => mergedMap.get(id));
};

const getAnalysisModesCategories = async ({ userId, companyId }) => {
  const [singleCategories, multiCategories] = await Promise.all([
    getSingleForms(companyId),
    getAvailableMultiAnalysisFormsService({ userId, companyId }),
  ]);

  return mergeAnalysisFormCategories(singleCategories, multiCategories);
};

module.exports = {
  getFormById,
  getSingleForms,
  getAvailableMultiAnalysisFormsService,
  getAnalysisModesCategories,
};
