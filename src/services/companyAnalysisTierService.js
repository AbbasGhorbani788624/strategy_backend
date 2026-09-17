const { randomUUID } = require("crypto");
const prisma = require("../prismaClient");
const { createBadRequestError } = require("../utils");

const TIER_LEVELS = ["TIER_1", "TIER_2", "TIER_3", "TIER_4"];

const TIER_LABELS = {
  TIER_1: "طبقه ۱",
  TIER_2: "طبقه ۲",
  TIER_3: "طبقه ۳",
  TIER_4: "طبقه ۴",
};

const TIER_CONFIG_INCLUDE = {
  items: {
    orderBy: { sortOrder: "asc" },
    include: {
      analysisForm: {
        select: { id: true, title: true, titleFa: true, isActive: true },
      },
      multiAnalysisForm: {
        select: { id: true, title: true, titleFa: true, isActive: true },
      },
    },
  },
};

const buildFormKey = (type, id) => `${type}:${id}`;

const isSingleFormType = (formType) =>
  formType === "single" || formType === 1 || formType === "SINGLE";

const toTierFormParams = (formId, formType) =>
  isSingleFormType(formType) ? { formId } : { multiAnalysisFormId: formId };

const isAnalysisAllowed = (enabledKeys, formId, formType) => {
  if (!formId) return false;

  const key = isSingleFormType(formType)
    ? buildFormKey("single", formId)
    : buildFormKey("multi", formId);

  return enabledKeys.has(key);
};

const parseFormKey = (key) => {
  const [type, id] = String(key || "").split(":");
  if (!id || !["single", "multi"].includes(type)) return null;
  return { type, id };
};

const getItemFormKey = (item) => {
  if (item.analysisFormId) return buildFormKey("single", item.analysisFormId);
  if (item.multiAnalysisFormId) {
    return buildFormKey("multi", item.multiAnalysisFormId);
  }
  return null;
};

const formatTierItem = (item) => {
  const isSingle = Boolean(item.analysisFormId);
  const form = isSingle ? item.analysisForm : item.multiAnalysisForm;

  return {
    id: isSingle ? item.analysisFormId : item.multiAnalysisFormId,
    type: isSingle ? 1 : 2,
    title: form?.title || "",
    titleFa: form?.titleFa || null,
  };
};

const loadCompletedFormKeysForCompany = async (companyId) => {
  const completedProjects = await prisma.project.findMany({
    where: {
      companyId,
      status: "FINAL_ANALYSIS",
    },
    select: {
      formId: true,
      multiAnalysisFormId: true,
    },
  });

  const keys = new Set();

  for (const project of completedProjects) {
    if (project.formId) keys.add(buildFormKey("single", project.formId));
    if (project.multiAnalysisFormId) {
      keys.add(buildFormKey("multi", project.multiAnalysisFormId));
    }
  }

  return keys;
};

const bootstrapCompanyTierConfigs = async (companyId) => {
  const tierConfigs = TIER_LEVELS.map((tier) => ({
    id: randomUUID(),
    companyId,
    tier,
    isEnabled: tier === "TIER_1",
  }));

  await prisma.companyAnalysisTierConfig.createMany({
    data: tierConfigs,
  });
};

const ensureCompanyTierConfigs = async (companyId) => {
  if (!companyId) return;

  const existingCount = await prisma.companyAnalysisTierConfig.count({
    where: { companyId },
  });

  if (existingCount === 0) {
    await bootstrapCompanyTierConfigs(companyId);
  }
};

const loadCompanyTierConfigs = async (companyId) => {
  await ensureCompanyTierConfigs(companyId);

  return prisma.companyAnalysisTierConfig.findMany({
    where: { companyId },
    orderBy: { tier: "asc" },
    include: TIER_CONFIG_INCLUDE,
  });
};

const getEnabledTierFormKeys = async (companyId) => {
  const configs = await loadCompanyTierConfigs(companyId);
  const keys = new Set();

  for (const config of configs) {
    if (!config.isEnabled) continue;

    for (const item of config.items) {
      const key = getItemFormKey(item);
      if (key) keys.add(key);
    }
  }

  return keys;
};

const isFormInEnabledTier = async (
  companyId,
  { formId, multiAnalysisFormId },
) => {
  const keys = await getEnabledTierFormKeys(companyId);

  if (formId) return keys.has(buildFormKey("single", formId));
  if (multiAnalysisFormId)
    return keys.has(buildFormKey("multi", multiAnalysisFormId));

  return false;
};

const assertFormInEnabledTier = async (
  companyId,
  { formId, multiAnalysisFormId },
) => {
  const allowed = await isFormInEnabledTier(companyId, {
    formId,
    multiAnalysisFormId,
  });

  if (!allowed) {
    createBadRequestError("این تحلیل در طبقه فعال شرکت شما در دسترس نیست", 403);
  }
};

const assertAnalysisFormAllowed = async (companyId, formId, formType) => {
  await assertFormInEnabledTier(companyId, toTierFormParams(formId, formType));
};

const isMonitoringUnlocked = async (companyId) => {
  if (!companyId) return false;

  const tier4 = await prisma.companyAnalysisTierConfig.findUnique({
    where: {
      companyId_tier: {
        companyId,
        tier: "TIER_4",
      },
    },
    select: {
      isEnabled: true,
      items: {
        select: {
          analysisFormId: true,
          multiAnalysisFormId: true,
        },
      },
    },
  });

  if (!tier4?.isEnabled) return false;

  const singleFormIds = tier4.items
    .map((item) => item.analysisFormId)
    .filter(Boolean);
  const multiFormIds = tier4.items
    .map((item) => item.multiAnalysisFormId)
    .filter(Boolean);

  if (!singleFormIds.length && !multiFormIds.length) return false;

  const finalizedTier4Project = await prisma.project.findFirst({
    where: {
      companyId,
      status: "FINAL_ANALYSIS",
      OR: [
        ...(singleFormIds.length ? [{ formId: { in: singleFormIds } }] : []),
        ...(multiFormIds.length
          ? [{ multiAnalysisFormId: { in: multiFormIds } }]
          : []),
      ],
    },
    select: { id: true },
  });

  return Boolean(finalizedTier4Project);
};

const assertMonitoringUnlocked = async (companyId) => {
  const unlocked = await isMonitoringUnlocked(companyId);

  if (!unlocked) {
    createBadRequestError(
      "پایش استراتژی پس از انجام حداقل یک تحلیل از طبقه ۴ فعال می‌شود",
      403,
    );
  }
};

const unlockMonitoringIfTier4Analysis = async (
  companyId,
  { formId, multiAnalysisFormId },
) => {
  if (!companyId) return;

  const configs = await loadCompanyTierConfigs(companyId);
  const tier4 = configs.find((config) => config.tier === "TIER_4");

  if (!tier4 || !tier4.isEnabled) return;

  const isTier4Item = tier4.items.some((item) => {
    if (formId) return item.analysisFormId === formId;
    if (multiAnalysisFormId) {
      return item.multiAnalysisFormId === multiAnalysisFormId;
    }
    return false;
  });

  if (!isTier4Item) return;

  await prisma.company.updateMany({
    where: {
      id: companyId,
      monitoringUnlockedAt: null,
    },
    data: {
      monitoringUnlockedAt: new Date(),
    },
  });
};

const onProjectFinalized = async (
  companyId,
  { formId, multiAnalysisFormId },
) => {
  await unlockMonitoringIfTier4Analysis(companyId, {
    formId,
    multiAnalysisFormId,
  });
};

const filterFormsByEnabledTiers = async (companyId, forms, type) => {
  const enabledKeys = await getEnabledTierFormKeys(companyId);
  return forms.filter((form) => enabledKeys.has(buildFormKey(type, form.id)));
};

const getCompanyAnalysisTiersService = async (companyId) => {
  if (!companyId) {
    createBadRequestError("کاربر عضو سازمان نیست", 404);
  }

  const [configs, completedFormKeys, monitoringUnlocked] = await Promise.all([
    loadCompanyTierConfigs(companyId),
    loadCompletedFormKeysForCompany(companyId),
    isMonitoringUnlocked(companyId),
  ]);

  const tiers = configs.map((config) => {
    const analyses = config.items.map((item) => formatTierItem(item));
    const completedCount = config.items.filter((item) =>
      completedFormKeys.has(getItemFormKey(item)),
    ).length;

    return {
      tier: config.tier,
      label: TIER_LABELS[config.tier] || config.tier,
      isEnabled: config.isEnabled,
      analyses,
      completedCount,
      totalCount: analyses.length,
    };
  });

  return {
    tiers,
    monitoringUnlocked,
  };
};

module.exports = {
  TIER_LEVELS,
  TIER_LABELS,
  buildFormKey,
  parseFormKey,
  isSingleFormType,
  toTierFormParams,
  isAnalysisAllowed,
  ensureCompanyTierConfigs,
  loadCompanyTierConfigs,
  getEnabledTierFormKeys,
  isFormInEnabledTier,
  assertFormInEnabledTier,
  assertAnalysisFormAllowed,
  isMonitoringUnlocked,
  assertMonitoringUnlocked,
  onProjectFinalized,
  filterFormsByEnabledTiers,
  getCompanyAnalysisTiersService,
  bootstrapCompanyTierConfigs,
};
