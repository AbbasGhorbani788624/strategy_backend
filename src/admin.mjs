import "dotenv/config";
import "./admin-env.mjs";
import express from "express";
import bcrypt from "bcrypt";
import { actions, ValidationError, flat, ListAction, Filter } from "adminjs";
import AdminJS, { ResourceDecorator } from "adminjs";
import AdminJSExpress from "@adminjs/express";
import {
  Database,
  Resource,
  getModelByName,
  convertFilter,
} from "@adminjs/prisma";
import { PrismaClient } from "@prisma/client";
import {
  buildFollowUpResponsesText,
  buildOptionsTextFromRecord,
  componentLoader,
  fillOptionsTextAfterLoad,
  parseBooleanValue,
  parseIntegerValue,
  parseJsonText,
  parseOptionsText,
  questionTypeValues,
  validateQuestionOptions,
  parseFormQuestionOptionsJson,
  validateFormQuestionOptionsForSave,
  parseFollowUpFormQuestionsJson,
  validateFollowUpFormQuestionsForSave,
  parsePromptEditorJson,
  validatePromptEditorSegmentsForSave,
} from "./component-loader.mjs";
import {
  companyBalanceSheetActions,
  companyBasicInfoActions,
  companyIncomeStatementActions,
  companyLicenseCertificateActions,
  companyManagerActions,
  companyMarketActions,
  companyMembershipActions,
  companyProductServiceActions,
  companyResourceCapabilityActions,
  companyShareholderActions,
  keyCustomerActions,
  organizationUnitActions,
  revenueCenterActions,
  userCompetencyActions,
  userEducationActions,
  userInfoActions,
  userTrainingCourseActions,
  companySupplierActions,
  companyRawMaterialActions,
} from "./child-actions-map.mjs";
import { enrichAdminRecordUserIdReference } from "./actions.mjs";
import { syncCompanyInsightService } from "./services/insightService.js";
import { syncIndustryInsightService } from "./services/IndustryInsightService.js";
import { bootstrapCompanyTierConfigs } from "./services/companyAnalysisTierService.js";

import path from "path";
import fs from "fs/promises";
import { fileURLToPath, pathToFileURL } from "url";
import uploadFeature from "@adminjs/upload";
import { validateProfileFieldKey } from "./profileFieldKey.mjs";
import { COMPANY_PROFILE_FIELD_OPTIONS } from "./companyProfileFieldKeys.mjs";
import profileConfig from "./configs/profileConfig.js";

const {
  SHAREHOLDER_TYPES,
  ORGANIZATIONAL_LEVELS,
  DEGREE_TYPES,
  COURSE_LEVELS,
  SKILL_TYPES,
  EXPECTED_LEVELS,
  CURRENT_LEVELS,
  JOB_RELEVANCE,
  IMPORTANCE_LEVELS,
  COMPANY_TYPES,
  COMPANY_STRUCTURE_TYPES,
  MANAGER_ROLES,
  SHAREHOLDER_TYPES_COMPANY,
  SHAREHOLDER_BOARD_MEMBERSHIP,
  ORG_STRUCTURE_LEVELS,
  ORG_UNIT_TYPES,
  PARENT_UNITS,
  revenueCenters,
  types,
  marketPositions,
  revenueShares,
  marketTypes,
  marketPenetration,
  relatedProducts,
  customerCategories,
  productImportance,
  revenueImpact,
  loyaltyLevels,
  shareOfWallet,
  categoryOptions,
  accessLevelOptions,
  rarityOptions,
  imitabilityOptions,
  ACTIVITY_SCOPE,
  BARGAINING_POWER,
  COST_IMPACT_LEVELS,
  PURCHASE_BUDGET_SHARES,
  PROCUREMENT_CATEGORIES,
} = profileConfig;

AdminJS.registerAdapter({
  Database,
  Resource,
});

{
  const baseGetNavigation = ResourceDecorator.prototype.getNavigation;
  ResourceDecorator.prototype.getNavigation = function getNavigationWithOptionalHide() {
    const navigationOption = this.options?.navigation;
    const nav = baseGetNavigation.call(this);
    if (
      navigationOption &&
      typeof navigationOption === "object" &&
      navigationOption.show === false
    ) {
      return {
        name: navigationOption.name ?? nav?.name ?? null,
        icon: navigationOption.icon ?? nav?.icon ?? "",
        show: false,
      };
    }
    return nav;
  };
}

const prisma = new PrismaClient();

const adminJsPackageRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "node_modules",
  "adminjs",
);

let adminJsSortSetterPromise;
let adminJsPopulatorPromise;

const getAdminJsSortSetter = () => {
  adminJsSortSetterPromise ??= import(
    pathToFileURL(
      path.join(
        adminJsPackageRoot,
        "lib/backend/services/sort-setter/sort-setter.js",
      ),
    ).href
  ).then((module) => module.default);
  return adminJsSortSetterPromise;
};

const getAdminJsPopulator = () => {
  adminJsPopulatorPromise ??= import(
    pathToFileURL(
      path.join(adminJsPackageRoot, "lib/backend/utils/populator/populator.js"),
    ).href
  ).then((module) => module.default);
  return adminJsPopulatorPromise;
};

const throwRecordNotFound = () => {
  throw new ValidationError({
    id: { message: "رکورد پیدا نشد." },
  });
};

const buildRecordJson = (resource, data, currentAdmin) =>
  resource.build(data).toJSON(currentAdmin);

const runAfterSaveSideEffect = async (label, callback) => {
  try {
    await callback();
  } catch (error) {
    console.error(`${label}:`, error);
  }
};

const throwFieldValidation = (field, message) => {
  throw new ValidationError({ [field]: { message } });
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function applyFormQuestionOptionQuestionFilter(request) {
  const data = flat.unflatten(request.query ?? {});
  const filters = data.filters ?? {};
  const questionValue = filters.question;

  if (typeof questionValue !== "string" || !questionValue.trim()) {
    return request;
  }

  const text = questionValue.trim();
  if (UUID_REGEX.test(text)) {
    return request;
  }

  const questions = await prisma.formQuestion.findMany({
    where: { label: { contains: text } },
    select: { id: true },
  });

  const newFilters = { ...filters };
  delete newFilters.question;

  if (questions.length === 0) {
    newFilters.questionId = "00000000-0000-4000-8000-000000000000";
  } else if (questions.length === 1) {
    newFilters.questionId = questions[0].id;
  } else {
    request._formQuestionOptionQuestionIds = questions.map((q) => q.id);
  }

  request.query = flat.flatten({ ...data, filters: newFilters });
  return request;
}

async function applyFormQuestionFormTitleFilter(request) {
  const data = flat.unflatten(request.query ?? {});
  const filters = data.filters ?? {};
  const formTitleValue = filters.formTitle;

  if (typeof formTitleValue !== "string" || !formTitleValue.trim()) {
    return request;
  }

  const token = formTitleValue.trim();
  let orConditions = [];

  if (token.startsWith("a:")) {
    const analysisFormId = token.slice(2);
    if (analysisFormId) {
      orConditions = [{ analysisFormId }];
    }
  } else if (token.startsWith("m:")) {
    const multiAnalysisFormId = token.slice(2);
    if (multiAnalysisFormId) {
      orConditions = [{ multiAnalysisFormId }];
    }
  }

  if (!orConditions.length) {
    return request;
  }

  const categories = await prisma.formQuestionCategory.findMany({
    where: { OR: orConditions },
    select: { id: true },
  });
  const categoryIds = categories.map((c) => c.id);

  const newFilters = { ...filters };
  delete newFilters.formTitle;

  request._formQuestionCategoryIds =
    categoryIds.length > 0
      ? categoryIds
      : ["00000000-0000-4000-8000-000000000000"];

  request.query = flat.flatten({ ...data, filters: newFilters });
  return request;
}

const app = express();
app.set("trust proxy", 1);

const PORT = Number(process.env.ADMIN_PORT || 3000);
const ADMIN_ROOT_PATH = process.env.ADMIN_ROOT_PATH || "/admin";

const ANALYSIS_TIER_OPTIONS = [
  { value: "TIER_1", label: "طبقه ۱ (پایین‌ترین)" },
  { value: "TIER_2", label: "طبقه ۲" },
  { value: "TIER_3", label: "طبقه ۳" },
  { value: "TIER_4", label: "طبقه ۴ (بالاترین)" },
];

const getAnalysisTierLabel = (tier) => {
  const normalized = String(tier || "").trim();
  if (!normalized) {
    return "—";
  }

  return (
    ANALYSIS_TIER_OPTIONS.find((option) => option.value === normalized)
      ?.label ?? normalized
  );
};

const enrichCompanyAnalysisTierConfigRecords = async (records = []) => {
  if (!records.length) {
    return;
  }

  const companyIds = [
    ...new Set(records.map((record) => record.params.company).filter(Boolean)),
  ];

  const companies =
    companyIds.length > 0
      ? await prisma.company.findMany({
          where: { id: { in: companyIds } },
          select: { id: true, name: true },
        })
      : [];

  const companyMap = Object.fromEntries(
    companies.map((company) => [company.id, company.name]),
  );

  for (const record of records) {
    const tierLabel = getAnalysisTierLabel(record.params.tier);
    const companyName =
      companyMap[record.params.company] ??
      record.populated?.company?.title ??
      "";

    record.params.tierLabel = tierLabel;
    record.title = companyName ? `${companyName} — ${tierLabel}` : tierLabel;
  }
};

const enrichCompanyAnalysisTierItemRecords = async (records = []) => {
  if (!records.length) {
    return;
  }

  const configIds = [
    ...new Set(
      records
        .map((record) => normalizeAdminReferenceId(record.params.config))
        .filter(Boolean),
    ),
  ];

  const configs =
    configIds.length > 0
      ? await prisma.companyAnalysisTierConfig.findMany({
          where: { id: { in: configIds } },
          select: { id: true, tier: true },
        })
      : [];

  const tierLabelMap = Object.fromEntries(
    configs.map((config) => [config.id, getAnalysisTierLabel(config.tier)]),
  );

  for (const record of records) {
    const configId = normalizeAdminReferenceId(record.params.config);
    const config = configs.find((item) => item.id === configId);
    const tierLabel = config ? getAnalysisTierLabel(config.tier) : "—";

    record.params.tierLabel = tierLabel;
    if (config?.tier) {
      record.params.tierSelection = config.tier;
    }
    record.populated = record.populated ?? {};
    record.populated.config = {
      params: {
        id: configId,
        tier: config?.tier,
      },
      title: tierLabel,
    };
  }
};

const normalizeAdminReferenceId = (value) => {
  if (value == null || value === "") {
    return null;
  }

  if (typeof value === "string") {
    return value.trim() || null;
  }

  if (typeof value === "object" && value.id) {
    return String(value.id).trim() || null;
  }

  return String(value).trim() || null;
};

const normalizeAnalysisTierValue = (tier) => {
  const normalized = String(tier || "").trim();
  if (!normalized) {
    return null;
  }

  const byValue = ANALYSIS_TIER_OPTIONS.find(
    (option) => option.value === normalized,
  );
  if (byValue) {
    return byValue.value;
  }

  const byLabel = ANALYSIS_TIER_OPTIONS.find(
    (option) => option.label === normalized,
  );
  return byLabel?.value ?? normalized;
};

const resolveCompanyAnalysisTierConfigId = async (companyId, tier) => {
  const normalizedCompanyId = normalizeAdminReferenceId(companyId);
  const normalizedTier = normalizeAnalysisTierValue(tier);

  if (!normalizedCompanyId || !normalizedTier) {
    return null;
  }

  const config = await prisma.companyAnalysisTierConfig.findUnique({
    where: {
      companyId_tier: {
        companyId: normalizedCompanyId,
        tier: normalizedTier,
      },
    },
    select: { id: true },
  });

  return config?.id ?? null;
};

const ensureCompanyAnalysisTierConfigId = async (companyId, tier) => {
  const normalizedCompanyId = normalizeAdminReferenceId(companyId);
  const normalizedTier = normalizeAnalysisTierValue(tier);

  if (!normalizedCompanyId || !normalizedTier) {
    return null;
  }

  let configId = await resolveCompanyAnalysisTierConfigId(
    normalizedCompanyId,
    normalizedTier,
  );

  if (configId) {
    return configId;
  }

  const existingCount = await prisma.companyAnalysisTierConfig.count({
    where: { companyId: normalizedCompanyId },
  });

  if (existingCount === 0) {
    await bootstrapCompanyTierConfigs(normalizedCompanyId);
    configId = await resolveCompanyAnalysisTierConfigId(
      normalizedCompanyId,
      normalizedTier,
    );
  }

  return configId;
};

const prepareCompanyAnalysisTierItemPayload = async (request, context) => {
  const payload = request.payload || {};
  const recordParams = context?.record?.params || {};
  const companyId = normalizeAdminReferenceId(
    payload.company || payload.companyId || recordParams.company,
  );
  let tier = normalizeAnalysisTierValue(
    payload.tierSelection || payload.tier || recordParams.tierSelection,
  );

  if (!tier && recordParams.config) {
    const existingConfig = await prisma.companyAnalysisTierConfig.findUnique({
      where: { id: recordParams.config },
      select: { tier: true },
    });
    tier = existingConfig?.tier || null;
  }

  const analysisFormId =
    payload.analysisForm ||
    payload.analysisFormId ||
    recordParams.analysisForm ||
    null;
  const multiAnalysisFormId =
    payload.multiAnalysisForm ||
    payload.multiAnalysisFormId ||
    recordParams.multiAnalysisForm ||
    null;

  if (!companyId) {
    throw new ValidationError({
      company: { message: "ابتدا شرکت را انتخاب کنید" },
    });
  }

  if (!tier) {
    throw new ValidationError({
      tierSelection: { message: "بعد از شرکت، طبقه را انتخاب کنید" },
    });
  }

  const configId = await ensureCompanyAnalysisTierConfigId(companyId, tier);

  if (!configId) {
    throw new ValidationError({
      tierSelection: {
        message:
          "طبقه‌ای برای این شرکت یافت نشد. از صفحه شرکت «مدیریت طبقات تحلیل» را بزنید",
      },
    });
  }

  if (!analysisFormId && !multiAnalysisFormId) {
    throw new ValidationError({
      analysisForm: {
        message: "حداقل یکی از فرم تکی یا چندگانه باید انتخاب شود",
      },
    });
  }

  if (analysisFormId && multiAnalysisFormId) {
    throw new ValidationError({
      analysisForm: {
        message: "فقط یکی از فرم تکی یا چندگانه را انتخاب کنید",
      },
    });
  }

  payload.company = companyId;
  payload.companyId = companyId;
  payload.config = configId;
  payload.configId = configId;
  payload.analysisFormId = analysisFormId;
  payload.multiAnalysisFormId = multiAnalysisFormId;
  delete payload.tierSelection;

  return request;
};

async function applyProjectPlanActionProjectFilter(request) {
  const data = flat.unflatten(request.query ?? {});
  const filters = data.filters ?? {};
  const projectId = normalizeAdminReferenceId(filters.project);

  const newFilters = { ...filters };
  delete newFilters.project;
  delete newFilters.planId;

  if (projectId) {
    const plan = await prisma.projectPlan.findUnique({
      where: { projectId },
      select: { id: true },
    });

    // Prisma adapter exposes `plan` (reference), not read-only scalar `planId`
    newFilters.plan = plan?.id ?? "00000000-0000-4000-8000-000000000000";
  }

  request.query = flat.flatten({ ...data, filters: newFilters });
  return request;
}

async function applyIndustryInsightCompanyFilter(request) {
  const data = flat.unflatten(request.query ?? {});
  const filters = data.filters ?? {};
  const companyId = normalizeAdminReferenceId(filters.company);

  if (!companyId) {
    return request;
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { industry: true },
  });

  const newFilters = { ...filters };
  delete newFilters.company;

  const industry = company?.industry?.trim();
  if (!industry) {
    newFilters.industryName = "__NO_INDUSTRY_INSIGHT_MATCH__";
  } else {
    newFilters.industryName = industry;
  }

  request.query = flat.flatten({ ...data, filters: newFilters });
  return request;
}

const isEmptyAdminFilterValue = (value) =>
  value === "" || value === undefined || value === null;

const VIRTUAL_LIST_FILTER_KEYS = new Set([
  "company",
  "user",
  "project",
  "tierSelection",
  "config",
  "formTitle",
]);

/** Populated before admin.initialize(); shared reference on FormQuestion.formTitle */
const formQuestionAnalysisTitleFilterOptions = [];

async function loadFormQuestionAnalysisTitleFilterOptions() {
  formQuestionAnalysisTitleFilterOptions.length = 0;

  const [analysisForms, multiForms] = await Promise.all([
    prisma.analysisForm.findMany({
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
    prisma.multiAnalysisForm.findMany({
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  for (const form of analysisForms) {
    formQuestionAnalysisTitleFilterOptions.push({
      value: `a:${form.id}`,
      label: form.title,
    });
  }

  for (const form of multiForms) {
    formQuestionAnalysisTitleFilterOptions.push({
      value: `m:${form.id}`,
      label: form.title,
    });
  }
}

async function sanitizePrismaAdapterListFilters(request, context) {
  const data = flat.unflatten(request.query ?? {});
  const filters = data.filters ?? {};
  const resource = context?.resource;

  if (!resource?.property) {
    return request;
  }

  const newFilters = {};

  for (const [key, value] of Object.entries(filters)) {
    if (isEmptyAdminFilterValue(value)) {
      continue;
    }

    if (key === "company") {
      if (resource.property("companyId")) {
        const companyId = normalizeAdminReferenceId(value);
        if (companyId) {
          newFilters.companyId = companyId;
        }
      } else {
        newFilters.company = value;
      }
      continue;
    }

    if (!resource.property(key)) {
      if (VIRTUAL_LIST_FILTER_KEYS.has(key)) {
        newFilters[key] = value;
      }
      continue;
    }

    newFilters[key] = value;
  }

  request.query = flat.flatten({ ...data, filters: newFilters });
  return request;
}

async function applyUserRelationCompanyFilter(request, multiUserIdsRequestKey) {
  const data = flat.unflatten(request.query ?? {});
  const filters = data.filters ?? {};
  const companyId = normalizeAdminReferenceId(filters.company);

  if (!companyId) {
    return request;
  }

  const users = await prisma.user.findMany({
    where: { companyId },
    select: { id: true },
  });

  const newFilters = { ...filters };
  delete newFilters.company;

  const userIds = users.map((user) => user.id);

  if (userIds.length === 0) {
    newFilters.userId = "00000000-0000-4000-8000-000000000000";
  } else if (userIds.length === 1) {
    newFilters.userId = userIds[0];
  } else {
    request[multiUserIdsRequestKey] = userIds;
  }

  request.query = flat.flatten({ ...data, filters: newFilters });
  return request;
}

async function applyUserInfoCompanyFilter(request) {
  return applyUserRelationCompanyFilter(request, "_userInfoCompanyUserIds");
}

async function applyUserEducationCompanyFilter(request) {
  return applyUserRelationCompanyFilter(request, "_userEducationCompanyUserIds");
}

async function applyUserTrainingCourseCompanyFilter(request) {
  return applyUserRelationCompanyFilter(
    request,
    "_userTrainingCourseCompanyUserIds",
  );
}

async function applyUserCompetencyCompanyFilter(request) {
  return applyUserRelationCompanyFilter(
    request,
    "_userCompetencyCompanyUserIds",
  );
}

const runUserLinkedResourceListWithCompanyUserIds = (
  modelName,
  multiUserIdsRequestKey,
) => {
  const prismaModel = prisma[modelName.charAt(0).toLowerCase() + modelName.slice(1)];

  return async (request, response, context) => {
    const userIds = request[multiUserIdsRequestKey];
    if (!userIds?.length) {
      return ListAction.handler(request, response, context);
    }

    const { query } = request;
    const {
      sortBy,
      direction,
      filters = {},
      page,
      perPage: perPageRaw,
    } = flat.unflatten(query || {});
    const { resource, _admin, currentAdmin } = context;

    const perPage = perPageRaw
      ? Math.min(+perPageRaw, 500)
      : (_admin.options.settings?.defaultPerPage ?? 10);
    const pageNum = Number(page) || 1;

    const listProperties = resource.decorate().getListProperties();
    const firstProperty = listProperties.find((p) => p.isSortable());
    let sort;
    if (firstProperty) {
      const sortSetter = await getAdminJsSortSetter();
      sort = sortSetter(
        { sortBy, direction },
        firstProperty.name(),
        resource.decorate().options,
      );
    }

    const filter = await new Filter(filters, resource).populate(context);
    const where = {
      ...convertFilter(getModelByName(modelName).fields, filter),
      userId: { in: userIds },
    };

    const orderBy = resource.buildSortBy(sort);
    const [results, total] = await Promise.all([
      prismaModel.findMany({
        where,
        skip: (pageNum - 1) * perPage,
        take: perPage,
        orderBy,
      }),
      prismaModel.count({ where }),
    ]);

    const populator = await getAdminJsPopulator();
    const records = results.map((result) =>
      resource.build(resource.prepareReturnValues(result)),
    );
    const populatedRecords = await populator(records, context);
    context.records = populatedRecords;

    return {
      meta: {
        total,
        perPage,
        page: pageNum,
        direction: sort?.direction,
        sortBy: sort?.sortBy,
      },
      records: populatedRecords.map((record) => record.toJSON(currentAdmin)),
    };
  };
};

async function applyCompanyAnalysisTierItemFilters(request) {
  const data = flat.unflatten(request.query ?? {});
  const filters = data.filters ?? {};
  let tierSelection = filters.tierSelection;

  if (!tierSelection && filters.config) {
    const legacyConfigId = normalizeAdminReferenceId(filters.config);
    if (legacyConfigId) {
      const legacyConfig = await prisma.companyAnalysisTierConfig.findUnique({
        where: { id: legacyConfigId },
        select: { tier: true },
      });
      tierSelection = legacyConfig?.tier ?? null;
    }
  }

  if (!tierSelection) {
    return request;
  }

  const tier = normalizeAnalysisTierValue(tierSelection);
  const companyId = normalizeAdminReferenceId(filters.company);
  const where = { tier };

  if (companyId) {
    where.companyId = companyId;
  }

  const configs = await prisma.companyAnalysisTierConfig.findMany({
    where,
    select: { id: true },
  });

  const newFilters = { ...filters };
  delete newFilters.tierSelection;
  delete newFilters.config;

  if (configs.length === 0) {
    newFilters.config = "00000000-0000-4000-8000-000000000000";
  } else if (configs.length === 1) {
    newFilters.config = configs[0].id;
  } else {
    request._companyAnalysisTierItemConfigIds = configs.map(
      (config) => config.id,
    );
  }

  request.query = flat.flatten({ ...data, filters: newFilters });
  return request;
}

const buildAdminResourceListUrl = (resourceId, filters = {}) => {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value != null && value !== "") {
      params.set(`filters.${key}`, String(value));
    }
  }

  const query = params.toString();
  return query
    ? `${ADMIN_ROOT_PATH}/resources/${resourceId}?${query}`
    : `${ADMIN_ROOT_PATH}/resources/${resourceId}`;
};

const ADMIN_COOKIE_SECRET =
  process.env.ADMIN_COOKIE_SECRET || "unsafe-admin-cookie-secret";


const companyProfileNavigation = {
  name: "پروفایل شرکت",
  icon: "Building",
};

const userManagementNavigation = {
  name: "مدیریت کاربران",
  icon: "User",
};

const userProfileNavigation = userManagementNavigation;

const analysisFormsNavigation = {
  name: "تحلیل‌ها",
  icon: "FileText",
};

const followUpNavigation = {
  name: "پیگیری‌ها",
  icon: "Clipboard",
};

const formQuestionsNavigation = {
  name: "سوالات",
  icon: "HelpCircle",
};

const promptsNavigation = {
  name: "پرامپت‌ها",
  icon: "Terminal",
};

const promptsNavigationHidden = {
  ...promptsNavigation,
  show: false,
};

const followUpStatusValues = [
  { value: "PENDING", label: "در انتظار" },
  { value: "ANSWERED", label: "پاسخ داده شده" },
];

const strategyNavigation = {
  name: "پایش",
  icon: "Target",
  show: false,
};

const securityNavigationHidden = {
  name: "امنیت",
  icon: "Key",
  show: false,
};

const strategyFrameworkValues = [
  { value: "BSC", label: "BSC" },
  { value: "OKR", label: "OKR" },
];

const strategyStatusValues = [
  { value: "DRAFT", label: "پیش‌نویس" },
  { value: "IN_PROGRESS", label: "در حال انجام" },
  { value: "APPROVED", label: "تأیید شده" },
  { value: "ACTIVE", label: "فعال" },
  { value: "COMPLETED", label: "تکمیل شده" },
  { value: "ARCHIVED", label: "بایگانی" },
];

const strategyStateValues = [
  { value: "STRATEGY_TRANSLATION", label: "ترجمه استراتژی" },
  { value: "MAP_GENERATION", label: "تولید نقشه" },
  { value: "MAP_VALIDATION", label: "اعتبارسنجی نقشه" },
  { value: "KPI_GENERATION", label: "تولید KPI" },
  { value: "KPI_VALIDATION", label: "اعتبارسنجی KPI" },
  { value: "TABLE_GENERATION", label: "تولید جدول" },
  { value: "TABLE_VALIDATION", label: "اعتبارسنجی جدول" },
  { value: "READY_FOR_MONITORING", label: "آماده پایش" },
  { value: "MONITORING", label: "پایش" },
  { value: "FAILED", label: "ناموفق" },
];

const strategyMapStatusValues = [
  { value: "DRAFT", label: "پیش‌نویس" },
  { value: "VALIDATING", label: "در حال اعتبارسنجی" },
  { value: "APPROVED", label: "تأیید شده" },
];

const strategyMeasureStatusValues = [
  { value: "DRAFT", label: "پیش‌نویس" },
  { value: "VALIDATING", label: "در حال اعتبارسنجی" },
  { value: "APPROVED", label: "تأیید شده" },
];

const strategyMonitoringStatusValues = [
  { value: "DRAFT", label: "پیش‌نویس" },
  { value: "LOCKED", label: "قفل شده" },
];

const measurementFrequencyValues = [
  { value: "DAILY", label: "روزانه" },
  { value: "WEEKLY", label: "هفتگی" },
  { value: "MONTHLY", label: "ماهانه" },
  { value: "QUARTERLY", label: "فصلی" },
  { value: "YEARLY", label: "سالانه" },
];

const measureDesirabilityValues = [
  { value: "INCREASING", label: "افزایشی" },
  { value: "DECREASING", label: "کاهشی" },
  { value: "ON_TARGET", label: "تطابق با هدف" },
];

const bscPerspectiveValues = [
  { value: "FINANCIAL", label: "مالی" },
  { value: "CUSTOMER", label: "مشتری" },
  { value: "INTERNAL_PROCESS", label: "فرآیند داخلی" },
  { value: "LEARNING_GROWTH", label: "یادگیری و رشد" },
];

const learningGrowthCategoryValues = [
  { value: "HUMAN_CAPITAL", label: "سرمایه انسانی" },
  { value: "INFORMATION_CAPITAL", label: "سرمایه اطلاعاتی" },
  { value: "ORGANIZATIONAL_CAPITAL", label: "سرمایه سازمانی" },
];

const strategyApprovalTypeValues = [
  { value: "MAP", label: "نقشه" },
  { value: "MEASURES", label: "سنجه‌ها" },
];

const projectPlanStatusValues = [
  { value: "DRAFT", label: "پیش‌نویس" },
  { value: "LOCKED", label: "قفل شده" },
  { value: "IN_PROGRESS", label: "در حال انجام" },
  { value: "COMPLETED", label: "تکمیل شده" },
];

const projectPlanActionStatusValues = [
  { value: "NOT_STARTED", label: "شروع نشده" },
  { value: "IN_PROGRESS", label: "در حال انجام" },
  { value: "COMPLETED", label: "تکمیل شده" },
];
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.join(__dirname, "..");

const UPLOADS_ROOT = path.join(PROJECT_ROOT, "uploads");
const UPLOADS_FILES_ROOT = path.join(UPLOADS_ROOT, "file");
const ADMIN_UPLOAD_TMP = path.join(PROJECT_ROOT, "tmp", "admin-uploads");

await fs.mkdir(UPLOADS_ROOT, { recursive: true });
await fs.mkdir(UPLOADS_FILES_ROOT, { recursive: true });
await fs.mkdir(ADMIN_UPLOAD_TMP, { recursive: true });

process.env.TMP = ADMIN_UPLOAD_TMP;
process.env.TEMP = ADMIN_UPLOAD_TMP;
process.env.TMPDIR = ADMIN_UPLOAD_TMP;

app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

const normalizeUploadPublicPath = (filePath) => {
  if (!filePath || typeof filePath !== "string") {
    return null;
  }

  const normalized = filePath.replaceAll("\\", "/");
  const uploadsIndex = normalized.indexOf("uploads/");

  if (uploadsIndex !== -1) {
    return `/${normalized.slice(uploadsIndex)}`;
  }

  return normalized.startsWith("/") ? normalized : `/${normalized}`;
};

const resolveUploadAbsolutePath = (filePath) => {
  const publicPath = normalizeUploadPublicPath(filePath);
  if (!publicPath || !publicPath.startsWith("/uploads/")) {
    return null;
  }

  const absolutePath = path.resolve(PROJECT_ROOT, publicPath.slice(1));
  const uploadsRoot = path.resolve(UPLOADS_ROOT);

  if (
    absolutePath !== uploadsRoot &&
    !absolutePath.startsWith(`${uploadsRoot}${path.sep}`)
  ) {
    return null;
  }

  return absolutePath;
};

app.get("/download-upload", async (req, res) => {
  const absolutePath = resolveUploadAbsolutePath(String(req.query.path || ""));

  if (!absolutePath) {
    return res.status(400).send("مسیر فایل نامعتبر است");
  }

  try {
    await fs.access(absolutePath);
  } catch {
    return res.status(404).send("فایل پیدا نشد");
  }

  return res.download(absolutePath, path.basename(absolutePath));
});

const Components = {
  DownloadFileAttachment: componentLoader.add(
    "DownloadFileAttachment",
    path.join(__dirname, "admin-components", "DownloadFileAttachment"),
  ),
  AsyncRecordActionLoader: componentLoader.add(
    "AsyncRecordActionLoader",
    path.join(__dirname, "admin-components", "AsyncRecordActionLoader"),
  ),
  ProfileFieldKeyMultiSelect: componentLoader.add(
    "ProfileFieldKeyMultiSelect",
    path.join(__dirname, "admin-components", "ProfileFieldKeyMultiSelect"),
  ),
  FormQuestionOptionsEditor: componentLoader.add(
    "FormQuestionOptionsEditor",
    path.join(__dirname, "admin-components", "FormQuestionOptionsEditor"),
  ),
  FollowUpFormQuestionsEditor: componentLoader.add(
    "FollowUpFormQuestionsEditor",
    path.join(__dirname, "admin-components", "FollowUpFormQuestionsEditor"),
  ),
  PromptDefinitionEditor: componentLoader.add(
    "PromptDefinitionEditor",
    path.join(__dirname, "admin-components", "PromptDefinitionEditor"),
  ),
};

const TIMESTAMP_LIST_FILTER_FIELDS = ["createdAt", "updatedAt"];

const isIdLikePropertyName = (name) => name === "id" || name.endsWith("Id");

const stripTimestampFieldsFromPropertyList = (propertyNames) => {
  if (!Array.isArray(propertyNames)) {
    return propertyNames;
  }

  return propertyNames.filter(
    (name) => !TIMESTAMP_LIST_FILTER_FIELDS.includes(name),
  );
};

const LIST_PROPERTY_ID_EXCEPTIONS = ["companyId"];

const stripIdLikeFieldsFromPropertyList = (propertyNames) => {
  if (!Array.isArray(propertyNames)) {
    return propertyNames;
  }

  return propertyNames.filter(
    (name) =>
      LIST_PROPERTY_ID_EXCEPTIONS.includes(name) ||
      !isIdLikePropertyName(name),
  );
};

const propertyRequestsListVisibility = (property = {}) => {
  const visibility = property.isVisible;

  if (visibility === true) {
    return true;
  }

  if (typeof visibility === "object" && visibility !== null) {
    return visibility.list === true;
  }

  return false;
};

const stripGlobalListFilterFieldsFromPropertyList = (propertyNames) =>
  stripIdLikeFieldsFromPropertyList(
    stripTimestampFieldsFromPropertyList(propertyNames),
  );

const mergePropertyListFilterVisibility = (
  property,
  { hideList, hideFilter },
) => {
  const visibility = property.isVisible;

  if (visibility === false) {
    return {
      ...property,
      isVisible: {
        list: false,
        filter: false,
        show: false,
        edit: false,
        new: false,
      },
    };
  }

  const visibilityObject =
    typeof visibility === "object" && visibility !== null
      ? { ...visibility }
      : {};

  if (hideList) {
    visibilityObject.list = false;
  }

  if (hideFilter) {
    visibilityObject.filter = false;
  }

  return {
    ...property,
    isVisible: visibilityObject,
  };
};

const applyGlobalTimestampVisibility = (options = {}) => {
  const properties = { ...(options.properties ?? {}) };

  for (const field of TIMESTAMP_LIST_FILTER_FIELDS) {
    properties[field] = mergePropertyListFilterVisibility(
      properties[field] ?? {},
      { hideList: true, hideFilter: true },
    );
  }

  return {
    ...options,
    properties,
  };
};

const applyGlobalIdFieldVisibility = (modelName, options = {}) => {
  const properties = { ...(options.properties ?? {}) };

  const modelFieldNames =
    getModelByName(modelName)?.fields?.map((field) => field.name) ?? [];

  const idLikeFieldNames = new Set([
    ...modelFieldNames.filter((name) => isIdLikePropertyName(name)),
    ...Object.keys(properties).filter((name) => isIdLikePropertyName(name)),
  ]);

  for (const fieldName of idLikeFieldNames) {
    const propertyConfig = properties[fieldName] ?? {};
    const hideList =
      fieldName === "companyId" && propertyRequestsListVisibility(propertyConfig)
        ? false
        : true;

    properties[fieldName] = mergePropertyListFilterVisibility(propertyConfig, {
      hideList,
      hideFilter: false,
    });
  }

  return {
    ...options,
    properties,
    ...(options.listProperties
      ? {
          listProperties: stripGlobalListFilterFieldsFromPropertyList(
            options.listProperties,
          ),
        }
      : {}),
    ...(options.filterProperties
      ? {
          filterProperties: stripTimestampFieldsFromPropertyList(
            options.filterProperties,
          ),
        }
      : {}),
  };
};

const normalizePrismaResourceOptions = (modelName, options = {}) =>
  applyGlobalIdFieldVisibility(
    modelName,
    applyGlobalTimestampVisibility(options),
  );

const prismaResource = (modelName, options = {}) => {
  const normalizedOptions = normalizePrismaResourceOptions(modelName, options);
  const { actions, features, ...restOptions } = normalizedOptions;
  const customActions = { ...(actions || {}) };
  const customNewAction = customActions.new;
  const customEditAction = { ...(customActions.edit ?? {}) };
  const customListAction = { ...(customActions.list ?? {}) };
  delete customActions.new;
  delete customActions.edit;
  delete customActions.list;

  const listBeforeHooks = [sanitizePrismaAdapterListFilters];
  if (customListAction.before) {
    listBeforeHooks.push(
      ...(Array.isArray(customListAction.before)
        ? customListAction.before
        : [customListAction.before]),
    );
  }
  delete customListAction.before;

  const resourceOptions = {
    resource: {
      model: getModelByName(modelName),
      client: prisma,
    },
    options: {
      ...restOptions,
      actions: {
        new: {
          isAccessible: true,
          ...customNewAction,
          before: async (request, context) => {
            if (request.payload?.password && modelName === "User") {
              request.payload.password = await bcrypt.hash(
                request.payload.password,
                10,
              );
            }

            if (customNewAction?.before) {
              return customNewAction.before(request, context);
            }

            return request;
          },
        },
        edit: {
          isAccessible: true,
          ...customEditAction,
          before: async (request, context) => {
            if (request.payload?.password && modelName === "User") {
              if (request.payload.password) {
                request.payload.password = await bcrypt.hash(
                  request.payload.password,
                  10,
                );
              } else {
                delete request.payload.password;
              }
            }

            if (customEditAction?.before) {
              return customEditAction.before(request, context);
            }

            return request;
          },
        },
        delete: {
          isAccessible: true,
        },
        bulkDelete: {
          isAccessible: true,
        },
        show: {
          isAccessible: true,
        },
        list: {
          isAccessible: true,
          ...customListAction,
          before:
            listBeforeHooks.length === 1
              ? listBeforeHooks[0]
              : listBeforeHooks,
        },
        ...customActions,
      },
    },
    ...(features ? { features } : {}),
  };

  return resourceOptions;
};

function validateAdminProfileFieldPayload(request) {
  if (request.method !== "post") {
    return;
  }

  const { profileFieldKey } = request.payload || {};

  try {
    validateProfileFieldKey(profileFieldKey);
  } catch (error) {
    throw new ValidationError({
      profileFieldKey: {
        message: error.message,
      },
    });
  }
}

const DUPLICATE_ANALYSIS_FORM_PROFILE_FIELD_MESSAGE =
  "این فیلد پروفایل برای همین تحلیل تکی قبلاً ثبت شده است؛ امکان افزودن رکورد تکراری وجود ندارد.";

const DUPLICATE_MULTI_ANALYSIS_FORM_PROFILE_FIELD_MESSAGE =
  "این فیلد پروفایل برای همین تحلیل صفر تا صد قبلاً ثبت شده است؛ امکان افزودن رکورد تکراری وجود ندارد.";

const isPrismaUniqueConstraintError = (error) =>
  error?.code === "P2002" ||
  String(error?.message ?? "").includes("Unique constraint failed");

const assertUniqueAnalysisFormProfileField = async (request, recordId = null) => {
  if (request.method !== "post") {
    return;
  }

  const profileFieldKey = String(request.payload?.profileFieldKey ?? "").trim();
  const formId = normalizeAdminReferenceId(
    request.payload?.formId ?? request.payload?.form,
  );

  if (!formId || !profileFieldKey) {
    return;
  }

  const existing = await prisma.analysisFormProfileField.findFirst({
    where: {
      formId,
      profileFieldKey,
      ...(recordId ? { NOT: { id: recordId } } : {}),
    },
    select: { id: true },
  });

  if (existing) {
    throw new ValidationError({
      profileFieldKey: {
        message: DUPLICATE_ANALYSIS_FORM_PROFILE_FIELD_MESSAGE,
      },
    });
  }
};

const assertUniqueMultiAnalysisFormProfileField = async (
  request,
  recordId = null,
) => {
  if (request.method !== "post") {
    return;
  }

  const profileFieldKey = String(request.payload?.profileFieldKey ?? "").trim();
  const multiAnalysisFormId = normalizeAdminReferenceId(
    request.payload?.multiAnalysisFormId ?? request.payload?.multiAnalysisForm,
  );

  if (!multiAnalysisFormId || !profileFieldKey) {
    return;
  }

  const existing = await prisma.multiAnalysisFormProfileField.findFirst({
    where: {
      multiAnalysisFormId,
      profileFieldKey,
      ...(recordId ? { NOT: { id: recordId } } : {}),
    },
    select: { id: true },
  });

  if (existing) {
    throw new ValidationError({
      profileFieldKey: {
        message: DUPLICATE_MULTI_ANALYSIS_FORM_PROFILE_FIELD_MESSAGE,
      },
    });
  }
};

const withAdminDuplicateProfileFieldError =
  (message, handler) =>
  async (request, response, context) => {
    try {
      return await handler(request, response, context);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      if (isPrismaUniqueConstraintError(error)) {
        throw new ValidationError({
          profileFieldKey: { message },
        });
      }

      throw error;
    }
  };

const parseProfileFieldKeysFromPayload = (payload = {}) => {
  const raw = payload.profileFieldKeys ?? payload.profileFieldKey;

  if (Array.isArray(raw)) {
    return [
      ...new Set(raw.map((item) => String(item).trim()).filter(Boolean)),
    ];
  }

  const flatProfileFieldKeys = Object.keys(payload)
    .filter((key) => /^profileFieldKeys\.(\d+)$/.test(key))
    .sort(
      (left, right) =>
        Number(left.split(".")[1]) - Number(right.split(".")[1]),
    )
    .map((key) => String(payload[key] ?? "").trim())
    .filter(Boolean);

  if (flatProfileFieldKeys.length) {
    return [...new Set(flatProfileFieldKeys)];
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) {
      return [];
    }

    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return [
            ...new Set(
              parsed.map((item) => String(item).trim()).filter(Boolean),
            ),
          ];
        }
      } catch {
        return [trimmed];
      }
    }

    return [trimmed];
  }

  if (raw && typeof raw === "object") {
    return [
      ...new Set(
        Object.values(raw)
          .map((item) => String(item).trim())
          .filter(Boolean),
      ),
    ];
  }

  return [];
};

const validateProfileFieldKeysForCreate = (profileFieldKeys) => {
  if (!profileFieldKeys.length) {
    throw new ValidationError({
      profileFieldKeys: {
        message: "حداقل یک فیلد پروفایل انتخاب کنید.",
      },
    });
  }

  const errors = {};

  for (const profileFieldKey of profileFieldKeys) {
    try {
      validateProfileFieldKey(profileFieldKey);
    } catch (error) {
      errors.profileFieldKeys = {
        message: error.message,
      };
      break;
    }
  }

  if (Object.keys(errors).length) {
    throw new ValidationError(errors);
  }
};

const buildBulkCreateAnalysisFormProfileFieldHandler = () => {
  return async (request, response, context) => {
    const { resource, h, currentAdmin } = context;

    if (request.method === "get") {
      return {
        resource: resource.decorate().toJSON(currentAdmin),
        record: {
          params: { isArray: false, profileFieldKeys: [] },
          errors: {},
          populated: {},
        },
      };
    }

    const payload = request.payload ?? {};
    const formId = normalizeAdminReferenceId(
      payload.formId ?? payload.form,
    );
    const profileFieldKeys = parseProfileFieldKeysFromPayload(payload);
    const isArray = parseBooleanValue(payload.isArray) ?? false;

    const errors = {};

    if (!formId) {
      errors.form = { message: "انتخاب تحلیل تکی الزامی است." };
    }

    validateProfileFieldKeysForCreate(profileFieldKeys);

    if (Object.keys(errors).length) {
      throw new ValidationError(errors);
    }

    const duplicateKeys = [];
    const createdIds = [];

    for (const profileFieldKey of profileFieldKeys) {
      const existing = await prisma.analysisFormProfileField.findFirst({
        where: { formId, profileFieldKey },
        select: { id: true },
      });

      if (existing) {
        duplicateKeys.push(profileFieldKey);
        continue;
      }

      try {
        const created = await prisma.analysisFormProfileField.create({
          data: {
            formId,
            profileFieldKey,
            isArray,
          },
        });
        createdIds.push(created.id);
      } catch (error) {
        if (isPrismaUniqueConstraintError(error)) {
          duplicateKeys.push(profileFieldKey);
          continue;
        }
        throw error;
      }
    }

    if (!createdIds.length) {
      throw new ValidationError({
        profileFieldKeys: {
          message: DUPLICATE_ANALYSIS_FORM_PROFILE_FIELD_MESSAGE,
        },
      });
    }

    const duplicateNotice =
      duplicateKeys.length > 0
        ? ` (${duplicateKeys.length} مورد تکراری نادیده گرفته شد)`
        : "";

    return {
      redirectUrl: h.resourceUrl({
        resourceId: resource._decorated?.id() || resource.id(),
      }),
      notice: {
        message: `${createdIds.length} فیلد پروفایل با موفقیت ایجاد شد${duplicateNotice}`,
        type: duplicateKeys.length ? "info" : "success",
      },
    };
  };
};

const buildBulkCreateMultiAnalysisFormProfileFieldHandler = () => {
  return async (request, response, context) => {
    const { resource, h, currentAdmin } = context;

    if (request.method === "get") {
      return {
        resource: resource.decorate().toJSON(currentAdmin),
        record: {
          params: { isArray: false, profileFieldKeys: [] },
          errors: {},
          populated: {},
        },
      };
    }

    const payload = request.payload ?? {};
    const multiAnalysisFormId = normalizeAdminReferenceId(
      payload.multiAnalysisFormId ?? payload.multiAnalysisForm,
    );
    const profileFieldKeys = parseProfileFieldKeysFromPayload(payload);
    const isArray = parseBooleanValue(payload.isArray) ?? false;

    const errors = {};

    if (!multiAnalysisFormId) {
      errors.multiAnalysisForm = {
        message: "انتخاب تحلیل صفر تا صد الزامی است.",
      };
    }

    validateProfileFieldKeysForCreate(profileFieldKeys);

    if (Object.keys(errors).length) {
      throw new ValidationError(errors);
    }

    const duplicateKeys = [];
    const createdIds = [];

    for (const profileFieldKey of profileFieldKeys) {
      const existing = await prisma.multiAnalysisFormProfileField.findFirst({
        where: { multiAnalysisFormId, profileFieldKey },
        select: { id: true },
      });

      if (existing) {
        duplicateKeys.push(profileFieldKey);
        continue;
      }

      try {
        const created = await prisma.multiAnalysisFormProfileField.create({
          data: {
            multiAnalysisFormId,
            profileFieldKey,
            isArray,
          },
        });
        createdIds.push(created.id);
      } catch (error) {
        if (isPrismaUniqueConstraintError(error)) {
          duplicateKeys.push(profileFieldKey);
          continue;
        }
        throw error;
      }
    }

    if (!createdIds.length) {
      throw new ValidationError({
        profileFieldKeys: {
          message: DUPLICATE_MULTI_ANALYSIS_FORM_PROFILE_FIELD_MESSAGE,
        },
      });
    }

    const duplicateNotice =
      duplicateKeys.length > 0
        ? ` (${duplicateKeys.length} مورد تکراری نادیده گرفته شد)`
        : "";

    return {
      redirectUrl: h.resourceUrl({
        resourceId: resource._decorated?.id() || resource.id(),
      }),
      notice: {
        message: `${createdIds.length} فیلد پروفایل با موفقیت ایجاد شد${duplicateNotice}`,
        type: duplicateKeys.length ? "info" : "success",
      },
    };
  };
};

function validateMultiAnalysisRequiredFormPayload(request) {
  if (request.method !== "post") {
    return;
  }

  const payload = request.payload || {};
  const type = payload.type || "SINGLE";

  const multiAnalysisFormId = String(
    payload.multiAnalysisFormId || payload.multiAnalysisForm || "",
  ).trim();
  const formId = String(payload.formId || payload.form || "").trim();
  const requiredMultiAnalysisFormId = String(
    payload.requiredMultiAnalysisFormId ||
      payload.requiredMultiAnalysisForm ||
      "",
  ).trim();

  const errors = {};

  if (!multiAnalysisFormId) {
    errors.multiAnalysisForm = { message: "تحلیل چندگانه والد الزامی است" };
  }

  if (type === "SINGLE") {
    if (!formId) {
      errors.form = { message: "تحلیل تکی الزامی است" };
    }
  } else if (type === "MULTI") {
    if (!requiredMultiAnalysisFormId) {
      errors.requiredMultiAnalysisForm = {
        message: "تحلیل چندگانه الزامی است",
      };
    }

    if (
      requiredMultiAnalysisFormId &&
      multiAnalysisFormId &&
      requiredMultiAnalysisFormId === multiAnalysisFormId
    ) {
      errors.requiredMultiAnalysisForm = {
        message: "تحلیل چندگانه نمی‌تواند به خودش وابسته باشد",
      };
    }
  } else {
    errors.type = { message: "نوع الزامی باید SINGLE یا MULTI باشد" };
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  payload.multiAnalysisForm = multiAnalysisFormId;
  payload.multiAnalysisFormId = multiAnalysisFormId;
  payload.type = type;

  if (type === "SINGLE") {
    payload.form = formId;
    payload.formId = formId;
    payload.requiredMultiAnalysisForm = null;
    payload.requiredMultiAnalysisFormId = null;
  } else {
    payload.requiredMultiAnalysisForm = requiredMultiAnalysisFormId;
    payload.requiredMultiAnalysisFormId = requiredMultiAnalysisFormId;
    payload.form = null;
    payload.formId = null;
  }

  request.payload = payload;
}

const enrichFollowUpRequestRecord = async (recordJson) => {
  if (!recordJson?.params) {
    return recordJson;
  }

  const recordId = recordJson.params.id;

  if (recordId) {
    const dbRecord = await prisma.followUpRequest.findUnique({
      where: {
        id: String(recordId),
      },
      include: {
        form: {
          include: {
            questions: {
              orderBy: {
                order: "asc",
              },
            },
          },
        },
      },
    });

    if (dbRecord) {
      recordJson.params.extraDescription = dbRecord.extraDescription ?? "";
      recordJson.params.responsesText = buildFollowUpResponsesText(
        dbRecord.responses,
        dbRecord.form?.questions ?? [],
      );

      return recordJson;
    }
  }

  const responses =
    flat.get(recordJson.params, "responses") ?? recordJson.params.responses;

  const formId = recordJson.params.formId || recordJson.params.form;

  let questions = [];

  if (formId) {
    const form = await prisma.followUpForm.findUnique({
      where: {
        id: String(formId),
      },
      include: {
        questions: {
          orderBy: {
            order: "asc",
          },
        },
      },
    });

    questions = form?.questions ?? [];
  }

  recordJson.params.responsesText = buildFollowUpResponsesText(
    responses,
    questions,
  );

  return recordJson;
};

const buildOptionsFromParams = (params) => {
  const options = [];

  Object.keys(params).forEach((key) => {
    const match = key.match(/^options\.(\d+)\.(label|value)$/);

    if (!match) return;

    const index = Number(match[1]);
    const field = match[2];

    if (!options[index]) {
      options[index] = {};
    }

    options[index][field] = params[key];
  });

  return options.filter(Boolean);
};

const formatFileSize = (bytes) => {
  if (!bytes) return "-";

  const units = ["B", "KB", "MB", "GB"];
  let size = Number(bytes);
  let unit = 0;

  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }

  return `${size.toFixed(2)} ${units[unit]}`;
};
//////
const getUploadedFile = (request) => {
  if (!request.files) {
    return null;
  }

  return Object.values(request.files)[0] ?? null;
};

const syncFileAttachment = async (record, request, currentAdmin) => {
  if (!record) {
    return;
  }

  const uploadedFile = getUploadedFile(request);

  const uploadKey = record.params.uploadKey;
  const recordId = record.params.id;

  const updateData = {
    uploadedById: currentAdmin?.id ?? null,
  };

  if (uploadKey) {
    updateData.filePath = `uploads/${uploadKey}`;
  }

  if (uploadedFile) {
    updateData.originalName = uploadedFile.name;

    updateData.extension = path
      .extname(uploadedFile.name)
      .replace(".", "")
      .toLowerCase();
  }

  await prisma.fileAttachment.update({
    where: {
      id: recordId,
    },
    data: updateData,
  });

  Object.assign(record.params, updateData);

  if (currentAdmin?.id) {
    record.params.uploadedBy = currentAdmin.id;
  }
};

const prepareRequest = (request, currentAdmin) => {
  if (request.method !== "post") {
    return request;
  }

  request.payload ??= {};

  if (currentAdmin?.id) {
    request.payload.uploadedById = currentAdmin.id;
  }

  const uploadedFile = getUploadedFile(request);

  if (uploadedFile) {
    request.payload.originalName = uploadedFile.name;

    request.payload.extension = path
      .extname(uploadedFile.name)
      .replace(".", "")
      .toLowerCase();
  }

  return request;
};
const enrichUserChildListRecordsWithUser = async (records = []) => {
  if (!records.length) {
    return;
  }

  const userIds = [
    ...new Set(
      records
        .map((record) => normalizeAdminReferenceId(record.params?.userId))
        .filter(Boolean),
    ),
  ];

  const userMap = Object.create(null);

  if (userIds.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true },
    });

    for (const user of users) {
      userMap[user.id] = user;
    }
  }

  for (const record of records) {
    const userId = normalizeAdminReferenceId(record.params?.userId);
    if (!userId) {
      continue;
    }

    const user = userMap[userId];
    const title = user?.username ?? userId;

    record.params.userId = userId;
    record.params.user = userId;
    record.populated = record.populated ?? {};
    record.populated.user = {
      params: { id: userId, username: title },
      title,
    };
  }
};

const userChildListAfter = async (response) => {
  await enrichUserChildListRecordsWithUser(response.records ?? []);
  return response;
};

const userChildEditAfter = (prismaModelKey) => async (response, request) => {
  if (request.method?.toLowerCase() === "get" && response?.record) {
    await enrichAdminRecordUserIdReference(response.record, {
      modelName: prismaModelKey,
    });
  }

  return response;
};

////

export const userInfoResource = prismaResource("UserInfo", {
  navigation: userProfileNavigation,

  listProperties: ["firstName", "lastName", "nationalCode"],

  filterProperties: ["company", "firstName", "lastName", "nationalCode"],

  properties: {
    firstName: {
      isVisible: {
        list: true,
        filter: true,
        show: true,
        edit: true,
      },
    },

    lastName: {
      isVisible: {
        list: true,
        filter: true,
        show: true,
        edit: true,
      },
    },

    nationalCode: {
      isVisible: {
        list: true,
        filter: true,
        show: true,
        edit: true,
      },
    },

    jobTitle: {
      isVisible: {
        list: false,
        filter: false,
        show: true,
        edit: true,
      },
    },

    id: {
      isVisible: {
        list: false,
        show: true,
        edit: false,
        filter: false,
      },
    },

    userId: {
      reference: "User",
      isVisible: {
        list: false,
        show: true,
        edit: true,
        filter: false,
      },
    },

    company: {
      reference: "Company",
      label: "شرکت",
      isVisible: {
        list: false,
        filter: true,
        show: false,
        edit: false,
      },
    },

    createdAt: {
      isVisible: {
        list: false,
        filter: false,
        show: true,
        edit: false,
      },
    },

    updatedAt: {
      isVisible: {
        list: false,
        filter: false,
        show: true,
        edit: false,
      },
    },

    birthDate: {
      isVisible: {
        list: false,
        filter: false,
        show: true,
        edit: true,
      },
    },

    lastJobTitle: {
      isVisible: {
        list: false,
        filter: false,
        show: true,
        edit: true,
      },
    },

    organizationalLevel: {
      availableValues: ORGANIZATIONAL_LEVELS,
      isVisible: {
        list: false,
        filter: false,
        show: true,
        edit: true,
      },
    },

    isboardMember: {
      isVisible: {
        list: false,
        filter: false,
        show: true,
        edit: true,
      },
    },

    isshareholder: {
      isVisible: {
        list: false,
        filter: false,
        show: true,
        edit: true,
      },
    },

    isstrategyTeamMember: {
      isVisible: {
        list: false,
        filter: false,
        show: true,
        edit: true,
      },
    },
  },

  actions: {
    ...userInfoActions,
    list: {
      before: applyUserInfoCompanyFilter,
      handler: runUserLinkedResourceListWithCompanyUserIds(
        "UserInfo",
        "_userInfoCompanyUserIds",
      ),
    },
    edit: {
      ...userInfoActions.edit,
      after: userChildEditAfter("userInfo"),
    },
  },
});

export const userEducationResource = prismaResource("UserEducation", {
  navigation: userProfileNavigation,

  listProperties: [
    "user",
    "degree",
    "fieldOfStudy",
    "graduationYear",
    "university",
  ],

  newProperties: [
    "userId",
    "degree",
    "fieldOfStudy",
    "specialization",
    "graduationYear",
    "university",
  ],

  editProperties: [
    "userId",
    "degree",
    "fieldOfStudy",
    "specialization",
    "graduationYear",
    "university",
  ],

  filterProperties: [
    "company",
    "userId",
    "degree",
    "fieldOfStudy",
    "specialization",
  ],

  properties: {
    id: {
      isVisible: {
        list: false,
        filter: false,
        show: true,
        edit: false,
      },
    },

    user: {
      reference: "User",
      isVirtual: true,
      isVisible: {
        list: true,
        show: true,
        edit: false,
        filter: false,
        new: false,
      },
    },

    userId: {
      reference: "User",
      isVisible: {
        list: false,
        show: false,
        edit: true,
        filter: true,
      },
    },

    company: {
      reference: "Company",
      label: "شرکت",
      isVisible: {
        list: false,
        filter: true,
        show: false,
        edit: false,
      },
    },

    createdAt: {
      isVisible: {
        list: false,
        filter: false,
        show: true,
        edit: false,
      },
    },

    updatedAt: {
      isVisible: {
        list: false,
        filter: false,
        show: true,
        edit: false,
      },
    },

    degree: {
      availableValues: DEGREE_TYPES,
      isVisible: {
        list: true,
        filter: true,
        show: true,
        edit: true,
      },
    },

    fieldOfStudy: {
      isVisible: {
        list: true,
        filter: true,
        show: true,
        edit: true,
      },
    },

    specialization: {
      isVisible: {
        list: false,
        filter: true,
        show: true,
        edit: true,
      },
    },

    graduationYear: {
      isVisible: {
        list: true,
        filter: false,
        show: true,
        edit: true,
      },
    },

    university: {
      isVisible: {
        list: true,
        filter: false,
        show: true,
        edit: true,
      },
    },

    sortOrder: {
      isVisible: {
        list: false,
        filter: false,
        show: true,
        edit: false,
        new: false,
      },
    },
  },

  showProperties: [
    "user",
    "degree",
    "fieldOfStudy",
    "specialization",
    "graduationYear",
    "university",
    "sortOrder",
    "createdAt",
    "updatedAt",
  ],

  actions: {
    ...userEducationActions,
    list: {
      before: applyUserEducationCompanyFilter,
      handler: runUserLinkedResourceListWithCompanyUserIds(
        "UserEducation",
        "_userEducationCompanyUserIds",
      ),
      after: userChildListAfter,
    },
    show: {
      after: async (response) => {
        if (response?.record) {
          await enrichUserChildListRecordsWithUser([response.record]);
        }
        return response;
      },
    },
    edit: {
      ...userEducationActions.edit,
      after: userChildEditAfter("userEducation"),
    },
  },
});

export const userTrainingCourseResource = prismaResource("UserTrainingCourse", {
  navigation: userProfileNavigation,

  listProperties: ["user", "courseName", "level", "hours", "provider"],

  newProperties: ["userId", "courseName", "level", "hours", "provider", "date"],

  editProperties: ["userId", "courseName", "level", "hours", "provider", "date"],

  filterProperties: ["company", "userId", "courseName", "level", "hours", "provider"],

  properties: {
    id: {
      isVisible: {
        list: false,
        filter: false,
        show: true,
        edit: false,
      },
    },

    user: {
      reference: "User",
      isVirtual: true,
      isVisible: {
        list: true,
        show: true,
        edit: false,
        filter: false,
        new: false,
      },
    },

    userId: {
      reference: "User",
      isVisible: {
        list: false,
        show: false,
        edit: true,
        filter: true,
      },
    },

    company: {
      reference: "Company",
      label: "شرکت",
      isVisible: {
        list: false,
        filter: true,
        show: false,
        edit: false,
      },
    },

    createdAt: {
      isVisible: {
        list: false,
        filter: false,
        show: true,
        edit: false,
      },
    },

    updatedAt: {
      isVisible: {
        list: false,
        filter: false,
        show: true,
        edit: false,
      },
    },

    courseName: {
      isVisible: {
        list: true,
        filter: true,
        show: true,
        edit: true,
      },
    },

    level: {
      availableValues: COURSE_LEVELS,
      isVisible: {
        list: true,
        filter: true,
        show: true,
        edit: true,
      },
    },

    hours: {
      isVisible: {
        list: true,
        filter: true,
        show: true,
        edit: true,
      },
    },

    provider: {
      isVisible: {
        list: true,
        filter: true,
        show: true,
        edit: true,
      },
    },

    date: {
      isVisible: {
        list: false,
        filter: false,
        show: true,
        edit: true,
      },
    },

    sortOrder: {
      isVisible: {
        list: false,
        filter: false,
        show: true,
        edit: false,
        new: false,
      },
    },
  },

  showProperties: [
    "user",
    "courseName",
    "level",
    "hours",
    "provider",
    "date",
    "sortOrder",
    "createdAt",
    "updatedAt",
  ],

  actions: {
    ...userTrainingCourseActions,
    list: {
      before: applyUserTrainingCourseCompanyFilter,
      handler: runUserLinkedResourceListWithCompanyUserIds(
        "UserTrainingCourse",
        "_userTrainingCourseCompanyUserIds",
      ),
      after: userChildListAfter,
    },
    show: {
      after: async (response) => {
        if (response?.record) {
          await enrichUserChildListRecordsWithUser([response.record]);
        }
        return response;
      },
    },
    edit: {
      ...userTrainingCourseActions.edit,
      after: userChildEditAfter("userTrainingCourse"),
    },
  },
});

export const userCompetencyResource = prismaResource("UserCompetency", {
  navigation: userProfileNavigation,

  listProperties: [
    "user",
    "competencyName",
    "type",
    "expectedLevel",
    "currentLevel",
    "jobRelevance",
    "importance",
  ],

  newProperties: [
    "userId",
    "competencyName",
    "type",
    "expectedLevel",
    "currentLevel",
    "jobRelevance",
    "importance",
  ],

  editProperties: [
    "userId",
    "competencyName",
    "type",
    "expectedLevel",
    "currentLevel",
    "jobRelevance",
    "importance",
  ],

  showProperties: [
    "user",
    "competencyName",
    "type",
    "expectedLevel",
    "currentLevel",
    "jobRelevance",
    "importance",
  ],

  filterProperties: [
    "company",
    "userId",
    "competencyName",
    "type",
    "expectedLevel",
    "currentLevel",
    "jobRelevance",
    "importance",
  ],

  properties: {
    id: {
      isVisible: {
        list: false,
        filter: false,
        show: true,
        edit: false,
      },
    },

    user: {
      reference: "User",
      isVirtual: true,
      isVisible: {
        list: true,
        show: true,
        edit: false,
        filter: false,
        new: false,
      },
    },

    userId: {
      reference: "User",
      label: "کاربر",
      isVisible: {
        list: false,
        show: false,
        edit: true,
        filter: true,
      },
    },

    company: {
      reference: "Company",
      label: "شرکت",
      isVisible: {
        list: false,
        filter: true,
        show: false,
        edit: false,
      },
    },

    type: {
      availableValues: SKILL_TYPES,
    },

    expectedLevel: {
      availableValues: EXPECTED_LEVELS,
    },

    currentLevel: {
      availableValues: CURRENT_LEVELS,
    },

    jobRelevance: {
      availableValues: JOB_RELEVANCE,
    },

    importance: {
      availableValues: IMPORTANCE_LEVELS,
    },

    sortOrder: {
      isVisible: {
        list: false,
        show: false,
        edit: false,
        new: false,
        filter: false,
      },
    },
  },

  actions: {
    ...userCompetencyActions,
    list: {
      before: applyUserCompetencyCompanyFilter,
      handler: runUserLinkedResourceListWithCompanyUserIds(
        "UserCompetency",
        "_userCompetencyCompanyUserIds",
      ),
      after: userChildListAfter,
    },
    show: {
      after: async (response) => {
        if (response?.record) {
          await enrichUserChildListRecordsWithUser([response.record]);
        }
        return response;
      },
    },
    edit: {
      ...userCompetencyActions.edit,
      after: userChildEditAfter("userCompetency"),
    },
  },
});

const formatJsonForDisplay = (value) => {
  if (value == null || value === "") {
    return "";
  }

  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }

  return JSON.stringify(value, null, 2);
};

const parseJsonFieldValue = (value) => {
  if (value == null || value === "") {
    return null;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  return value;
};

const formatSuggestedAnalysesForDisplay = (value) => {
  const parsed = parseJsonFieldValue(value);

  if (parsed == null) {
    return "";
  }

  if (!Array.isArray(parsed)) {
    return formatJsonForDisplay(parsed);
  }

  if (parsed.length === 0) {
    return "";
  }

  return parsed
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return `${index + 1}. ${String(item)}`;
      }

      const priority =
        item.priority != null && item.priority !== ""
          ? item.priority
          : index + 1;
      const title = item.title ?? item.titleFa ?? "—";
      const lines = [
        `#${priority} — ${title}`,
        item.analysisId ? `شناسه تحلیل: ${item.analysisId}` : null,
        item.reason ? `دلیل: ${item.reason}` : null,
      ].filter(Boolean);

      return lines.join("\n");
    })
    .join("\n\n---\n\n");
};

const enrichCompanyInsightRecords = async (
  records = [],
  { asJsonText = false } = {},
) => {
  if (!records?.length) {
    return;
  }

  const idsMissingAnalyses = records
    .filter((record) => {
      const raw = record?.params?.suggestedAnalyses;
      return raw == null || raw === "";
    })
    .map((record) => record.params?.id)
    .filter(Boolean);

  const analysesById = Object.create(null);

  if (idsMissingAnalyses.length > 0) {
    const rows = await prisma.companyInsight.findMany({
      where: { id: { in: idsMissingAnalyses } },
      select: { id: true, suggestedAnalyses: true },
    });

    for (const row of rows) {
      analysesById[row.id] = row.suggestedAnalyses;
    }
  }

  for (const record of records) {
    if (!record?.params) {
      continue;
    }

    let analyses = record.params.suggestedAnalyses;

    if ((analyses == null || analyses === "") && record.params.id) {
      analyses = analysesById[record.params.id] ?? analyses;
      if (analyses != null) {
        record.params.suggestedAnalyses = analyses;
      }
    }

    record.params.suggestedAnalysesText = asJsonText
      ? formatJsonForDisplay(analyses)
      : formatSuggestedAnalysesForDisplay(analyses);
  }

  await enrichRecordsWithCompanyName(records);
};

const getCompanyIdFromRecordParams = (params) =>
  params?.companyId || params?.company || null;

const enrichUserRecordCompanyIdForEdit = async (recordJson) => {
  if (!recordJson?.params) {
    return recordJson;
  }

  let companyId = normalizeAdminReferenceId(
    getCompanyIdFromRecordParams(recordJson.params),
  );

  if (!companyId && recordJson.params.id) {
    const user = await prisma.user.findUnique({
      where: { id: recordJson.params.id },
      select: { companyId: true },
    });
    companyId = user?.companyId ?? null;
  }

  if (companyId) {
    recordJson.params.companyId = companyId;
    recordJson.params.company = companyId;
  }

  await enrichRecordsWithCompanyName([recordJson]);
  return recordJson;
};

const enrichProjectPlanActionRecordsWithProject = async (records = []) => {
  if (!records.length) {
    return;
  }

  const planIds = [
    ...new Set(
      records
        .map((record) =>
          normalizeAdminReferenceId(record.params?.planId ?? record.params?.plan),
        )
        .filter(Boolean),
    ),
  ];

  if (planIds.length === 0) {
    return;
  }

  const plans = await prisma.projectPlan.findMany({
    where: { id: { in: planIds } },
    select: {
      id: true,
      project: { select: { id: true, title: true } },
    },
  });

  const projectByPlanId = Object.fromEntries(
    plans.map((plan) => [plan.id, plan.project]),
  );

  for (const record of records) {
    const planId = normalizeAdminReferenceId(
      record.params?.planId ?? record.params?.plan,
    );
    const project = planId ? projectByPlanId[planId] : null;
    const projectId = project?.id;
    const title = project?.title ?? "—";

    if (!projectId) {
      continue;
    }

    record.params.project = projectId;
    record.populated = record.populated ?? {};
    record.populated.project = {
      params: { id: projectId, title },
      title,
    };
  }
};

const enrichAdminRecordProjectIdReference = async (recordJson) => {
  if (!recordJson?.params) {
    return recordJson;
  }

  const projectId = normalizeAdminReferenceId(
    recordJson.params.projectId ?? recordJson.params.project,
  );

  if (!projectId) {
    return recordJson;
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, title: true },
  });

  const title = project?.title ?? projectId;

  recordJson.params.projectId = projectId;
  recordJson.populated = recordJson.populated ?? {};
  recordJson.populated.projectId = {
    params: { id: projectId, title },
    title,
  };

  return recordJson;
};

const enrichAdminRecordAnalysisFormIdReference = async (recordJson) => {
  if (!recordJson?.params) {
    return recordJson;
  }

  const analysisFormId = normalizeAdminReferenceId(
    recordJson.params.analysisFormId ?? recordJson.params.analysisForm,
  );

  if (!analysisFormId) {
    return recordJson;
  }

  const form = await prisma.analysisForm.findUnique({
    where: { id: analysisFormId },
    select: { id: true, title: true },
  });

  const title = form?.title ?? analysisFormId;

  recordJson.params.analysisFormId = analysisFormId;
  recordJson.populated = recordJson.populated ?? {};
  recordJson.populated.analysisFormId = {
    params: { id: analysisFormId, title },
    title,
  };

  return recordJson;
};

const enrichAdminRecordMultiAnalysisFormIdReference = async (recordJson) => {
  if (!recordJson?.params) {
    return recordJson;
  }

  const multiAnalysisFormId = normalizeAdminReferenceId(
    recordJson.params.multiAnalysisFormId ??
      recordJson.params.multiAnalysisForm,
  );

  if (!multiAnalysisFormId) {
    return recordJson;
  }

  const form = await prisma.multiAnalysisForm.findUnique({
    where: { id: multiAnalysisFormId },
    select: { id: true, title: true },
  });

  const title = form?.title ?? multiAnalysisFormId;

  recordJson.params.multiAnalysisFormId = multiAnalysisFormId;
  recordJson.populated = recordJson.populated ?? {};
  recordJson.populated.multiAnalysisFormId = {
    params: { id: multiAnalysisFormId, title },
    title,
  };

  return recordJson;
};

const enrichAdminRecordMultiAnalysisGoalFormReference = async (recordJson) => {
  if (!recordJson?.params) {
    return recordJson;
  }

  let multiAnalysisFormId = normalizeAdminReferenceId(
    recordJson.params.multiAnalysisFormId ??
      recordJson.params.multiAnalysisForm,
  );

  if (!multiAnalysisFormId && recordJson.params.id) {
    const row = await prisma.multiAnalysisGoal.findUnique({
      where: { id: recordJson.params.id },
      select: { multiAnalysisFormId: true },
    });
    multiAnalysisFormId = row?.multiAnalysisFormId ?? null;
  }

  if (!multiAnalysisFormId) {
    return recordJson;
  }

  recordJson.params.multiAnalysisFormId = multiAnalysisFormId;
  recordJson.params.multiAnalysisForm = multiAnalysisFormId;

  return enrichAdminRecordMultiAnalysisFormIdReference(recordJson);
};

const enrichAdminRecordFormGoalFormIdReference = async (recordJson) => {
  if (!recordJson?.params) {
    return recordJson;
  }

  const formId = normalizeAdminReferenceId(
    recordJson.params.formId ?? recordJson.params.form,
  );

  if (!formId) {
    return recordJson;
  }

  const form = await prisma.analysisForm.findUnique({
    where: { id: formId },
    select: { id: true, title: true },
  });

  const title = form?.title ?? formId;

  recordJson.params.formId = formId;
  recordJson.populated = recordJson.populated ?? {};
  recordJson.populated.formId = {
    params: { id: formId, title },
    title,
  };

  return recordJson;
};

const enrichAdminRecordFormQuestionCategoryParentIdReference = async (
  recordJson,
) => {
  if (!recordJson?.params) {
    return recordJson;
  }

  const parentId = normalizeAdminReferenceId(
    recordJson.params.parentId ?? recordJson.params.parent,
  );

  if (!parentId) {
    return recordJson;
  }

  const parent = await prisma.formQuestionCategory.findUnique({
    where: { id: parentId },
    select: { id: true, title: true },
  });

  const title = parent?.title ?? parentId;

  recordJson.params.parentId = parentId;
  recordJson.populated = recordJson.populated ?? {};
  recordJson.populated.parentId = {
    params: { id: parentId, title },
    title,
  };

  return recordJson;
};

const enrichAdminRecordFormQuestionCategoryEditReferences = async (
  recordJson,
) => {
  if (!recordJson?.params?.id) {
    return recordJson;
  }

  const row = await prisma.formQuestionCategory.findUnique({
    where: { id: recordJson.params.id },
    select: {
      analysisFormId: true,
      multiAnalysisFormId: true,
      parentId: true,
    },
  });

  if (row?.analysisFormId) {
    recordJson.params.analysisFormId = row.analysisFormId;
    recordJson.params.analysisForm = row.analysisFormId;
  }

  if (row?.multiAnalysisFormId) {
    recordJson.params.multiAnalysisFormId = row.multiAnalysisFormId;
    recordJson.params.multiAnalysisForm = row.multiAnalysisFormId;
  }

  if (row?.parentId) {
    recordJson.params.parentId = row.parentId;
    recordJson.params.parent = row.parentId;
  }

  await enrichAdminRecordAnalysisFormIdReference(recordJson);
  await enrichAdminRecordMultiAnalysisFormIdReference(recordJson);
  await enrichAdminRecordFormQuestionCategoryParentIdReference(recordJson);

  return recordJson;
};

const enrichAdminRecordFormQuestionCategoryIdReference = async (
  recordJson,
) => {
  if (!recordJson?.params) {
    return recordJson;
  }

  let categoryId = normalizeAdminReferenceId(
    recordJson.params.categoryId ?? recordJson.params.category,
  );

  if (!categoryId && recordJson.params.id) {
    const row = await prisma.formQuestion.findUnique({
      where: { id: recordJson.params.id },
      select: { categoryId: true },
    });
    categoryId = row?.categoryId ?? null;
  }

  if (!categoryId) {
    return recordJson;
  }

  const category = await prisma.formQuestionCategory.findUnique({
    where: { id: categoryId },
    select: { id: true, title: true },
  });

  const title = category?.title ?? categoryId;

  recordJson.params.categoryId = categoryId;
  recordJson.params.category = categoryId;
  recordJson.populated = recordJson.populated ?? {};
  recordJson.populated.categoryId = {
    params: { id: categoryId, title },
    title,
  };

  return recordJson;
};

const enrichFormQuestionRecordWithOptionsJson = async (recordJson) => {
  if (!recordJson?.params) {
    return recordJson;
  }

  const questionId = recordJson.params.id;
  if (!questionId) {
    recordJson.params.optionsJson = "[]";
    return recordJson;
  }

  const options = await prisma.formQuestionOption.findMany({
    where: { questionId },
    orderBy: { order: "asc" },
    select: {
      label: true,
      value: true,
      score: true,
      order: true,
    },
  });

  recordJson.params.optionsJson = JSON.stringify(
    options.map((option) => ({
      label: option.label,
      value: option.value,
      score: option.score,
      order: option.order,
    })),
  );

  return recordJson;
};

const enrichFollowUpFormRecordWithQuestionsJson = async (recordJson) => {
  if (!recordJson?.params) {
    return recordJson;
  }

  const formId = recordJson.params.id;
  if (!formId) {
    recordJson.params.questionsJson = "[]";
    return recordJson;
  }

  const questions = await prisma.followUpFormQuestion.findMany({
    where: { formId },
    orderBy: { order: "asc" },
    select: {
      label: true,
      type: true,
      required: true,
      order: true,
      options: true,
    },
  });

  recordJson.params.questionsJson = JSON.stringify(
    questions.map((question) => ({
      label: question.label,
      type: question.type,
      required: question.required,
      order: question.order,
      options: Array.isArray(question.options) ? question.options : [],
    })),
  );

  return recordJson;
};

const persistFollowUpFormQuestions = async (formId, questions, tx = prisma) => {
  await tx.followUpFormQuestion.deleteMany({
    where: { formId },
  });

  for (const question of questions) {
    await tx.followUpFormQuestion.create({
      data: {
        formId,
        label: question.label,
        type: question.type,
        required: question.required,
        order: question.order,
        options: question.options,
      },
    });
  }
};

const enrichPromptDefinitionRecordWithEditorJson = async (recordJson) => {
  if (!recordJson?.params) {
    return recordJson;
  }

  const definitionId = recordJson.params.id;
  if (!definitionId) {
    recordJson.params.promptEditorJson = JSON.stringify({
      status: "DRAFT",
      segments: [],
    });
    return recordJson;
  }

  const latestVersion = await prisma.promptVersion.findFirst({
    where: { promptDefinitionId: definitionId },
    orderBy: { versionNumber: "desc" },
    include: {
      values: {
        include: {
          segmentDefinition: true,
        },
      },
    },
  });

  if (!latestVersion) {
    recordJson.params.promptEditorJson = JSON.stringify({
      status: "DRAFT",
      segments: [],
    });
    return recordJson;
  }

  const segments = [...latestVersion.values]
    .sort((a, b) => {
      const aOrder =
        a.segmentDefinition?.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const bOrder =
        b.segmentDefinition?.sortOrder ?? Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder;
    })
    .map((row) => ({
      label: row.segmentDefinition?.label ?? "",
      description: row.segmentDefinition?.description ?? "",
      isRequired: row.segmentDefinition?.isRequired ?? true,
      content: row.content ?? "",
    }));

  recordJson.params.promptEditorJson = JSON.stringify({
    status: latestVersion.status,
    segments,
  });

  return recordJson;
};

const persistPromptDefinitionEditorContent = async (
  definitionId,
  title,
  editorPayload,
  tx = prisma,
) => {
  await tx.promptDefinition.update({
    where: { id: definitionId },
    data: { title },
  });

  const aggregate = await tx.promptVersion.aggregate({
    where: { promptDefinitionId: definitionId },
    _max: { versionNumber: true },
  });

  const versionNumber = (aggregate._max.versionNumber ?? 0) + 1;
  const versionKey = `v${versionNumber}`;

  const publishedAt =
    editorPayload.status === "PUBLISHED" ? new Date() : null;

  const version = await tx.promptVersion.create({
    data: {
      promptDefinitionId: definitionId,
      versionNumber,
      versionKey,
      status: editorPayload.status,
      publishedAt,
    },
  });

  for (let index = 0; index < editorPayload.segments.length; index += 1) {
    const segment = editorPayload.segments[index];
    const segmentDefinition = await tx.promptSegmentDefinition.create({
      data: {
        promptDefinitionId: definitionId,
        key: `section_${index + 1}`,
        label: segment.label,
        description: segment.description,
        sortOrder: index + 1,
        isRequired: segment.isRequired,
      },
    });

    await tx.promptVersionSegmentValue.create({
      data: {
        promptVersionId: version.id,
        segmentDefinitionId: segmentDefinition.id,
        content: segment.content,
      },
    });
  }

  return version;
};

const assertPromptDefinitionCanBeDeleted = async (definitionId, tx = prisma) => {
  const linkedProjectCount = await tx.project.count({
    where: {
      promptVersion: {
        promptDefinitionId: definitionId,
      },
    },
  });

  if (linkedProjectCount > 0) {
    throw new ValidationError({
      id: {
        message: `امکان حذف نیست: ${linkedProjectCount} پروژه به نسخه‌های این پرامپت وصل هستند.`,
      },
    });
  }
};

const deletePromptDefinitionWithDependents = async (definitionId, tx = prisma) => {
  await assertPromptDefinitionCanBeDeleted(definitionId, tx);

  await tx.promptVersionSegmentValue.deleteMany({
    where: {
      OR: [
        { promptVersion: { promptDefinitionId: definitionId } },
        { segmentDefinition: { promptDefinitionId: definitionId } },
      ],
    },
  });

  await tx.promptVersion.deleteMany({
    where: { promptDefinitionId: definitionId },
  });

  await tx.promptSegmentDefinition.deleteMany({
    where: { promptDefinitionId: definitionId },
  });

  await tx.promptDefinition.delete({
    where: { id: definitionId },
  });
};

const persistFormQuestionOptions = async (questionId, options, tx = prisma) => {
  await tx.formQuestionOption.deleteMany({
    where: { questionId },
  });

  if (!options.length) {
    return;
  }

  await tx.formQuestionOption.createMany({
    data: options.map((option) => ({
      questionId,
      label: option.label,
      value: option.value,
      score: option.score,
      order: option.order,
    })),
  });
};

const enrichAdminRecordFormQuestionOptionQuestionIdReference = async (
  recordJson,
) => {
  if (!recordJson?.params) {
    return recordJson;
  }

  let questionId = normalizeAdminReferenceId(
    recordJson.params.questionId ?? recordJson.params.question,
  );

  if (!questionId && recordJson.params.id) {
    const row = await prisma.formQuestionOption.findUnique({
      where: { id: recordJson.params.id },
      select: { questionId: true },
    });
    questionId = row?.questionId ?? null;
  }

  if (!questionId) {
    return recordJson;
  }

  const question = await prisma.formQuestion.findUnique({
    where: { id: questionId },
    select: { id: true, label: true },
  });

  const title = question?.label ?? questionId;

  recordJson.params.questionId = questionId;
  recordJson.params.question = questionId;
  recordJson.populated = recordJson.populated ?? {};
  recordJson.populated.questionId = {
    params: { id: questionId, title },
    title,
  };

  return recordJson;
};

const enrichRecordsWithCompanyName = async (records) => {
  if (!records?.length) {
    return;
  }

  const companyIds = [
    ...new Set(
      records
        .map((record) => getCompanyIdFromRecordParams(record.params))
        .filter(Boolean),
    ),
  ];

  const companyMap = Object.create(null);

  if (companyIds.length > 0) {
    const companies = await prisma.company.findMany({
      where: { id: { in: companyIds } },
      select: { id: true, name: true },
    });

    for (const company of companies) {
      companyMap[company.id] = company.name;
    }
  }

  for (const record of records) {
    const companyId = getCompanyIdFromRecordParams(record.params);
    const name = companyId ? (companyMap[companyId] ?? "—") : "—";

    if (companyId) {
      record.params.companyId = companyId;
      record.params.company = companyId;
    }

    record.populated = record.populated ?? {};
    record.populated.companyId = {
      params: { id: companyId, name },
      title: name,
    };
    record.populated.company = {
      params: { id: companyId, name },
      title: name,
    };

    record.params.companyName = name;
  }
};

/** فیلتر/فرم: companyId — ستون لیست از فیلد مجازی company پر می‌شود */
const companyProfileCompanyFilterProperty = {
  reference: "Company",
  label: "Company",
  isVisible: {
    list: false,
    show: true,
    edit: true,
    filter: true,
  },
};

const companyProfileCompanyListProperty = {
  reference: "Company",
  label: "Company",
  isVirtual: true,
  isVisible: {
    list: true,
    filter: false,
    show: false,
    edit: false,
    new: false,
  },
};

const companyProfileCompanyListAfter = async (response, requestOrEnrichExtra) => {
  await enrichRecordsWithCompanyName(response.records ?? []);
  if (typeof requestOrEnrichExtra === "function") {
    requestOrEnrichExtra(response.records ?? []);
  }
  return response;
};

const companyIdShowEditOnlyProperty = {
  reference: "Company",
  label: "شرکت",
  isVisible: {
    list: false,
    show: true,
    edit: true,
    filter: false,
  },
};

const enrichIndustryInsightRecords = async (records = []) => {
  if (!records?.length) {
    return;
  }

  const industryNames = [
    ...new Set(
      records
        .map((record) => record.params.industryName?.trim())
        .filter(Boolean),
    ),
  ];

  const companiesByIndustry = Object.create(null);

  if (industryNames.length > 0) {
    const companies = await prisma.company.findMany({
      where: {
        industry: { in: industryNames },
      },
      select: { name: true, industry: true },
      orderBy: { name: "asc" },
    });

    for (const company of companies) {
      const key = company.industry?.trim();
      if (!key) {
        continue;
      }

      (companiesByIndustry[key] ??= []).push(company.name);
    }
  }

  const idsMissingInsightData = records
    .filter((record) => {
      const raw = record?.params?.insightData;
      return raw == null || raw === "";
    })
    .map((record) => record.params?.id)
    .filter(Boolean);

  const insightDataById = Object.create(null);

  if (idsMissingInsightData.length > 0) {
    const rows = await prisma.industryInsight.findMany({
      where: { id: { in: idsMissingInsightData } },
      select: { id: true, insightData: true },
    });

    for (const row of rows) {
      insightDataById[row.id] = row.insightData;
    }
  }

  for (const record of records) {
    const industry = record.params.industryName?.trim();
    const names = industry ? (companiesByIndustry[industry] ?? []) : [];

    record.params.relatedCompanies = names.join("، ") || "—";

    let insightData = record.params.insightData;

    if ((insightData == null || insightData === "") && record.params.id) {
      insightData = insightDataById[record.params.id] ?? insightData;
      if (insightData != null) {
        record.params.insightData = insightData;
      }
    }

    record.params.insightDataText = formatJsonForDisplay(insightData);
  }
};

const companyManagementNavigation = {
  name: "مدیریت شرکت‌ها",
  icon: "Building",
};

export const companyInsightResource = prismaResource("CompanyInsight", {
  navigation: companyManagementNavigation,

  properties: {
    companyId: {
      reference: "Company",
      label: "شرکت",
      isVisible: {
        list: false,
        filter: true,
        show: true,
        edit: false,
      },
    },

    company: {
      reference: "Company",
      isVisible: {
        list: false,
        filter: true,
        show: false,
        edit: false,
      },
    },

    companyName: {
      type: "string",
      isVirtual: true,
      label: "نام شرکت",
      isVisible: {
        list: true,
        filter: false,
        show: true,
        edit: false,
      },
    },

    insightText: {
      type: "textarea",
      label: "متن تحلیل",
      props: {
        rows: 15,
      },
      isVisible: {
        list: false,
        filter: false,
        show: true,
        edit: true,
      },
    },

    suggestedAnalysesText: {
      type: "textarea",
      isVirtual: true,
      label: "تحلیل‌های پیشنهادی",
      props: {
        rows: 15,
      },
      isVisible: {
        list: false,
        filter: false,
        show: true,
        edit: true,
      },
    },

    suggestedAnalyses: {
      type: "mixed",
      isVisible: {
        list: false,
        filter: false,
        show: false,
        edit: false,
      },
    },

    generatedAt: {
      label: "تاریخ تولید",
      isVisible: {
        list: true,
        filter: true,
        show: true,
        edit: true,
      },
    },

    createdAt: {
      isVisible: {
        list: true,
        filter: true,
        show: true,
        edit: false,
      },
    },

    updatedAt: {
      isVisible: {
        list: false,
        filter: true,
        show: true,
        edit: false,
      },
    },
  },

  listProperties: ["id", "companyName", "generatedAt", "updatedAt"],
  showProperties: [
    "id",
    "companyName",
    "insightText",
    "suggestedAnalysesText",
    "generatedAt",
    "createdAt",
    "updatedAt",
  ],
  filterProperties: ["company", "generatedAt", "createdAt"],
  editProperties: [
    "id",
    "companyName",
    "insightText",
    "suggestedAnalysesText",
    "generatedAt",
    "createdAt",
    "updatedAt",
  ],

  actions: {
    new: {
      isAccessible: false,
    },
    edit: {
      before: async (request) => {
        if (request.method === "post") {
          const parsedAnalyses = parseJsonText(
            request.payload?.suggestedAnalysesText,
            "suggestedAnalysesText",
          );

          if (parsedAnalyses !== undefined) {
            request.payload.suggestedAnalyses = parsedAnalyses;
          }

          delete request.payload.suggestedAnalysesText;
          delete request.payload.companyName;
        }

        return request;
      },

      after: async (response, request) => {
        if (
          request.method?.toLowerCase() === "get" &&
          response?.record
        ) {
          await enrichCompanyInsightRecords([response.record], {
            asJsonText: true,
          });
        }

        return response;
      },
    },
    regenerate: {
      actionType: "record",
      icon: "RefreshCw",
      label: "تولید مجدد تحلیل",
      component: false,
      handler: async (request, response, context) => {
        const companyId = getCompanyIdFromRecordParams(context.record.params);

        if (!companyId) {
          return {
            record: context.record.toJSON(),
            notice: {
              message: "شرکت مرتبط یافت نشد",
              type: "error",
            },
          };
        }

        await syncCompanyInsightService(companyId);

        return {
          record: context.record.toJSON(),
          notice: {
            message: "تحلیل شرکت با موفقیت بروزرسانی شد",
            type: "success",
          },
          redirectUrl: context.h.recordActionUrl({
            resourceId: "CompanyInsight",
            recordId: context.record.id(),
            actionName: "show",
          }),
        };
      },
    },
    list: {
      after: async (response) => {
        await enrichCompanyInsightRecords(response.records ?? []);
        return response;
      },
    },
    show: {
      after: async (response) => {
        if (!response.record) {
          return response;
        }

        await enrichCompanyInsightRecords([response.record]);
        return response;
      },
    },
  },
});

export const industryInsightResource = prismaResource("IndustryInsight", {
  navigation: companyManagementNavigation,

  properties: {
    industryName: {
      isTitle: true,
      label: "صنعت",
      isVisible: {
        list: true,
        filter: true,
        show: true,
        edit: true,
      },
    },

    company: {
      reference: "Company",
      label: "شرکت",
      isVisible: {
        list: false,
        filter: true,
        show: false,
        edit: false,
      },
    },

    title: {
      label: "عنوان",
      isVisible: {
        list: false,
        filter: false,
        show: false,
        edit: false,
      },
    },

    relatedCompanies: {
      type: "string",
      isVirtual: true,
      label: "شرکت‌های مرتبط",
      isVisible: {
        list: true,
        filter: false,
        show: true,
        edit: false,
      },
    },

    insightDataText: {
      type: "textarea",
      isVirtual: true,
      label: "داده تحلیل",
      props: {
        rows: 20,
      },
      isVisible: {
        list: false,
        filter: false,
        show: true,
        edit: true,
      },
    },

    insightData: {
      type: "mixed",
      isVisible: {
        list: false,
        filter: false,
        show: false,
        edit: false,
      },
    },

    source: {
      label: "منبع",
      isVisible: {
        list: false,
        filter: false,
        show: false,
        edit: false,
      },
    },

    fetchedAt: {
      label: "تاریخ دریافت",
      isVisible: {
        list: false,
        filter: false,
        show: false,
        edit: false,
      },
    },

    createdAt: {
      isVisible: {
        list: true,
        filter: true,
        show: true,
        edit: false,
      },
    },
  },

  listProperties: [
    "id",
    "industryName",
    "relatedCompanies",
    "createdAt",
  ],
  showProperties: [
    "id",
    "industryName",
    "relatedCompanies",
    "insightDataText",
    "createdAt",
  ],
  filterProperties: ["company", "industryName", "createdAt"],
  editProperties: [
    "id",
    "industryName",
    "relatedCompanies",
    "insightDataText",
    "createdAt",
  ],

  actions: {
    new: {
      isAccessible: false,
    },
    edit: {
      before: async (request) => {
        if (request.method === "post") {
          const parsedInsightData = parseJsonText(
            request.payload?.insightDataText,
            "insightDataText",
          );

          if (parsedInsightData !== undefined) {
            request.payload.insightData = parsedInsightData;
          }

          delete request.payload.insightDataText;
          delete request.payload.relatedCompanies;
        }

        return request;
      },

      after: async (response, request) => {
        if (
          request.method?.toLowerCase() === "get" &&
          response?.record
        ) {
          await enrichIndustryInsightRecords([response.record]);
        }

        return response;
      },
    },
    list: {
      before: applyIndustryInsightCompanyFilter,
      after: async (response) => {
        await enrichIndustryInsightRecords(response.records ?? []);
        return response;
      },
    },
    show: {
      after: async (response) => {
        if (!response.record) {
          return response;
        }

        await enrichIndustryInsightRecords([response.record]);
        return response;
      },
    },
  },
});

const getCompanyBasicInfoTypeLabel = (params = {}) => {
  if (params.isHolding) {
    return (
      COMPANY_TYPES.find((item) => item.value === "HOLDING")?.label ?? "هلدینگ"
    );
  }

  if (params.isHoldingSubsidiary) {
    return (
      COMPANY_TYPES.find((item) => item.value === "HOLDING_SUBSIDIARY")?.label ??
      "زیرمجموعه هلدینگ"
    );
  }

  if (params.isPublicCompany) {
    return (
      COMPANY_TYPES.find((item) => item.value === "PUBLIC_COMPANY")?.label ??
      "شرکت بورسی"
    );
  }

  return "—";
};

const enrichCompanyBasicInfoRecords = (records = []) => {
  for (const record of records) {
    record.params.companyTypeLabel = getCompanyBasicInfoTypeLabel(
      record.params,
    );
  }
};

export const companyBasicInfoResource = prismaResource("CompanyBasicInfo", {
  navigation: companyProfileNavigation,

  listProperties: [
    "company",
    "brandTitle",
    "knownAs",
    "nationalId",
    "companyTypeLabel",
    "establishmentYear",
    "region",
  ],

  filterProperties: [
    "companyId",
    "brandTitle",
    "knownAs",
    "nationalId",
    "region",
  ],

  properties: {
    id: {
      isVisible: {
        list: false,
        filter: false,
        show: true,
        edit: false,
      },
    },

    companyId: companyProfileCompanyFilterProperty,

    company: companyProfileCompanyListProperty,

    companyTypeLabel: {
      type: "string",
      isVirtual: true,
      label: "نوع شرکت",
      isVisible: {
        list: true,
        filter: false,
        show: true,
        edit: false,
        new: false,
      },
    },

    brandTitle: {
      isVisible: {
        list: true,
        filter: true,
        show: true,
        edit: true,
      },
    },

    knownAs: {
      isVisible: {
        list: true,
        filter: true,
        show: true,
        edit: true,
      },
    },

    nationalId: {
      isVisible: {
        list: true,
        filter: true,
        show: true,
        edit: true,
      },
    },

    establishmentYear: {
      isVisible: {
        list: true,
        filter: false,
        show: true,
        edit: true,
      },
    },

    region: {
      availableValues: ACTIVITY_SCOPE,
      isVisible: {
        list: true,
        filter: true,
        show: true,
        edit: true,
      },
    },
  },

  actions: {
    ...companyBasicInfoActions,
    list: {
      after: async (response) =>
        companyProfileCompanyListAfter(response, enrichCompanyBasicInfoRecords),
    },
    show: {
      after: async (response) => {
        if (response?.record) {
          enrichCompanyBasicInfoRecords([response.record]);
        }
        return response;
      },
    },
  },
});

export const companyManagerResource = prismaResource("CompanyManager", {
  navigation: companyProfileNavigation,

  listProperties: [
    "company",
    "fullName",
    "positionTitle",
    "isBoardMember",
    "isStrategyTeamMember",
    "companyWorkExperience",
    "totalWorkExperience",
  ],

  newProperties: [
    "companyId",
    "fullName",
    "positionTitle",
    "isBoardMember",
    "isStrategyTeamMember",
    "companyWorkExperience",
    "totalWorkExperience",
    "resumeFileId",
  ],

  editProperties: [
    "companyId",
    "fullName",
    "positionTitle",
    "isBoardMember",
    "isStrategyTeamMember",
    "companyWorkExperience",
    "totalWorkExperience",
    "resumeFileId",
  ],

  filterProperties: [
    "companyId",
    "fullName",
    "positionTitle",
    "isBoardMember",
    "isStrategyTeamMember",
    "companyWorkExperience",
    "totalWorkExperience",
  ],

  properties: {
    id: {
      isVisible: {
        list: false,
        filter: false,
        show: true,
        edit: false,
      },
    },

    companyId: companyProfileCompanyFilterProperty,

    company: companyProfileCompanyListProperty,

    resumeFileId: {
      reference: "FileAttachment",
      label: "رزومه",
      isVisible: {
        list: false,
        filter: false,
        show: true,
        edit: true,
      },
    },

    resumeFile: {
      reference: "FileAttachment",
      isVisible: {
        list: false,
        filter: false,
        show: false,
        edit: false,
      },
    },

    fullName: {
      isVisible: {
        list: true,
        filter: true,
        show: true,
        edit: true,
      },
    },

    positionTitle: {
      isVisible: {
        list: true,
        filter: true,
        show: true,
        edit: true,
      },
    },

    isBoardMember: {
      isVisible: {
        list: true,
        filter: true,
        show: true,
        edit: true,
      },
    },

    isStrategyTeamMember: {
      isVisible: {
        list: true,
        filter: true,
        show: true,
        edit: true,
      },
    },

    companyWorkExperience: {
      isVisible: {
        list: true,
        filter: true,
        show: true,
        edit: true,
      },
    },

    totalWorkExperience: {
      isVisible: {
        list: true,
        filter: true,
        show: true,
        edit: true,
      },
    },

    sortOrder: {
      isVisible: {
        list: false,
        filter: false,
        show: false,
        edit: false,
        new: false,
      },
    },
  },

  actions: {
    ...companyManagerActions,
    list: {
      after: companyProfileCompanyListAfter,
    },
  },
});

export const organizationUnitResource = prismaResource("OrganizationUnit", {
  navigation: companyProfileNavigation,

  listProperties: [
    "company",
    "unitName",
    "structureLevel",
    "isRevenueCenter",
    "managerName",
    "employeeCount",
  ],

  filterProperties: [
    "companyId",
    "unitName",
    "structureLevel",
    "isRevenueCenter",
    "managerName",
    "employeeCount",
  ],

  properties: {
    id: {
      isVisible: {
        list: false,
        filter: false,
        show: true,
        edit: false,
      },
    },

    companyId: companyProfileCompanyFilterProperty,

    company: companyProfileCompanyListProperty,

    structureFileId: {
      reference: "FileAttachment",
      label: "فایل ساختار",
      isVisible: {
        list: false,
        filter: false,
        show: true,
        edit: true,
      },
    },

    structureFile: {
      reference: "FileAttachment",
      isVisible: {
        list: false,
        filter: false,
        show: false,
        edit: false,
      },
    },

    unitName: {
      isVisible: {
        list: true,
        filter: true,
        show: true,
        edit: true,
      },
    },

    structureLevel: {
      availableValues: ORG_STRUCTURE_LEVELS,
      isVisible: {
        list: true,
        filter: true,
        show: true,
        edit: true,
      },
    },

    isRevenueCenter: {
      isVisible: {
        list: true,
        filter: true,
        show: true,
        edit: true,
      },
    },

    managerName: {
      isVisible: {
        list: true,
        filter: true,
        show: true,
        edit: true,
      },
    },

    employeeCount: {
      isVisible: {
        list: true,
        filter: true,
        show: true,
        edit: true,
      },
    },
  },

  actions: {
    ...organizationUnitActions,
    list: {
      after: companyProfileCompanyListAfter,
    },
  },
});

export const companyLicenseCertificateResource = prismaResource(
  "CompanyLicenseCertificate",
  {
    navigation: companyProfileNavigation,

    properties: {
      companyId: companyIdShowEditOnlyProperty,

      attachmentFileId: {
        reference: "FileAttachment",
        isVisible: {
          list: false,
          show: true,
          edit: true,
          filter: false,
        },
      },

      attachmentFile: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
        },
      },
    },

    actions: {
      ...companyLicenseCertificateActions,
    },
  },
);

export const companyBalanceSheetResource = prismaResource(
  "CompanyBalanceSheet",
  {
    navigation: companyProfileNavigation,

    properties: {
      companyId: companyIdShowEditOnlyProperty,

      balanceFileId: {
        reference: "FileAttachment",
        isVisible: {
          list: false,
          show: true,
          edit: true,
          filter: false,
        },
      },

      balanceFile: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
        },
      },

      balanceSheet: {
        type: "textarea",
        label: "ورودی تحلیل ترازنامه",
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: true,
        },
      },

      sortOrder: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
          new: false,
        },
      },
    },

    actions: {
      ...companyBalanceSheetActions,
    },
  },
);

export const companyIncomeStatementResource = prismaResource(
  "CompanyIncomeStatement",
  {
    navigation: companyProfileNavigation,

    properties: {
      companyId: companyIdShowEditOnlyProperty,

      incomeFileId: {
        reference: "FileAttachment",
        isVisible: {
          list: false,
          show: true,
          edit: true,
          filter: false,
        },
      },

      incomeFile: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
        },
      },

      incomeStatement: {
        type: "textarea",
        label: "ورودی تحلیل صورت سود و زیان",
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: true,
        },
      },

      sortOrder: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
          new: false,
        },
      },
    },

    actions: {
      ...companyIncomeStatementActions,
    },
  },
);

export const revenueCenterResource = prismaResource("RevenueCenter", {
  navigation: companyProfileNavigation,

  listProperties: [
    "company",
    "title",
    "activityYearsCount",
    "totalRevenueSharePercent",
    "lastYearEstimatedRevenue",
    "personnelCount",
  ],

  newProperties: [
    "companyId",
    "title",
    "activityYearsCount",
    "totalRevenueSharePercent",
    "lastYearEstimatedRevenue",
    "personnelCount",
  ],

  editProperties: [
    "companyId",
    "title",
    "activityYearsCount",
    "totalRevenueSharePercent",
    "lastYearEstimatedRevenue",
    "personnelCount",
  ],

  filterProperties: [
    "companyId",
    "title",
    "activityYearsCount",
    "totalRevenueSharePercent",
    "lastYearEstimatedRevenue",
    "personnelCount",
  ],

  properties: {
    id: {
      isVisible: {
        list: false,
        filter: false,
        show: true,
        edit: false,
      },
    },

    companyId: companyProfileCompanyFilterProperty,

    company: companyProfileCompanyListProperty,

    title: {
      isVisible: {
        list: true,
        filter: true,
        show: true,
        edit: true,
      },
    },

    activityYearsCount: {
      isVisible: {
        list: true,
        filter: true,
        show: true,
        edit: true,
      },
    },

    totalRevenueSharePercent: {
      isVisible: {
        list: true,
        filter: true,
        show: true,
        edit: true,
      },
    },

    lastYearEstimatedRevenue: {
      isVisible: {
        list: true,
        filter: true,
        show: true,
        edit: true,
      },
    },

    personnelCount: {
      isVisible: {
        list: true,
        filter: true,
        show: true,
        edit: true,
      },
    },

    sortOrder: {
      isVisible: {
        list: false,
        filter: false,
        show: false,
        edit: false,
        new: false,
      },
    },
  },

  actions: {
    ...revenueCenterActions,
    list: {
      after: companyProfileCompanyListAfter,
    },
  },
});

export const companyShareholderResource = prismaResource("CompanyShareholder", {
  navigation: companyProfileNavigation,

  properties: {
    companyId: companyIdShowEditOnlyProperty,
    shareholderType: {
      availableValues: SHAREHOLDER_TYPES_COMPANY,
    },
  },

  actions: {
    ...companyShareholderActions,
  },
});

export const companyMembershipResource = prismaResource("CompanyMembership", {
  navigation: companyProfileNavigation,

  properties: {
    companyId: companyIdShowEditOnlyProperty,
  },

  actions: {
    ...companyMembershipActions,
  },
});

export const companyProductServiceResource = prismaResource(
  "CompanyProductService",
  {
    navigation: companyProfileNavigation,

    properties: {
      companyId: companyIdShowEditOnlyProperty,
      revenueCenter: {
        availableValues: revenueCenters,
      },

      type: {
        availableValues: types,
      },

      revenueSharePercent: {
        availableValues: revenueShares,
      },

      marketPosition: {
        availableValues: marketPositions,
      },

      sortOrder: {
        isVisible: {
          filter: false,
          show: true,
          edit: false,
          new: false,
        },
      },
    },

    actions: {
      ...companyProductServiceActions,
    },
  },
);

export const companyMarketResource = prismaResource("CompanyMarket", {
  navigation: companyProfileNavigation,

  properties: {
    companyId: companyIdShowEditOnlyProperty,

    marketType: {
      availableValues: marketTypes,
    },

    marketPenetrationLevel: {
      availableValues: marketPenetration,
    },

    relatedProductService: {
      type: "textarea",
      description:
        "هر محصول یا خدمت را در یک خط وارد کنید. مثال:\nProduct 1\nProduct 2\nProduct 3",
    },

    sortOrder: {
      isVisible: {
        filter: false,
        show: true,
        edit: false,
        new: false,
      },
    },
  },

  actions: {
    ...companyMarketActions,

    new: {
      ...companyMarketActions.new,
      before: async (request) => {
        if (typeof request.payload?.relatedProductService === "string") {
          request.payload.relatedProductService =
            request.payload.relatedProductService
              .split(/\r?\n/)
              .map((item) => item.trim())
              .filter(Boolean);
        }

        return request;
      },
    },

    edit: {
      ...companyMarketActions.edit,
      before: async (request) => {
        if (typeof request.payload?.relatedProductService === "string") {
          request.payload.relatedProductService =
            request.payload.relatedProductService
              .split(/\r?\n/)
              .map((item) => item.trim())
              .filter(Boolean);
        }

        return request;
      },
    },
  },
});

export const keyCustomerResource = prismaResource("KeyCustomer", {
  navigation: companyProfileNavigation,

  properties: {
    companyId: companyIdShowEditOnlyProperty,
    category: {
      availableValues: customerCategories,
    },

    revenueImpactLevel: {
      availableValues: revenueImpact,
    },

    loyaltyLevel: {
      availableValues: loyaltyLevels,
    },

    walletShareLevel: {
      availableValues: shareOfWallet,
    },

    sortOrder: {
      isVisible: {
        list: false,
        filter: false,
        show: true,
        edit: false,
        new: false,
      },
    },
  },

  actions: {
    ...keyCustomerActions,
  },
});

export const companyResourceCapabilityResource = prismaResource(
  "CompanyResourceCapability",
  {
    navigation: companyProfileNavigation,

    properties: {
      companyId: companyIdShowEditOnlyProperty,
      category: {
        availableValues: categoryOptions,
      },

      rarityLevel: {
        availableValues: rarityOptions,
      },

      inimitabilityLevel: {
        availableValues: imitabilityOptions,
      },

      sortOrder: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
          new: false,
        },
      },
    },

    actions: {
      ...companyResourceCapabilityActions,
    },
  },
);

export const companySupplierResource = prismaResource("CompanySupplier", {
  navigation: companyProfileNavigation,

  properties: {
    companyId: companyIdShowEditOnlyProperty,

    bargainingPower: {
      availableValues: BARGAINING_POWER,
    },

    description: {
      isVisible: {
        list: false,
        filter: false,
        show: true,
        edit: true,
      },
    },

    sortOrder: {
      isVisible: {
        list: false,
        filter: false,
        show: true,
        edit: false,
        new: false,
      },
    },
  },

  actions: {
    ...companySupplierActions,
  },
});

export const companyRawMaterialResource = prismaResource("CompanyRawMaterial", {
  navigation: companyProfileNavigation,

  properties: {
    companyId: companyIdShowEditOnlyProperty,

    costImpactLevel: {
      availableValues: COST_IMPACT_LEVELS,
    },

    purchaseBudgetShare: {
      availableValues: PURCHASE_BUDGET_SHARES,
    },

    category: {
      availableValues: PROCUREMENT_CATEGORIES,
    },

    description: {
      isVisible: {
        filter: false,
      },
    },

    sortOrder: {
      isVisible: {
        list: false,
        filter: false,
        show: true,
        edit: false,
        new: false,
      },
    },
  },

  actions: {
    ...companyRawMaterialActions,
  },
});

const fileAttachmentResource = {
  resource: {
    model: getModelByName("FileAttachment"),
    client: prisma,
  },
  options: {
    navigation: {
      name: "مدیریت فایل‌ها",
      icon: "Attachment",
    },

    properties: {
      id: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
        },
      },
      owner: {
        isVisible: {
          list: true,
          show: true,
          edit: false,
          filter: false,
        },
      },

      uploadFile: {
        isVisible: {
          list: false,
          filter: false,
          show: false,
          edit: true,
        },
      },

      uploadKey: {
        isVisible: {
          list: false,
          filter: false,
          show: false,
          edit: false,
        },
      },

      filePath: {
        isVisible: {
          list: true,
          show: true,
          edit: false,
          filter: false,
        },
      },

      originalName: {
        isVisible: {
          list: true,
          show: true,
          edit: false,
          filter: false,
        },
      },

      fileName: {
        isTitle: true,
        isVisible: {
          list: false,
          show: true,
          edit: false,
          filter: false,
        },
      },

      extension: {
        isVisible: {
          list: true,
          show: true,
          edit: false,
          filter: true,
        },
      },

      mimeType: {
        isVisible: {
          list: false,
          show: true,
          edit: false,
          filter: true,
        },
      },

      size: {
        isVisible: {
          list: true,
          show: true,
          edit: false,
          filter: false,
        },
      },

      uploadedById: {
        isVisible: {
          list: false,
          show: true,
          edit: false,
          filter: true,
        },
      },

      uploadedBy: {
        isVisible: {
          list: false,
          show: false,
          edit: false,
          filter: false,
        },
      },

      createdAt: {
        isVisible: {
          list: true,
          show: true,
          edit: false,
          filter: true,
        },
      },

      updatedAt: {
        isVisible: {
          list: false,
          show: true,
          edit: false,
          filter: true,
        },
      },
    },

    actions: {
      list: {
        after: async (response) => {
          if (!response.records.length) {
            return response;
          }

          for (const record of response.records) {
            const publicPath = normalizeUploadPublicPath(
              record.params.filePath,
            );
            if (publicPath) {
              record.params.filePath = publicPath;
            }
          }

          const fileIds = response.records.map((record) => record.params.id);

          const [
            managers,
            organizationUnits,
            licenses,
            balanceSheets,
            incomeStatements,
          ] = await Promise.all([
            prisma.companyManager.findMany({
              where: {
                resumeFileId: {
                  in: fileIds,
                },
              },
              select: {
                resumeFileId: true,
                fullName: true,
              },
            }),

            prisma.organizationUnit.findMany({
              where: {
                structureFileId: {
                  in: fileIds,
                },
              },
              select: {
                structureFileId: true,
                unitName: true,
              },
            }),

            prisma.companyLicenseCertificate.findMany({
              where: {
                attachmentFileId: {
                  in: fileIds,
                },
              },
              select: {
                attachmentFileId: true,
                title: true,
              },
            }),

            prisma.companyBalanceSheet.findMany({
              where: {
                balanceFileId: {
                  in: fileIds,
                },
              },
              select: {
                balanceFileId: true,
                title: true,
              },
            }),

            prisma.companyIncomeStatement.findMany({
              where: {
                incomeFileId: {
                  in: fileIds,
                },
              },
              select: {
                incomeFileId: true,
                title: true,
              },
            }),
          ]);

          const ownerMap = Object.create(null);

          for (const item of managers) {
            ownerMap[item.resumeFileId] = `رزومه مدیر: ${item.fullName}`;
          }

          for (const item of organizationUnits) {
            ownerMap[item.structureFileId] = `چارت سازمانی: ${item.unitName}`;
          }

          for (const item of licenses) {
            ownerMap[item.attachmentFileId] = `گواهی / مجوز: ${item.title}`;
          }

          for (const item of balanceSheets) {
            ownerMap[item.balanceFileId] = `ترازنامه: ${item.title}`;
          }

          for (const item of incomeStatements) {
            ownerMap[item.incomeFileId] = `صورت سود و زیان: ${item.title}`;
          }

          for (const record of response.records) {
            record.params.owner = ownerMap[record.params.id] ?? "-";
          }

          return response;
        },
      },

      show: {
        after: async (response) => {
          const publicPath = normalizeUploadPublicPath(
            response.record?.params?.filePath,
          );
          if (publicPath) {
            response.record.params.filePath = publicPath;
          }

          return response;
        },
      },

      new: {
        before: async (request, context) => {
          return prepareRequest(request, context.currentAdmin);
        },

        after: async (response, request, context) => {
          await runAfterSaveSideEffect("FILE_ATTACHMENT_SYNC", () =>
            syncFileAttachment(response.record, request, context.currentAdmin),
          );

          return response;
        },
      },

      edit: {
        before: async (request, context) => {
          return prepareRequest(request, context.currentAdmin);
        },

        after: async (response, request, context) => {
          await runAfterSaveSideEffect("FILE_ATTACHMENT_SYNC", () =>
            syncFileAttachment(response.record, request, context.currentAdmin),
          );

          return response;
        },
      },

      downloadFile: {
        actionType: "record",
        icon: "Download",
        label: "دانلود فایل",
        component: Components.DownloadFileAttachment,
        guard: false,

        handler: async (request, response, context) => {
          const publicPath = normalizeUploadPublicPath(
            context.record.params.filePath,
          );

          if (!publicPath) {
            return {
              record: context.record.toJSON(context.currentAdmin),
              notice: {
                message: "فایلی برای دانلود وجود ندارد",
                type: "error",
              },
            };
          }

          context.record.params.filePath = publicPath;

          return {
            record: context.record.toJSON(context.currentAdmin),
          };
        },
      },
    },
  },

  features: [
    uploadFeature({
      componentLoader,

      provider: {
        local: {
          bucket: UPLOADS_ROOT,
          opts: {
            baseUrl: "/uploads",
          },
        },
      },

      properties: {
        key: "uploadKey",
        file: "uploadFile",
        mimeType: "mimeType",
        size: "size",
        filename: "fileName",
      },

      uploadPath: (record, filename) => {
        return `file/${Date.now()}-${filename}`;
      },

      validation: {
        maxSize: 5 * 1024 * 1024,
      },
    }),
  ],
};

let admin;

async function createAdmin() {
  await loadFormQuestionAnalysisTitleFilterOptions();

  admin = new AdminJS({
  rootPath: ADMIN_ROOT_PATH,
  componentLoader,
  branding: {
    companyName: "Strategy Proposal Admin",
    softwareBrothers: false,
    withMadeWithLove: false,
  },

  locale: {
    language: "fa",
    availableLanguages: ["fa"],
    translations: {
      fa: {
        labels: {
        AnalysisCategory: "دسته‌بندی تحلیل‌ها",
        AnalysisForm: "تحلیل های تکی",
        AnalysisFormProfileField: "فیلدهای ورودی پروفایل (تحلیل تکی)",
        ChatMessage: "پیام‌های چت",
        Company: "شرکت‌ها",
        CompanyAdminData: "داده‌های ادمین شرکت",
        CompanyAnalysisTierConfig: "طبقه‌های تحلیل شرکت",
        CompanyAnalysisTierItem: "تحلیل‌های هر طبقه",
        CompanyBalanceSheet: "ترازنامه",
        CompanyBasicInfo: "اطلاعات پایه شرکت",
        CompanyIncomeStatement: "صورت سود و زیان",
        CompanyInsight: "بینش شرکت",
        CompanyLicenseCertificate: "مجوزها و گواهینامه‌ها",
        CompanyManager: "مدیران شرکت",
        CompanyMarket: "بازارها",
        CompanyMembership: "عضویت‌ها",
        CompanyProductService: "محصولات و خدمات",
        CompanyRawMaterial: "مواد اولیه",
        CompanyResourceCapability: "قابلیت‌های منابع",
        CompanyShareholder: "سهامداران",
        CompanySupplier: "تأمین‌کنندگان",
        FeaturedAnalysis: "تحلیل های منتخب در داشبورد",
        FileAttachment: "فایل‌های پیوست",
        FollowUpForm: "فرم‌های پیگیری",
        FollowUpFormQuestion: "سوالات فرم پیگیری",
        FollowUpRequest: "درخواست‌های پیگیری",
        FormGoal: "اهداف تحلیل تکی",
        FormQuestion: "متن سوالات",
        FormQuestionCategory: "دسته‌بندی سوالات",
        FormQuestionOption: "گزینه‌های سوال",
        IndustryInsight: "بینش صنعت",
        KeyCustomer: "مشتریان کلیدی",
        MultiAnalysisForm: "تحلیل های صفر تاصد",
        MultiAnalysisFormProfileField: "فیلدهای ورودی پروفایل (تحلیل صفر تاصد)",
        MultiAnalysisGoal: "اهداف تحلیل صفرتاصد",
        MultiAnalysisProjectSource: "منابع پروژه چندگانه",
        MultiAnalysisRequiredForm: "پروژه های ورودی موردنیاز تحلیل ها",
        Notification: "اعلان‌ها",
        OrganizationUnit: "ساختار سازمانی",
        ProfileViewAccess: "دسترسی مشاهده پروفایل",
        Project: "پروژه‌ها",
        ProjectAccess: "دسترسی پروژه",
        ProjectComment: "کامنت‌ها",
        ProjectGoal: "اهداف پروژه",
        ProjectMultiGoal: "اهداف چندگانه پروژه",
        ProjectPlan: "برنامه پروژه",
        ProjectPlanAction: "اقدامات برنامه پروژه",
        ProjectRatingHistory: "امتیازدهی پروژه",
        PromptDefinition: "تعریف پرامپت",
        PromptSegmentDefinition: "سگمنت‌های پرامپت",
        PromptVersion: "نسخه‌های پرامپت",
        PromptVersionSegmentValue: "مقادیر سگمنت نسخه پرامپت",
        RefreshToken: "رفرش توکن‌ها",
        RevenueCenter: "مراکز درآمد",
        StrategyAiRun: "اجرای هوش مصنوعی پایش",
        StrategyApproval: "تأییدهای پایش",
        StrategyMap: "نقشه پایش",
        StrategyMeasure: "شاخص‌های پایش",
        StrategyMeasureMeasurement: "اندازه‌گیری شاخص",
        StrategyMeasureTarget: "اهداف شاخص",
        StrategyObjective: "اهداف پایش",
        StrategyObjectiveRelation: "ارتباط اهداف",
        StrategyPlan: "برنامه پایش",
        User: "کاربران",
        UserCompetency: "شایستگی‌های کاربر",
        UserEducation: "تحصیلات کاربر",
        UserInfo: "اطلاعات کاربر",
        UserTrainingCourse: "دوره‌های آموزشی کاربر",
        tierLabel: "طبقه",
        tierSelection: "طبقه",
        navigation: "ناوبری",
      },
        resources: {
          FormGoal: {
            properties: {
              analysisForm: "analysisForm",
              form: "analysisForm",
              formId: "analysisForm",
              title: "goal title",
            },
          },
          MultiAnalysisRequiredForm: {
            properties: {
              multiAnalysisForm: "Multi Analysis",
              form: "Required single analysis",
              requiredMultiAnalysisForm: "Required Multi Analysis",
            },
          },
          MultiAnalysisGoal: {
            properties: {
              multiAnalysisFormTitle: "Multi Analysis",
              multiAnalysisForm: "Multi Analysis",
              multiAnalysisFormId: "Multi Analysis",
              title: "goal title",
            },
          },
          AnalysisFormProfileField: {
            properties: {
              form: "analysis title",
            },
          },
          MultiAnalysisFormProfileField: {
            properties: {
              multiAnalysisForm: "Multi Analysis",
            },
          },
          FormQuestionCategory: {
            properties: {
              formTitle: "analysis title",
              analysisForm: "analysis title",
              analysisFormId: "analysis title",
              multiAnalysisForm: "Multi Analysis title",
              multiAnalysisFormId: "Multi Analysis title",
            },
          },
          FormQuestion: {
            properties: {
              formTitle: "analysis title",
            },
          },
        },
        buttons: {
          save: "ذخیره",
          addNewItem: "افزودن",
          filter: "فیلتر",
          applyChanges: "اعمال تغییرات",
          resetFilter: "حذف فیلتر",
          confirmRemovalMany: "تایید حذف",
          confirmRemovalMany_plural: "تایید حذف",
          logout: "خروج",
          login: "ورود",
        },
        actions: {
          new: "ایجاد",
          edit: "ویرایش",
          show: "نمایش",
          delete: "حذف",
          bulkDelete: "حذف گروهی",
          list: "لیست",
        },
        messages: {
          successfullyBulkDeleted: "موارد انتخاب‌شده با موفقیت حذف شدند",
          successfullyBulkDeleted_plural: "موارد انتخاب‌شده با موفقیت حذف شدند",
          successfullyDeleted: "با موفقیت حذف شد",
          successfullyUpdated: "با موفقیت ویرایش شد",
          successfullyCreated: "با موفقیت ایجاد شد",
        },
      },
    },
  },
  resources: [
    prismaResource("Company", {
      navigation: {
        name: "مدیریت شرکت‌ها",
        icon: "Building",
      },

      properties: {
        name: { isTitle: true },

        userLimit: {
          type: "number",
          help: "حداکثر تعداد کاربران مجاز برای این شرکت",
        },

        chatMessageLimit: {
          type: "number",
          help: "حداکثر تعداد پیام‌های مجاز چت AI برای این شرکت",
        },
      },

      listProperties: [
        "id",
        "name",
        "industry",
        "userLimit",
        "chatMessageLimit",
        // "monitoringUnlockedAt",
        "createdAt",
      ],

      editProperties: [
        "name",
        "industry",
        "userLimit",
        "chatMessageLimit",
        "monitoringUnlockedAt",
      ],

      actions: {
        new: {
          isAccessible: true,
          after: async (response) => {
            const companyId = response?.record?.params?.id;
            if (companyId) {
              await bootstrapCompanyTierConfigs(companyId);
            }
            return response;
          },
        },
        generateInsight: {
          actionType: "record",
          icon: "Brain",
          label: "دریافت تحلیل AI",
          component: Components.AsyncRecordActionLoader,

          handler: async (request, response, context) => {
            const { record, h, currentAdmin } = context;

            if (request.method?.toLowerCase() === "get") {
              return {
                record: record.toJSON(currentAdmin),
              };
            }

            await syncCompanyInsightService(record.params.id);

            return {
              record: record.toJSON(currentAdmin),
              notice: {
                message: "تحلیل ساخته شد",
                type: "success",
              },
              redirectUrl: h.recordActionUrl({
                resourceId: "Company",
                recordId: record.id(),
                actionName: "show",
              }),
            };
          },
        },

        generateIndustryInsight: {
          actionType: "record",
          icon: "Activity",
          label: "دریافت تحلیل صنعت",
          component: Components.AsyncRecordActionLoader,

          handler: async (request, response, context) => {
            const { record, h, currentAdmin } = context;

            if (request.method?.toLowerCase() === "get") {
              return {
                record: record.toJSON(currentAdmin),
              };
            }

            const result = await syncIndustryInsightService(record.params.id);

            return {
              record: record.toJSON(currentAdmin),
              notice: result
                ? {
                    message: "تحلیل صنعت با موفقیت دریافت شد.",
                    type: "success",
                  }
                : {
                    message:
                      "دریافت تحلیل صنعت ناموفق بود. لاگ سرور را بررسی کنید.",
                    type: "error",
                  },
              redirectUrl: h.recordActionUrl({
                resourceId: "Company",
                recordId: record.id(),
                actionName: "show",
              }),
            };
          },
        },

        manageAnalysisTiers: {
          actionType: "record",
          icon: "Layers",
          label: "مدیریت طبقات تحلیل",
          component: false,

          handler: async (request, response, context) => {
            const companyId = context.record.params.id;
            const existingCount = await prisma.companyAnalysisTierConfig.count({
              where: { companyId },
            });

            if (existingCount === 0) {
              await bootstrapCompanyTierConfigs(companyId);
            }

            return {
              record: context.record.toJSON(),
              notice: {
                message:
                  existingCount === 0
                    ? "۴ طبقه تحلیل ساخته شد. حالا می‌توانید هر طبقه را فعال/غیرفعال کنید"
                    : "طبقات این شرکت آماده مدیریت هستند",
                type: "success",
              },
              redirectUrl: buildAdminResourceListUrl(
                "CompanyAnalysisTierConfig",
                {
                  company: companyId,
                },
              ),
            };
          },
        },
      },
    }),
    prismaResource("CompanyAnalysisTierConfig", {
      navigation: {
        name: "مدیریت شرکت‌ها",
        icon: "Building",
      },
      titleProperty: "tier",
      properties: {
        company: {
          reference: "Company",
        },
        tier: {
          availableValues: ANALYSIS_TIER_OPTIONS,
        },
        tierLabel: {
          type: "string",
          label: "طبقه",
          isVisible: {
            list: true,
            filter: false,
            show: true,
            edit: false,
            new: false,
          },
        },
        isEnabled: {
          type: "boolean",
          label: "فعال",
          help: "فعال/غیرفعال کردن دسترسی شرکت به تحلیل‌های این طبقه",
        },
      },
      listProperties: ["company", "tierLabel", "isEnabled", "updatedAt"],
      showProperties: [
        "id",
        "company",
        "tierLabel",
        "isEnabled",
        "createdAt",
        "updatedAt",
      ],
      editProperties: ["isEnabled"],
      filterProperties: ["company", "tier", "isEnabled"],
      actions: {
        new: {
          isAccessible: false,
        },
        delete: {
          isAccessible: false,
        },
        bulkDelete: {
          isAccessible: false,
        },
        list: {
          after: async (response) => {
            await enrichCompanyAnalysisTierConfigRecords(
              response.records ?? [],
            );
            return response;
          },
        },
        search: {
          after: async (response) => {
            await enrichCompanyAnalysisTierConfigRecords(
              response.records ?? [],
            );
            return response;
          },
        },
        show: {
          after: async (response) => {
            if (response.record) {
              await enrichCompanyAnalysisTierConfigRecords([response.record]);
            }
            return response;
          },
        },
        manageTierAnalyses: {
          actionType: "record",
          icon: "List",
          label: "تحلیل‌های این طبقه",
          component: false,
          handler: async (request, response, context) => {
            const companyId =
              context.record.params.company ||
              context.record.populated?.company?.id;
            const tier = context.record.params.tier;

            return {
              record: context.record.toJSON(context.currentAdmin),
              redirectUrl: buildAdminResourceListUrl(
                "CompanyAnalysisTierItem",
                {
                  company: companyId,
                  tierSelection: tier,
                },
              ),
            };
          },
        },
      },
    }),
    prismaResource("CompanyAnalysisTierItem", {
      navigation: {
        name: "مدیریت شرکت‌ها",
        icon: "Building",
      },
      properties: {
        company: {
          reference: "Company",
          isTitle: true,
        },
        tierSelection: {
          type: "string",
          isVirtual: true,
          label: "طبقه",
          availableValues: ANALYSIS_TIER_OPTIONS,
          help: "ابتدا شرکت را انتخاب کنید، سپس طبقه. اگر طبقه‌ای نیست، از صفحه شرکت «مدیریت طبقات تحلیل» را بزنید",
          isVisible: {
            list: false,
            filter: true,
            show: false,
            edit: true,
            new: true,
          },
        },
        tierLabel: {
          type: "string",
          isVirtual: true,
          label: "طبقه",
          isVisible: {
            list: true,
            filter: false,
            show: true,
            edit: false,
            new: false,
          },
        },
        configId: {
          isVisible: {
            list: false,
            filter: false,
            show: false,
            edit: false,
            new: false,
          },
        },
        config: {
          reference: "CompanyAnalysisTierConfig",
          isVisible: {
            list: false,
            filter: false,
            show: false,
            edit: false,
            new: false,
          },
        },
        analysisForm: { reference: "AnalysisForm" },
        multiAnalysisForm: { reference: "MultiAnalysisForm" },
        sortOrder: { type: "number", label: "ترتیب نمایش" },
      },
      listProperties: [
        "company",
        "tierLabel",
        "analysisForm",
        "multiAnalysisForm",
        "sortOrder",
      ],
      showProperties: [
        "id",
        "company",
        "tierLabel",
        "analysisForm",
        "multiAnalysisForm",
        "sortOrder",
        "createdAt",
        "updatedAt",
      ],
      newProperties: [
        "company",
        "tierSelection",
        "analysisForm",
        "multiAnalysisForm",
        "sortOrder",
      ],
      editProperties: [
        "company",
        "tierSelection",
        "analysisForm",
        "multiAnalysisForm",
        "sortOrder",
      ],
      filterProperties: ["company", "tierSelection"],
      actions: {
        list: {
          before: applyCompanyAnalysisTierItemFilters,
          handler: async (request, response, context) => {
            const configIds = request._companyAnalysisTierItemConfigIds;
            if (!configIds?.length) {
              return ListAction.handler(request, response, context);
            }

            const { query } = request;
            const {
              sortBy,
              direction,
              filters = {},
              page,
              perPage: perPageRaw,
            } = flat.unflatten(query || {});
            const { resource, _admin, currentAdmin } = context;

            const perPage = perPageRaw
              ? Math.min(+perPageRaw, 500)
              : (_admin.options.settings?.defaultPerPage ?? 10);
            const pageNum = Number(page) || 1;

            const listProperties = resource.decorate().getListProperties();
            const firstProperty = listProperties.find((p) => p.isSortable());
            let sort;
            if (firstProperty) {
              const sortSetter = await getAdminJsSortSetter();
              sort = sortSetter(
                { sortBy, direction },
                firstProperty.name(),
                resource.decorate().options,
              );
            }

            const filter = await new Filter(filters, resource).populate(
              context,
            );
            const where = {
              ...convertFilter(
                getModelByName("CompanyAnalysisTierItem").fields,
                filter,
              ),
              configId: { in: configIds },
            };

            const orderBy = resource.buildSortBy(sort);
            const [results, total] = await Promise.all([
              prisma.companyAnalysisTierItem.findMany({
                where,
                skip: (pageNum - 1) * perPage,
                take: perPage,
                orderBy,
              }),
              prisma.companyAnalysisTierItem.count({ where }),
            ]);

            const populator = await getAdminJsPopulator();
            const records = results.map((result) =>
              resource.build(resource.prepareReturnValues(result)),
            );
            const populatedRecords = await populator(records, context);
            context.records = populatedRecords;

            const jsonRecords = populatedRecords.map((record) =>
              record.toJSON(currentAdmin),
            );
            await enrichCompanyAnalysisTierItemRecords(jsonRecords);

            return {
              meta: {
                total,
                perPage,
                page: pageNum,
                direction: sort?.direction,
                sortBy: sort?.sortBy,
              },
              records: jsonRecords,
            };
          },
          after: async (response) => {
            await enrichCompanyAnalysisTierItemRecords(response.records ?? []);
            return response;
          },
        },
        show: {
          after: async (response) => {
            if (response.record) {
              await enrichCompanyAnalysisTierItemRecords([response.record]);
            }
            return response;
          },
        },
        new: {
          isAccessible: true,
          before: async (request, context) => {
            if (request.method?.toLowerCase() !== "post") {
              return request;
            }

            return prepareCompanyAnalysisTierItemPayload(request, context);
          },
        },
        edit: {
          before: async (request, context) => {
            if (request.method?.toLowerCase() !== "post") {
              return request;
            }

            return prepareCompanyAnalysisTierItemPayload(request, context);
          },
          after: async (response, request) => {
            if (
              request.method?.toLowerCase() === "get" &&
              response?.record
            ) {
              await enrichCompanyAnalysisTierItemRecords([response.record]);
            }

            return response;
          },
        },
      },
    }),
    userInfoResource,
    userEducationResource,
    userTrainingCourseResource,
    userCompetencyResource,
    companyBasicInfoResource,
    companyManagerResource,
    organizationUnitResource,
    companyLicenseCertificateResource,
    companyBalanceSheetResource,
    companyIncomeStatementResource,
    revenueCenterResource,
    companyShareholderResource,
    companyMembershipResource,
    companyProductServiceResource,
    companyMarketResource,
    keyCustomerResource,
    companyResourceCapabilityResource,
    companySupplierResource,
    companyRawMaterialResource,
    companyInsightResource,
    industryInsightResource,
    fileAttachmentResource,
    prismaResource("ProjectComment", {
      navigation: {
        name: "پروژه‌ها",
        icon: "MessageSquare",
      },

      properties: {
        id: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: false,
          },
        },

        project: {
          reference: "Project",
          label: "پروژه",
          isVisible: {
            list: false,
            filter: true,
            show: false,
            edit: true,
          },
        },
        user: {
          reference: "User",
          label: "کاربر",
          isVisible: {
            list: false,
            filter: true,
            show: false,
            edit: true,
          },
        },
        content: {
          type: "textarea",
          label: "متن کامنت",
          isVisible: {
            list: false,
            filter: false,
            show: true,
            edit: true,
          },
        },

        projectId: {
          reference: "Project",
          label: "پروژه",
          isVisible: {
            list: false,
            filter: false,
            show: true,
            edit: false,
            new: false,
          },
        },

        userId: {
          reference: "User",
          label: "کاربر",
          isVisible: {
            list: false,
            filter: false,
            show: true,
            edit: false,
            new: false,
          },
        },

        projectName: {
          type: "string",
          isVirtual: true,
          label: "پروژه",
          isVisible: {
            list: true,
            show: true,
            edit: false,
            filter: false,
          },
        },

        username: {
          type: "string",
          isVirtual: true,
          label: "کاربر",
          isVisible: {
            list: true,
            show: true,
            edit: false,
            filter: false,
          },
        },

        createdAt: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: false,
          },
        },

        updatedAt: {
          isVisible: {
            list: false,
            filter: true,
            show: true,
            edit: false,
          },
        },
      },

      listProperties: ["id", "projectName", "username", "createdAt"],

      showProperties: [
        "id",
        "projectName",
        "username",
        "content",
        "createdAt",
        "updatedAt",
      ],

      editProperties: ["content"],

      filterProperties: ["user", "project", "createdAt", "updatedAt"],
      actions: {
        new: {
          layout: ["project", "user", "content"],
          handler: async (request, response, context) => {
            const { resource, h, currentAdmin } = context;

            if (request.method?.toLowerCase() !== "post") {
              return {
                record: resource.build({}),
              };
            }

            const payload = request.payload ?? {};
            const projectId = normalizeAdminReferenceId(
              payload.projectId ?? payload.project,
            );
            const userId = normalizeAdminReferenceId(
              payload.userId ?? payload.user,
            );
            const content =
              typeof payload.content === "string"
                ? payload.content.trim()
                : "";

            const propertyErrors = {};

            if (!projectId) {
              propertyErrors.project = {
                message: "انتخاب پروژه الزامی است",
              };
            }

            if (!userId) {
              propertyErrors.user = {
                message: "انتخاب کاربر الزامی است",
              };
            }

            if (!content) {
              propertyErrors.content = {
                message: "متن کامنت الزامی است",
              };
            }

            if (Object.keys(propertyErrors).length > 0) {
              const record = resource.build(payload);
              return {
                record: {
                  ...record.toJSON(currentAdmin),
                  errors: propertyErrors,
                },
                notice: {
                  message: "خطا در اعتبارسنجی",
                  type: "error",
                },
              };
            }

            const created = await prisma.projectComment.create({
              data: {
                content,
                projectId,
                userId,
              },
            });

            return {
              record: resource.build(created).toJSON(currentAdmin),
              redirectUrl: h.resourceUrl({
                resourceId: resource.id(),
              }),
              notice: {
                message: "کامنت با موفقیت ایجاد شد",
                type: "success",
              },
            };
          },
        },
        list: {
          after: async (response) => {
            if (!response.records?.length) {
              return response;
            }

            const projectIds = [
              ...new Set(
                response.records
                  .map(
                    (record) =>
                      record.params.projectId ?? record.params.project,
                  )
                  .filter(Boolean),
              ),
            ];

            const userIds = [
              ...new Set(
                response.records
                  .map(
                    (record) => record.params.userId ?? record.params.user,
                  )
                  .filter(Boolean),
              ),
            ];

            const [projects, users] = await Promise.all([
              prisma.project.findMany({
                where: {
                  id: {
                    in: projectIds,
                  },
                },
                select: {
                  id: true,
                  title: true,
                },
              }),

              prisma.user.findMany({
                where: {
                  id: {
                    in: userIds,
                  },
                },
                select: {
                  id: true,
                  username: true,
                },
              }),
            ]);

            const projectMap = Object.fromEntries(
              projects.map((project) => [project.id, project.title]),
            );

            const userMap = Object.fromEntries(
              users.map((user) => [user.id, user.username]),
            );

            response.records.forEach((record) => {
              const projectId =
                record.params.projectId ?? record.params.project;
              const userId = record.params.userId ?? record.params.user;

              record.params.projectName = projectMap[projectId] || "—";
              record.params.username = userMap[userId] || "—";
            });

            return response;
          },
        },

        show: {
          after: async (response) => {
            if (!response.record) {
              return response;
            }

            const record = response.record;
            const projectId =
              record.params.projectId ?? record.params.project;
            const userId = record.params.userId ?? record.params.user;

            const [project, user] = await Promise.all([
              projectId
                ? prisma.project.findUnique({
                    where: { id: projectId },
                    select: { title: true },
                  })
                : null,

              userId
                ? prisma.user.findUnique({
                    where: { id: userId },
                    select: { username: true },
                  })
                : null,
            ]);

            record.params.projectName = project?.title || "—";
            record.params.username = user?.username || "—";

            return response;
          },
        },
      },
    }),
    prismaResource("User", {
      navigation: userManagementNavigation,

      properties: {
        id: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: false,
          },
        },

        username: {
          isTitle: true,
          isRequired: true,
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: true,
          },
        },

        password: {
          isVisible: {
            list: false,
            filter: false,
            show: false,
            edit: true,
          },
        },

        email: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: true,
          },
        },

        phoneNumber: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: true,
          },
        },

        role: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: true,
          },
        },

        companyId: {
          reference: "Company",
          isVisible: {
            list: false,
            filter: false,
            show: false,
            edit: true,
          },
        },

        company: {
          reference: "Company",
          isVisible: {
            list: false,
            filter: true,
            show: false,
            edit: false,
          },
        },

        companyName: {
          type: "string",
          isVirtual: true,
          label: "شرکت",
          isVisible: {
            list: true,
            filter: false,
            show: true,
            edit: false,
          },
        },

        createdAt: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: false,
          },
        },

        updatedAt: {
          isVisible: {
            list: false,
            filter: true,
            show: true,
            edit: false,
          },
        },

        company: {
          isVisible: false,
        },
      },

      listProperties: ["id", "username", "role", "companyName", "createdAt"],

      filterProperties: ["username", "role", "createdAt", "company"],

      showProperties: [
        "id",
        "username",
        "role",
        "companyName",
        "createdAt",
        "updatedAt",
      ],

      editProperties: ["username", "password", "role", "companyId"],

      actions: {
        list: {
          after: async (response) => {
            if (!response.records?.length) return response;

            const companyIds = [
              ...new Set(
                response.records
                  .map((record) =>
                    getCompanyIdFromRecordParams(record.params),
                  )
                  .filter(Boolean),
              ),
            ];

            const companies = await prisma.company.findMany({
              where: {
                id: {
                  in: companyIds,
                },
              },
              select: {
                id: true,
                name: true,
              },
            });

            const companyMap = Object.fromEntries(
              companies.map((c) => [c.id, c.name]),
            );

            response.records.forEach((record) => {
              const companyId = getCompanyIdFromRecordParams(record.params);
              record.params.companyName = companyId
                ? (companyMap[companyId] ?? "—")
                : "—";
            });

            return response;
          },
        },
        show: {
          after: async (response) => {
            if (!response.record) return response;

            await enrichUserRecordCompanyIdForEdit(response.record);

            return response;
          },
        },
        new: {
          handler: async (request, response, context) => {
            const { resource, h, currentAdmin } = context;

            if (request.method === "get") {
              return {
                resource: resource.decorate().toJSON(currentAdmin),
                record: null,
              };
            }

            const payload = request.payload ?? {};

            const username = payload.username;
            const password = payload.password;
            const email = payload.email;
            const phoneNumber = payload.phoneNumber;
            const role = payload.role;
            const companyId = payload.companyId;
            const progress = payload.progress;
            const profileCompleted = payload.profileCompleted;

            const errors = {};

            if (!username || !String(username).trim()) {
              errors.username = { message: "نام کاربری الزامی است." };
            }

            if (!password || !String(password).trim()) {
              errors.password = { message: "رمز عبور الزامی است." };
            }

            if (!role || !String(role).trim()) {
              errors.role = { message: "نقش کاربر الزامی است." };
            }

            if (Object.keys(errors).length > 0) {
              throw new ValidationError(errors);
            }

            try {
              const hashedPassword = await bcrypt.hash(String(password), 10);

              const data = {
                username: String(username).trim(),
                password: hashedPassword,
                email: email ? String(email).trim() : null,
                phoneNumber: phoneNumber ? String(phoneNumber).trim() : null,
                role: String(role).trim(),
                progress: progress ?? null,
                profileCompleted:
                  profileCompleted === true ||
                  profileCompleted === "true" ||
                  profileCompleted === "on",
              };

              if (companyId && String(companyId).trim()) {
                data.company = {
                  connect: {
                    id: String(companyId).trim(),
                  },
                };
              }

              const created = await prisma.user.create({
                data,
              });

              return {
                record: buildRecordJson(resource, created, currentAdmin),
                notice: {
                  message: "کاربر با موفقیت ایجاد شد.",
                  type: "success",
                },
                redirectUrl: h.recordActionUrl({
                  resourceId: resource.id(),
                  recordId: created.id,
                  actionName: "show",
                }),
              };
            } catch (error) {
              console.error("USER_CREATE_ERROR:", error);

              if (error instanceof ValidationError) {
                throw error;
              }

              throw new ValidationError({
                companyId: {
                  message:
                    "شرکت واردشده معتبر نیست یا ایجاد ارتباط با شرکت ممکن نشد.",
                },
              });
            }
          },
        },

        edit: {
          handler: async (request, response, context) => {
            const { record, resource, h, currentAdmin } = context;

            if (!record) {
              throwRecordNotFound();
            }

            if (request.method?.toLowerCase() !== "post") {
              const recordJson = record.toJSON(currentAdmin);
              await enrichUserRecordCompanyIdForEdit(recordJson);
              return {
                record: recordJson,
                resource: resource.decorate().toJSON(currentAdmin),
              };
            }

            const payload = request.payload ?? {};

            const username = payload.username;
            const password = payload.password;
            const email = payload.email;
            const phoneNumber = payload.phoneNumber;
            const role = payload.role;
            const companyId = payload.companyId;
            const progress = payload.progress;
            const profileCompleted = payload.profileCompleted;

            const errors = {};

            if (!username || !String(username).trim()) {
              errors.username = { message: "نام کاربری الزامی است." };
            }

            if (!role || !String(role).trim()) {
              errors.role = { message: "نقش کاربر الزامی است." };
            }

            if (Object.keys(errors).length > 0) {
              throw new ValidationError(errors);
            }

            try {
              const data = {
                username: String(username).trim(),
                email: email ? String(email).trim() : null,
                phoneNumber: phoneNumber ? String(phoneNumber).trim() : null,
                role: String(role).trim(),
                progress: progress ?? null,
                profileCompleted:
                  profileCompleted === true ||
                  profileCompleted === "true" ||
                  profileCompleted === "on",
              };

              if (password && String(password).trim()) {
                const passwordValue = String(password).trim();

                if (
                  passwordValue.startsWith("$2a$") ||
                  passwordValue.startsWith("$2b$") ||
                  passwordValue.startsWith("$2y$")
                ) {
                  data.password = passwordValue;
                } else {
                  data.password = await bcrypt.hash(passwordValue, 10);
                }
              }

              if (companyId && String(companyId).trim()) {
                data.company = {
                  connect: {
                    id: String(companyId).trim(),
                  },
                };
              } else {
                data.company = {
                  disconnect: true,
                };
              }

              const updated = await prisma.user.update({
                where: {
                  id: String(record.param("id")),
                },
                data,
              });

              return {
                record: buildRecordJson(resource, updated, currentAdmin),
                notice: {
                  message: "کاربر با موفقیت ویرایش شد.",
                  type: "success",
                },
                redirectUrl: h.recordActionUrl({
                  resourceId: resource.id(),
                  recordId: updated.id,
                  actionName: "show",
                }),
              };
            } catch (error) {
              console.error("USER_UPDATE_ERROR:", error);

              if (error instanceof ValidationError) {
                throw error;
              }

              throw new ValidationError({
                companyId: {
                  message:
                    "شرکت واردشده معتبر نیست یا به‌روزرسانی ارتباط با شرکت ممکن نشد.",
                },
              });
            }
          },
        },
      },
    }),
    (() => {
      const mapCompanyAdminDataToVirtualFields = (
        rawData,
        recordParams = {},
      ) => {
        let parsed = rawData;

        if (typeof parsed === "string" && parsed.trim()) {
          try {
            parsed = JSON.parse(parsed);
          } catch {
            parsed = {};
          }
        }

        const data =
          parsed && typeof parsed === "object" && !Array.isArray(parsed)
            ? parsed
            : {};

        const legacyText = data.text || recordParams["data.text"] || "";

        return {
          financeInformationText:
            data.financeInformation ||
            data["Company Additional Financial Information"] ||
            recordParams["data.financeInformation"] ||
            "",
          externalInformationText:
            data.externalInformation ||
            data["Company Additional External Information"] ||
            recordParams["data.externalInformation"] ||
            "",
          internalInformationText:
            data.internalInformation ||
            data["Company Additional Internal Information"] ||
            recordParams["data.internalInformation"] ||
            legacyText,
          companyProfileText:
            data.companyProfile ||
            data["company Profile"] ||
            recordParams["data.companyProfile"] ||
            "",
        };
      };

      const buildCompanyAdminDataFromPayload = (payload) => ({
        financeInformation: String(payload?.financeInformationText || ""),
        externalInformation: String(payload?.externalInformationText || ""),
        internalInformation: String(payload?.internalInformationText || ""),
        companyProfile: String(payload?.companyProfileText || ""),
      });

      const enrichCompanyAdminDataRecordWithCompany = async (recordJson) => {
        if (!recordJson?.params) {
          return recordJson;
        }

        const companyId =
          normalizeAdminReferenceId(recordJson.params.companyId) ||
          normalizeAdminReferenceId(recordJson.params.company);

        if (!companyId) {
          recordJson.params.companyName = "—";
          return recordJson;
        }

        const company = await prisma.company.findUnique({
          where: { id: companyId },
          select: { id: true, name: true },
        });

        const companyName = company?.name ?? "—";

        recordJson.params.companyId = companyId;
        recordJson.params.company = companyId;
        recordJson.params.companyName = companyName;
        recordJson.populated = recordJson.populated ?? {};
        recordJson.populated.companyId = {
          params: { id: companyId, name: companyName },
          title: companyName,
        };

        return recordJson;
      };

      return prismaResource("CompanyAdminData", {
        navigation: companyManagementNavigation,

        properties: {
          id: {
            isVisible: {
              list: true,
              filter: true,
              show: true,
              edit: false,
            },
          },

          company: {
            reference: "Company",
            isVisible: {
              list: false,
              filter: true,
              show: false,
              edit: false,
            },
          },

          financeInformationText: {
            type: "textarea",
            isVirtual: true,
            position: 2,
            label: "اطلاعات مالی تکمیلی شرکت",
            isVisible: {
              list: false,
              filter: false,
              show: true,
              edit: true,
            },
            props: {
              rows: 10,
            },
          },

          externalInformationText: {
            type: "textarea",
            isVirtual: true,
            position: 3,
            label: "اطلاعات خارجی تکمیلی شرکت",
            isVisible: {
              list: false,
              filter: false,
              show: true,
              edit: true,
            },
            props: {
              rows: 10,
            },
          },

          internalInformationText: {
            type: "textarea",
            isVirtual: true,
            position: 4,
            label: "اطلاعات داخلی تکمیلی شرکت",
            isVisible: {
              list: false,
              filter: false,
              show: true,
              edit: true,
            },
            props: {
              rows: 10,
            },
          },

          companyProfileText: {
            type: "textarea",
            isVirtual: true,
            position: 5,
            label: "پروفایل شرکت",
            isVisible: {
              list: false,
              filter: false,
              show: true,
              edit: true,
            },
            props: {
              rows: 10,
            },
          },

          data: {
            type: "mixed",
            isVisible: {
              list: false,
              filter: false,
              show: false,
              edit: false,
            },
          },
          companyId: {
            reference: "Company",
            label: "شرکت",
            isVisible: {
              list: false,
              filter: false,
              show: true,
              edit: true,
            },
          },

          company: {
            reference: "Company",
            isVisible: {
              list: false,
              filter: true,
              show: false,
              edit: false,
            },
          },

          companyName: {
            type: "string",
            isVirtual: true,
            label: "نام شرکت",
            isVisible: {
              list: true,
              filter: false,
              show: false,
              edit: false,
            },
          },

          createdAt: {
            isVisible: {
              list: true,
              filter: true,
              show: true,
              edit: false,
            },
          },

          updatedAt: {
            isVisible: {
              list: false,
              filter: true,
              show: true,
              edit: false,
            },
          },
        },
        filterProperties: ["company", "createdAt"],
        listProperties: ["id", "companyName", "createdAt"],
        editProperties: [
          "companyId",
          "financeInformationText",
          "externalInformationText",
          "internalInformationText",
          "companyProfileText",
        ],
        showProperties: [
          "id",
          "companyName",
          "financeInformationText",
          "externalInformationText",
          "internalInformationText",
          "companyProfileText",
          "createdAt",
          "updatedAt",
        ],
        actions: {
          new: {
            handler: async (request, response, context) => {
              const { resource, h, currentAdmin } = context;

              if (request.method !== "post") {
                return {
                  record: resource.build({}),
                };
              }

              try {
                const companyId = String(
                  request.payload?.companyId || "",
                ).trim();

                if (!companyId) {
                  throw new ValidationError({
                    companyId: {
                      message: "شناسه شرکت الزامی است",
                    },
                  });
                }

                const companyExists = await prisma.company.findUnique({
                  where: { id: companyId },
                  select: { id: true },
                });

                if (!companyExists) {
                  throw new ValidationError({
                    companyId: {
                      message: "شرکتی با این شناسه پیدا نشد",
                    },
                  });
                }

                const adminData = buildCompanyAdminDataFromPayload(
                  request.payload,
                );

                const created = await prisma.companyAdminData.create({
                  data: {
                    companyId,
                    data: adminData,
                  },
                });

                const record = resource.build({
                  ...created,
                  ...mapCompanyAdminDataToVirtualFields(created?.data),
                });

                return {
                  record: record.toJSON(currentAdmin),
                  redirectUrl: h.resourceUrl({
                    resourceId: resource._decorated?.id() || resource.id(),
                  }),
                  notice: {
                    message: "اطلاعات با موفقیت ایجاد شد",
                    type: "success",
                  },
                };
              } catch (error) {
                if (error instanceof ValidationError) {
                  return {
                    record: resource
                      .build(request.payload)
                      .toJSON(currentAdmin),
                    notice: {
                      message: "خطای اعتبارسنجی",
                      type: "error",
                    },
                  };
                }

                throw error;
              }
            },
          },

          edit: {
            handler: async (request, response, context) => {
              const { record, resource, currentAdmin, h } = context;

              if (!record) {
                throwRecordNotFound();
              }

              if (request.method !== "post") {
                const dbRecord = await prisma.companyAdminData.findUnique({
                  where: { id: record.params.id },
                  select: { data: true, companyId: true },
                });

                const virtualFields = mapCompanyAdminDataToVirtualFields(
                  dbRecord?.data ?? record.params?.data,
                  record.params,
                );

                const editRecord = resource.build({
                  ...record.params,
                  companyId: dbRecord?.companyId ?? record.params.companyId,
                  ...virtualFields,
                });

                let recordJson = editRecord.toJSON(currentAdmin);
                recordJson = await enrichCompanyAdminDataRecordWithCompany(
                  recordJson,
                );

                return {
                  record: recordJson,
                };
              }

              try {
                const companyId = String(
                  request.payload?.companyId || "",
                ).trim();

                if (!companyId) {
                  throw new ValidationError({
                    companyId: {
                      message: "شناسه شرکت الزامی است",
                    },
                  });
                }

                const companyExists = await prisma.company.findUnique({
                  where: { id: companyId },
                  select: { id: true },
                });

                if (!companyExists) {
                  throw new ValidationError({
                    companyId: {
                      message: "شرکتی با این شناسه پیدا نشد",
                    },
                  });
                }

                const adminData = buildCompanyAdminDataFromPayload(
                  request.payload,
                );

                const updated = await prisma.companyAdminData.update({
                  where: {
                    id: record.params.id,
                  },
                  data: {
                    companyId,
                    data: adminData,
                  },
                });

                const updatedRecord = resource.build({
                  ...updated,
                  ...mapCompanyAdminDataToVirtualFields(updated?.data),
                });

                return {
                  record: updatedRecord.toJSON(currentAdmin),
                  redirectUrl: h.recordActionUrl({
                    resourceId: resource._decorated?.id() || resource.id(),
                    recordId: record.params.id,
                    actionName: "show",
                  }),
                  notice: {
                    message: "اطلاعات با موفقیت ویرایش شد",
                    type: "success",
                  },
                };
              } catch (error) {
                if (error instanceof ValidationError) {
                  return {
                    record: resource
                      .build({
                        ...record.params,
                        ...request.payload,
                      })
                      .toJSON(currentAdmin),
                    notice: {
                      message: "خطای اعتبارسنجی",
                      type: "error",
                    },
                  };
                }

                throw error;
              }
            },
          },

          show: {
            after: async (response) => {
              if (!response.record) return response;

              const rawData = response.record.params.data;

              Object.assign(
                response.record.params,
                mapCompanyAdminDataToVirtualFields(
                  rawData,
                  response.record.params,
                ),
              );

              await enrichCompanyAdminDataRecordWithCompany(response.record);

              return response;
            },
          },

          list: {
            after: async (response) => {
              if (!response.records?.length) return response;

              for (const record of response.records) {
                const rawData = record.params.data;
                Object.assign(
                  record.params,
                  mapCompanyAdminDataToVirtualFields(rawData, record.params),
                );

                await enrichCompanyAdminDataRecordWithCompany(record);
              }

              return response;
            },
          },
        },
      });
    })(),
    prismaResource("ProfileViewAccess", {
      navigation: false,
      properties: {
        userId: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },
        companyId: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },
        section: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },
      },
      listProperties: ["id", "userId", "companyId", "section"],
      editProperties: ["userId", "companyId", "section"],
    }),
    prismaResource("ProjectAccess", {
      navigation: false,
      properties: {
        projectId: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },
        userId: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },
      },
      listProperties: ["id", "projectId", "userId", "createdAt"],
      editProperties: ["projectId", "userId"],
    }),
    prismaResource("Project", {
      navigation: {
        name: "پروژه‌ها",
        icon: "Folder",
      },
      properties: {
        title: {
          isTitle: true,
        },

        formResponses: {
          type: "mixed",
          isVisible: {
            list: false,
            filter: false,
            show: false,
            edit: false,
          },
        },
        initialAnalysis: { type: "textarea" },
        summaryAnalysis: {
          type: "textarea",
          label: "Summary Analysis",
          isVisible: {
            list: false,
            filter: false,
            show: true,
            edit: true,
          },
        },
        riskAnalysis: {
          type: "textarea",
          isVisible: {
            list: false,
            filter: false,
            show: false,
            edit: false,
          },
        },
        finalAnalysis: { type: "textarea" },

        averageRating: {
          isVisible: { list: true, filter: false, show: true, edit: false },
        },

        ratingCount: {
          isVisible: { list: true, filter: false, show: true, edit: false },
        },

        // hasRating: {
        //   isVisible: { list: true, filter: false, show: true, edit: false },
        // },

        createdAt: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },

        updatedAt: {
          isVisible: { list: false, filter: true, show: true, edit: false },
        },
        companyId: {
          isVisible: false,
        },

        formId: {
          isVisible: false,
        },

        multiAnalysisFormId: {
          isVisible: false,
        },

        promptVersionId: {
          isVisible: false,
        },

        username: {
          type: "string",
          isVirtual: true,
          label: "نام کاربری",
          isVisible: {
            list: true,
            filter: false,
            show: true,
            edit: false,
          },
        },

        companyName: {
          type: "string",
          isVirtual: true,
          label: "نام شرکت",
          isVisible: {
            list: true,
            filter: false,
            show: true,
            edit: false,
          },
        },

        formName: {
          type: "string",
          isVirtual: true,
          label: "فرم",
          isVisible: {
            list: true,
            filter: false,
            show: true,
            edit: false,
          },
        },
        riskPercentage: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: true,
          },
        },

        keyStrategicInsights: {
          type: "textarea",
          isVisible: {
            list: false,
            filter: false,
            show: true,
            edit: true,
          },
        },
        creator: {
          reference: "User",
          isVisible: {
            list: false,
            filter: true,
            show: false,
            edit: false,
          },
        },
        creatorId: {
          reference: "User",
          label: "Creator",
          isVisible: {
            list: false,
            filter: false,
            show: false,
            edit: true,
          },
        },
      },

      filterProperties: ["title", "creator", "mode", "status", "createdAt"],
      showProperties: [
        "id",
        "title",
        "username",
        "companyName",
        "formName",
        "mode",
        "status",
        "createdAt",
        "updatedAt",

        "initialAnalysis",
        "summaryAnalysis",
        "finalAnalysis",

        "riskPercentage",
        "keyStrategicInsights",

        "averageRating",
        "ratingCount",
      ],

      editProperties: [
        "title",
        "mode",
        "status",
        "creatorId",
        "initialAnalysis",
        "summaryAnalysis",
        "finalAnalysis",
        "riskPercentage",
        "keyStrategicInsights",
      ],

      listProperties: [
        "id",
        "title",
        "username",
        "companyName",
        "formName",
        "mode",
        "status",
        "averageRating",
        "ratingCount",
        // "hasRating",
        "createdAt",
      ],

      actions: {
        new: {
          layout: [
            "title",
            "mode",
            "status",
            "creatorId",
            "initialAnalysis",
            "summaryAnalysis",
            "finalAnalysis",
            "riskPercentage",
            "keyStrategicInsights",
          ],
        },
        edit: {
          after: async (response, request) => {
            if (request.method?.toLowerCase() !== "get" || !response?.record) {
              return response;
            }

            const recordJson = response.record;
            const creatorId = normalizeAdminReferenceId(
              recordJson.params?.creatorId ?? recordJson.params?.creator,
            );

            if (!creatorId) {
              return response;
            }

            const user = await prisma.user.findUnique({
              where: { id: creatorId },
              select: { id: true, username: true },
            });

            const title = user?.username ?? creatorId;

            recordJson.params.creatorId = creatorId;
            recordJson.populated = recordJson.populated ?? {};
            recordJson.populated.creatorId = {
              params: { id: creatorId, username: title },
              title,
            };

            return response;
          },
        },
        list: {
          after: async (response) => {
            if (!response.records?.length) return response;

            const creatorIds = [
              ...new Set(
                response.records.map((r) => r.params.creator).filter(Boolean),
              ),
            ];

            const companyIds = [
              ...new Set(
                response.records.map((r) => r.params.company).filter(Boolean),
              ),
            ];

            const formIds = [
              ...new Set(
                response.records.map((r) => r.params.form).filter(Boolean),
              ),
            ];

            const [creators, companies, forms] = await Promise.all([
              prisma.user.findMany({
                where: { id: { in: creatorIds } },
                select: { id: true, username: true },
              }),

              prisma.company.findMany({
                where: { id: { in: companyIds } },
                select: { id: true, name: true },
              }),

              prisma.analysisForm.findMany({
                where: { id: { in: formIds } },
                select: { id: true, title: true },
              }),
            ]);

            const creatorMap = Object.fromEntries(
              creators.map((u) => [u.id, u.username]),
            );

            const companyMap = Object.fromEntries(
              companies.map((c) => [c.id, c.name]),
            );

            const formMap = Object.fromEntries(
              forms.map((f) => [f.id, f.title]),
            );

            response.records.forEach((record) => {
              record.params.username = creatorMap[record.params.creator] || "—";

              record.params.companyName =
                companyMap[record.params.company] || "—";

              record.params.formName = formMap[record.params.form] || "—";
            });

            return response;
          },
        },

        show: {
          after: async (response) => {
            if (!response.record) return response;

            const record = response.record;

            const [creator, company, form] = await Promise.all([
              record.params.creator
                ? prisma.user.findUnique({
                    where: { id: record.params.creator },
                    select: { username: true },
                  })
                : null,

              record.params.company
                ? prisma.company.findUnique({
                    where: { id: record.params.company },
                    select: { name: true },
                  })
                : null,

              record.params.form
                ? prisma.analysisForm.findUnique({
                    where: { id: record.params.form },
                    select: { title: true },
                  })
                : null,
            ]);

            record.params.username = creator?.username || "—";
            record.params.companyName = company?.name || "—";
            record.params.formName = form?.title || "—";

            return response;
          },
        },
      },
    }),
    prismaResource("ProjectRatingHistory", {
      navigation: {
        name: "پروژه‌ها",
        icon: "Star",
      },

      properties: {
        id: {
          isVisible: false,
        },

        projectId: {
          label: "پروژه",
          reference: "Project",
          isRequired: true,
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: true,
          },
        },

        project: {
          reference: "Project",
          label: "پروژه",
        },

        rater: {
          reference: "User",
          label: "امتیازدهنده",
        },

        score: {
          label: "امتیاز",
          isRequired: true,
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: true,
          },
        },

        createdAt: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: false,
          },
        },
      },

      listProperties: ["project", "rater", "score", "createdAt"],
      showProperties: ["project", "rater", "score", "createdAt"],
      editProperties: ["projectId", "score"],

      filterProperties: ["project", "rater", "score", "createdAt"],
      actions: {
        new: {
          handler: async (request, response, context) => {
            const { resource, h, currentAdmin } = context;

            if (request.method === "get") {
              return {
                resource: resource.decorate().toJSON(currentAdmin),
                record: null,
              };
            }

            const payload = request.payload ?? {};
            const { projectId, score } = payload;
            const numericScore = Number.parseInt(score, 10);

            const errors = {};
            if (!projectId) {
              errors.projectId = { message: "انتخاب پروژه الزامی است." };
            }
            if (
              !Number.isInteger(numericScore) ||
              numericScore < 1 ||
              numericScore > 5
            ) {
              errors.score = { message: "امتیاز باید عددی بین ۱ تا ۵ باشد." };
            }

            if (Object.keys(errors).length > 0) {
              throw new ValidationError(errors);
            }

            try {
              const createdHistory = await prisma.$transaction(async (tx) => {
                const history = await tx.projectRatingHistory.upsert({
                  where: {
                    projectId_raterId: {
                      projectId: String(projectId),
                      raterId: currentAdmin.id,
                    },
                  },
                  update: {
                    score: numericScore,
                  },
                  create: {
                    projectId: String(projectId),
                    raterId: currentAdmin.id,
                    score: numericScore,
                  },
                });

                const stats = await tx.projectRatingHistory.aggregate({
                  where: { projectId: String(projectId) },
                  _avg: { score: true },
                  _count: { score: true },
                });

                await tx.project.update({
                  where: { id: String(projectId) },
                  data: {
                    averageRating: stats._avg.score || 0,
                    ratingCount: stats._count.score || 0,
                    hasRating: (stats._count.score || 0) > 0,
                  },
                });

                return history;
              });

              return {
                record: buildRecordJson(resource, createdHistory, currentAdmin),
                notice: {
                  message: "امتیاز با موفقیت ثبت و آمار پروژه بروزرسانی شد.",
                  type: "success",
                },
                redirectUrl: h.resourceActionUrl({
                  resourceId: resource.id(),
                  actionName: "list",
                }),
              };
            } catch (error) {
              console.error("RATING_CREATE_ERROR:", error);
              throw new ValidationError({
                projectId: { message: "خطا در ثبت اطلاعات در دیتابیس." },
              });
            }
          },
        },

        edit: {
          handler: async (request, response, context) => {
            const { record, resource, h, currentAdmin } = context;

            if (!record) throwRecordNotFound();

            if (request.method === "get") {
              const recordJson = record.toJSON(currentAdmin);
              await enrichAdminRecordProjectIdReference(recordJson);

              return {
                record: recordJson,
                resource: resource.decorate().toJSON(currentAdmin),
              };
            }

            const payload = request.payload ?? {};
            const numericScore = Number.parseInt(payload.score, 10);

            if (
              !Number.isInteger(numericScore) ||
              numericScore < 1 ||
              numericScore > 5
            ) {
              throw new ValidationError({
                score: { message: "امتیاز باید عددی بین ۱ تا ۵ باشد." },
              });
            }

            try {
              const updated = await prisma.$transaction(async (tx) => {
                const history = await tx.projectRatingHistory.update({
                  where: { id: record.id() },
                  data: {
                    score: numericScore,
                  },
                });

                const pId = record.param("projectId");
                const stats = await tx.projectRatingHistory.aggregate({
                  where: { projectId: pId },
                  _avg: { score: true },
                  _count: { score: true },
                });

                await tx.project.update({
                  where: { id: pId },
                  data: {
                    averageRating: stats._avg.score || 0,
                    ratingCount: stats._count.score || 0,
                    hasRating: (stats._count.score || 0) > 0,
                  },
                });

                return history;
              });

              return {
                record: buildRecordJson(resource, updated, currentAdmin),
                notice: {
                  message: "ویرایش با موفقیت انجام شد.",
                  type: "success",
                },
                redirectUrl: h.resourceActionUrl({
                  resourceId: resource.id(),
                  actionName: "list",
                }),
              };
            } catch (error) {
              console.error("RATING_UPDATE_ERROR:", error);
              throw new ValidationError({
                score: { message: "خطا در بروزرسانی امتیاز." },
              });
            }
          },
        },
      },
    }),
    prismaResource("AnalysisCategory", {
      navigation: analysisFormsNavigation,

      properties: {
        title: {
          isTitle: true,
        },

        image: {
          isVisible: {
            list: false,
            show: true,
            edit: false,
            filter: false,
          },
        },

        createdAt: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: false,
          },
        },

        order: {
          type: "number",
          isVisible: {
            list: true,
            filter: false,
            show: true,
            edit: true,
          },
        },

        updatedAt: {
          isVisible: {
            list: false,
            filter: true,
            show: true,
            edit: false,
          },
        },
      },

      features: [
        uploadFeature({
          componentLoader,
          provider: {
            local: {
              bucket: path.join(__dirname, "..", "public", "images"),
            },
          },

          properties: {
            key: "image",
            file: "uploadFile",
          },

          validation: {
            mimeTypes: [
              "image/png",
              "image/jpeg",
              "image/webp",
              "image/svg+xml",
            ],
            maxSize: 5 * 1024 * 1024, // 5MB
          },

          uploadPath: (record, filename) =>
            `analysis-categories/${Date.now()}-${filename}`,
        }),
      ],

      listProperties: ["id", "title", "order", "createdAt"],

      filterProperties: ["title", "createdAt"],

      showProperties: [
        "id",
        "image",
        "title",
        "description",
        "order",
        "createdAt",
        "updatedAt",
      ],

      editProperties: ["title", "description", "order", "uploadFile"],
    }),
    prismaResource("AnalysisForm", {
      navigation: analysisFormsNavigation,

      properties: {
        title: {
          isTitle: true,
        },
        titleFa: {},
        checklistTitle: {},

        category: {
          reference: "AnalysisCategory",
        },

        order: {
          isVisible: {
            list: true,
            filter: false,
            show: true,
            edit: true,
          },
        },

        temperature: {
          type: "number",
          isVisible: {
            list: true,
            filter: false,
            show: true,
            edit: true,
          },
        },

        directFinalAnalysis: {
          type: "boolean",
          label: "تحلیل مستقیم (بدون فرضیه و review)",
        },

        isShowText: {
          type: "boolean",
          label: "نمایش متن",
        },

        createdAt: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: false,
          },
        },

        updatedAt: {
          isVisible: {
            list: false,
            filter: true,
            show: true,
            edit: false,
          },
        },
      },

      listProperties: [
        "id",
        "title",
        "titleFa",
        "category",
        "isActive",
        "directFinalAnalysis",
        "isShowText",
        "order",
        "temperature",
        "createdAt",
      ],

      filterProperties: [
        "title",
        "category",
        "isActive",
        "directFinalAnalysis",
        "isShowText",
        "createdAt",
      ],

      showProperties: [
        "id",
        "title",
        "titleFa",
        "checklistTitle",
        "category",
        "info",
        "order",
        "isActive",
        "directFinalAnalysis",
        "isShowText",
        "temperature",
        "createdAt",
        "updatedAt",
      ],

      editProperties: [
        "title",
        "titleFa",
        "category",
        "checklistTitle",
        "info",
        "order",
        "isActive",
        "directFinalAnalysis",
        "isShowText",
        "temperature",
      ],
    }),
    prismaResource("FormQuestionCategory", {
      navigation: formQuestionsNavigation,

      properties: {
        id: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },

        title: {
          isTitle: true,
          isRequired: true,
        },

        // روابط اصلی
        // analysisFormId/multiAnalysisFormId/parentId are isReadOnly in DMMF so they are
        // excluded from the prisma adapter's property registry. Use the relation properties
        // (analysisForm, multiAnalysisForm, parent) for filtering; keep the FK fields only
        // for show/edit where custom handlers read them directly from the payload.
        analysisFormId: {
          reference: "AnalysisForm",
          isVisible: { list: false, filter: false, show: true, edit: true },
        },

        multiAnalysisFormId: {
          reference: "MultiAnalysisForm",
          isVisible: { list: false, filter: false, show: true, edit: true },
        },

        analysisForm: {
          reference: "AnalysisForm",
          isVisible: { list: false, filter: true, show: false, edit: false },
        },

        multiAnalysisForm: {
          reference: "MultiAnalysisForm",
          isVisible: { list: false, filter: true, show: false, edit: false },
        },

        parentId: {
          reference: "FormQuestionCategory",
          isVisible: { list: false, filter: false, show: true, edit: true },
        },

        parent: {
          reference: "FormQuestionCategory",
          label: "دسته والد (فیلتر)",
          isVisible: { list: false, filter: true, show: false, edit: false },
        },

        order: {
          type: "number",
          isRequired: true,
        },

        isActive: {
          type: "boolean",
        },

        // فیلدهای مجازی
        formTitle: {
          type: "string",
          isVirtual: true,
          isVisible: { list: true, show: true, edit: false, filter: false },
        },

        parentTitle: {
          type: "string",
          isVirtual: true,
          label: "دسته والد",
          isVisible: { list: true, show: true, edit: false, filter: false },
        },

        children: { isVisible: false },
        questions: { isVisible: false },

        createdAt: {
          isVisible: { list: false, filter: false, show: true, edit: false },
        },

        updatedAt: {
          isVisible: { list: false, filter: false, show: true, edit: false },
        },
      },

      listProperties: [
        "id",
        "formTitle",
        "parentTitle",
        "title",
        "order",
        "isActive",
      ],

      filterProperties: [
        "analysisForm",
        "multiAnalysisForm",
        "parent",
        "title",
        "isActive",
      ],

      showProperties: [
        "id",
        "formTitle",
        "parentTitle",
        "title",
        "order",
        "isActive",
        "createdAt",
        "updatedAt",
      ],

      editProperties: [
        "analysisFormId",
        "multiAnalysisFormId",
        "parentId",
        "title",
        "order",
        "isActive",
      ],

      actions: {
        list: {
          after: async (response) => {
            if (!response.records?.length) return response;

            const analysisFormIds = [
              ...new Set(
                response.records
                  .map((r) => r.params.analysisForm)
                  .filter(Boolean),
              ),
            ];

            const multiFormIds = [
              ...new Set(
                response.records
                  .map((r) => r.params.multiAnalysisForm)
                  .filter(Boolean),
              ),
            ];

            const parentIds = [
              ...new Set(
                response.records.map((r) => r.params.parent).filter(Boolean),
              ),
            ];

            const [forms, multiForms, parents] = await Promise.all([
              prisma.analysisForm.findMany({
                where: {
                  id: {
                    in: analysisFormIds,
                  },
                },
                select: {
                  id: true,
                  title: true,
                },
              }),

              prisma.multiAnalysisForm.findMany({
                where: {
                  id: {
                    in: multiFormIds,
                  },
                },
                select: {
                  id: true,
                  title: true,
                },
              }),

              prisma.formQuestionCategory.findMany({
                where: {
                  id: {
                    in: parentIds,
                  },
                },
                select: {
                  id: true,
                  title: true,
                },
              }),
            ]);

            const formMap = Object.fromEntries(
              forms.map((f) => [f.id, f.title]),
            );

            const multiFormMap = Object.fromEntries(
              multiForms.map((f) => [f.id, f.title]),
            );

            const parentMap = Object.fromEntries(
              parents.map((p) => [p.id, p.title]),
            );

            response.records.forEach((record) => {
              record.params.formTitle =
                formMap[record.params.analysisForm] ??
                multiFormMap[record.params.multiAnalysisForm] ??
                "—";

              record.params.parentTitle =
                parentMap[record.params.parent] ?? "ریشه";
            });

            return response;
          },
        },

        show: {
          after: async (response) => {
            if (!response.record) return response;

            const analysisFormId = response.record.params.analysisForm;
            const multiAnalysisFormId =
              response.record.params.multiAnalysisForm;
            const parentId = response.record.params.parent;

            let formTitle = "—";

            if (analysisFormId) {
              const form = await prisma.analysisForm.findUnique({
                where: {
                  id: analysisFormId,
                },
                select: {
                  title: true,
                },
              });

              formTitle = form?.title ?? "—";
            } else if (multiAnalysisFormId) {
              const form = await prisma.multiAnalysisForm.findUnique({
                where: {
                  id: multiAnalysisFormId,
                },
                select: {
                  title: true,
                },
              });

              formTitle = form?.title ?? "—";
            }

            response.record.params.formTitle = formTitle;

            if (parentId) {
              const parent = await prisma.formQuestionCategory.findUnique({
                where: {
                  id: parentId,
                },
                select: {
                  title: true,
                },
              });

              response.record.params.parentTitle = parent?.title ?? "—";
            } else {
              response.record.params.parentTitle = "ریشه";
            }

            return response;
          },
        },
        new: {
          handler: async (request, response, context) => {
            const { resource, h, currentAdmin } = context;

            if (request.method === "get") {
              return {
                resource: resource.decorate().toJSON(currentAdmin),
              };
            }

            const payload = request.payload ?? {};

            const analysisFormId = String(payload.analysisFormId || "").trim();
            const multiAnalysisFormId = String(
              payload.multiAnalysisFormId || "",
            ).trim();
            const parentId = String(payload.parentId || "").trim();

            const title = String(payload.title || "").trim();
            const order = parseIntegerValue(payload.order);
            const isActive = parseBooleanValue(payload.isActive);

            const errors = {};

            if (!analysisFormId && !multiAnalysisFormId) {
              errors.analysisFormId = {
                message: "حداقل یکی از فرم‌ها الزامی است.",
              };
            }

            if (analysisFormId && multiAnalysisFormId) {
              errors.analysisFormId = {
                message: "فقط یکی از فرم‌ها را انتخاب کنید.",
              };
            }

            if (!title) {
              errors.title = {
                message: "عنوان الزامی است.",
              };
            }

            if (order === null) {
              errors.order = {
                message: "ترتیب نامعتبر است.",
              };
            }

            if (Object.keys(errors).length) {
              throw new ValidationError(errors);
            }

            const created = await prisma.formQuestionCategory.create({
              data: {
                title,
                order,
                isActive,

                analysisFormId: analysisFormId || null,
                multiAnalysisFormId: multiAnalysisFormId || null,
                parentId: parentId || null,
              },
            });

            return {
              record: buildRecordJson(resource, created, currentAdmin),
              notice: {
                message: "دسته‌بندی با موفقیت ایجاد شد.",
                type: "success",
              },
              redirectUrl: h.recordActionUrl({
                resourceId: resource.id(),
                recordId: created.id,
                actionName: "show",
              }),
            };
          },
        },

        edit: {
          handler: async (request, response, context) => {
            const { record, resource, h, currentAdmin } = context;

            if (request.method === "get") {
              const recordJson = record?.toJSON(currentAdmin);
              await enrichAdminRecordFormQuestionCategoryEditReferences(
                recordJson,
              );
              return {
                record: recordJson,
                resource: resource.decorate().toJSON(currentAdmin),
              };
            }

            const payload = request.payload ?? {};

            const analysisFormId = String(payload.analysisFormId || "").trim();
            const multiAnalysisFormId = String(
              payload.multiAnalysisFormId || "",
            ).trim();
            const parentId = String(payload.parentId || "").trim();
            const title = String(payload.title || "").trim();
            const order = parseIntegerValue(payload.order);
            const isActive = parseBooleanValue(payload.isActive);

            const errors = {};

            if (!analysisFormId && !multiAnalysisFormId) {
              errors.analysisFormId = {
                message: "حداقل یکی از فرم‌ها الزامی است.",
              };
            }

            if (analysisFormId && multiAnalysisFormId) {
              errors.analysisFormId = {
                message: "نمی‌توانید همزمان هر دو نوع فرم را انتخاب کنید.",
              };
            }

            if (!title) {
              errors.title = { message: "عنوان دسته‌بندی الزامی است." };
            }

            if (order === null) {
              errors.order = { message: "ترتیب باید عدد صحیح باشد." };
            }

            if (Object.keys(errors).length) {
              throw new ValidationError(errors);
            }

            // اعتبارسنجی parent
            if (parentId) {
              if (parentId === record.params.id) {
                throw new ValidationError({
                  parentId: { message: "دسته‌بندی نمی‌تواند والد خودش باشد." },
                });
              }

              const parent = await prisma.formQuestionCategory.findUnique({
                where: { id: parentId },
                select: {
                  analysisFormId: true,
                  multiAnalysisFormId: true,
                },
              });

              if (!parent) {
                throw new ValidationError({
                  parentId: { message: "دسته‌بندی والد معتبر نیست." },
                });
              }

              // بررسی هم‌خوانی فرم والد با فرزند
              const isSameForm =
                (analysisFormId && parent.analysisFormId === analysisFormId) ||
                (multiAnalysisFormId &&
                  parent.multiAnalysisFormId === multiAnalysisFormId);

              if (!isSameForm) {
                throw new ValidationError({
                  parentId: {
                    message: "دسته‌بندی والد باید متعلق به همان فرم باشد.",
                  },
                });
              }
            }

            try {
              const updated = await prisma.formQuestionCategory.update({
                where: {
                  id: record.params.id,
                },
                data: {
                  title,
                  order,
                  isActive,

                  // فقط یکی از این دو مقدار داشته باشد
                  analysisFormId: analysisFormId || null,
                  multiAnalysisFormId: multiAnalysisFormId || null,

                  parentId: parentId || null,
                },
              });

              const recordJson = buildRecordJson(
                resource,
                updated,
                currentAdmin,
              );
              await enrichAdminRecordFormQuestionCategoryEditReferences(
                recordJson,
              );

              return {
                record: recordJson,
                notice: {
                  message: "دسته‌بندی با موفقیت ویرایش شد.",
                  type: "success",
                },
                redirectUrl: h.recordActionUrl({
                  resourceId: resource.id(),
                  recordId: record.params.id,
                  actionName: "show",
                }),
              };
            } catch (error) {
              console.error(error);

              throw new ValidationError({
                _form: {
                  message: error.message,
                },
              });
            }
          },
        },
      },
    }),
    prismaResource("FormQuestion", {
      navigation: formQuestionsNavigation,

      properties: {
        id: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },

        categoryId: {
          reference: "FormQuestionCategory",
          isRequired: true,
        },

        category: {
          reference: "FormQuestionCategory",
          isVisible: { list: false, filter: true, show: false, edit: false },
        },

        label: {
          isTitle: true,
          isRequired: true,
        },

        type: {
          availableValues: questionTypeValues,
          isRequired: true,
        },

        required: {
          type: "boolean",
          isVisible: {
            list: true,
            show: true,
            edit: false,
            filter: false,
            new: false,
          },
        },

        isScored: {
          type: "boolean",
          isVisible: { list: true, show: true, edit: true, filter: true },
        },

        weight: {
          type: "number",
        },

        order: {
          type: "number",
          isRequired: true,
        },

        // فیلدهای مجازی
        formTitle: {
          type: "string",
          isVirtual: true,
          label: "analysis title",
          availableValues: formQuestionAnalysisTitleFilterOptions,
          props: { isSearchable: true },
          isVisible: { list: true, show: true, edit: false, filter: true },
        },

        categoryTitle: {
          type: "string",
          isVirtual: true,
          label: "دسته‌بندی",
          isVisible: { list: true, show: true, edit: false, filter: false },
        },

        options: { isVisible: false },

        optionsJson: {
          type: "string",
          isVirtual: true,
          label: "گزینه‌های سوال",
          isVisible: {
            list: false,
            show: false,
            edit: true,
            filter: false,
            new: true,
          },
          components: {
            edit: Components.FormQuestionOptionsEditor,
            new: Components.FormQuestionOptionsEditor,
          },
        },

        createdAt: { isVisible: false },
        updatedAt: { isVisible: false },
      },

      listProperties: [
        "id",
        "formTitle",
        "categoryTitle",
        "label",
        "type",
        "isScored",
        "weight",
        "required",
        "order",
      ],

      filterProperties: [
        "formTitle",
        "category",
        "label",
        "type",
        "isScored",
      ],

      showProperties: [
        "id",
        "formTitle",
        "categoryTitle",
        "label",
        "type",
        "isScored",
        "weight",
        "required",
        "order",
        "createdAt",
        "updatedAt",
      ],

      editProperties: [
        "categoryId",
        "label",
        "type",
        "isScored",
        "weight",
        "order",
        "optionsJson",
      ],

      newProperties: [
        "categoryId",
        "label",
        "type",
        "isScored",
        "weight",
        "order",
        "optionsJson",
      ],

      actions: {
        list: {
          before: applyFormQuestionFormTitleFilter,
          handler: async (request, response, context) => {
            const categoryIds = request._formQuestionCategoryIds;
            if (!categoryIds?.length) {
              return ListAction.handler(request, response, context);
            }

            const { query } = request;
            const {
              sortBy,
              direction,
              filters = {},
              page,
              perPage: perPageRaw,
            } = flat.unflatten(query || {});
            const { resource, _admin, currentAdmin } = context;

            const perPage = perPageRaw
              ? Math.min(+perPageRaw, 500)
              : (_admin.options.settings?.defaultPerPage ?? 10);
            const pageNum = Number(page) || 1;

            const listProperties = resource.decorate().getListProperties();
            const firstProperty = listProperties.find((p) => p.isSortable());
            let sort;
            if (firstProperty) {
              const sortSetter = await getAdminJsSortSetter();
              sort = sortSetter(
                { sortBy, direction },
                firstProperty.name(),
                resource.decorate().options,
              );
            }

            const filter = await new Filter(filters, resource).populate(
              context,
            );
            const where = {
              ...convertFilter(getModelByName("FormQuestion").fields, filter),
              categoryId: { in: categoryIds },
            };

            const orderBy = resource.buildSortBy(sort);
            const [results, total] = await Promise.all([
              prisma.formQuestion.findMany({
                where,
                skip: (pageNum - 1) * perPage,
                take: perPage,
                orderBy,
              }),
              prisma.formQuestion.count({ where }),
            ]);

            const populator = await getAdminJsPopulator();
            const records = results.map((result) =>
              resource.build(resource.prepareReturnValues(result)),
            );
            const populatedRecords = await populator(records, context);
            context.records = populatedRecords;

            return {
              meta: {
                total,
                perPage,
                page: pageNum,
                direction: sort?.direction,
                sortBy: sort?.sortBy,
              },
              records: populatedRecords.map((r) => r.toJSON(currentAdmin)),
            };
          },
          after: async (response) => {
            if (!response.records?.length) return response;

            const categoryIds = [
              ...new Set(
                response.records
                  .map((r) => r.params.category) // نه categoryId
                  .filter(Boolean),
              ),
            ];

            const categories = await prisma.formQuestionCategory.findMany({
              where: {
                id: {
                  in: categoryIds,
                },
              },
              select: {
                id: true,
                title: true,
                analysisForm: { select: { title: true } },
                multiAnalysisForm: { select: { title: true } },
              },
            });

            const categoryMap = Object.fromEntries(
              categories.map((c) => [c.id, c]),
            );

            response.records.forEach((record) => {
              const category = categoryMap[record.params.category];

              record.params.categoryTitle = category?.title ?? "—";

              record.params.formTitle =
                category?.analysisForm?.title ??
                category?.multiAnalysisForm?.title ??
                "—";
            });

            return response;
          },
        },

        show: {
          after: async (response) => {
            if (!response.record) return response;

            const categoryId = response.record.params.category;
            if (!categoryId) return response;

            const category = await prisma.formQuestionCategory.findUnique({
              where: { id: categoryId },
              select: {
                title: true,
                analysisForm: { select: { title: true } },
                multiAnalysisForm: { select: { title: true } },
              },
            });

            if (!category) return response;

            response.record.params.categoryTitle = category.title ?? "—";

            response.record.params.formTitle =
              category.analysisForm?.title ??
              category.multiAnalysisForm?.title ??
              "—";

            return response;
          },
        },

        new: {
          layout: [
            "categoryId",
            "label",
            "type",
            "isScored",
            "weight",
            "order",
            "optionsJson",
          ],
          handler: async (request, response, context) => {
            const { resource, h, currentAdmin } = context;

            if (request.method === "get") {
              const recordJson = resource
                .build({ optionsJson: "[]" })
                .toJSON(currentAdmin);
              return {
                resource: resource.decorate().toJSON(currentAdmin),
                record: recordJson,
              };
            }

            const payload = request.payload ?? {};

            const categoryId = String(payload.categoryId || "").trim();
            const label = String(payload.label || "").trim();
            const type = String(payload.type || "").trim();
            const isScored = parseBooleanValue(payload.isScored);
            const order = parseIntegerValue(payload.order);

            const weight =
              payload.weight == null || payload.weight === ""
                ? null
                : parseIntegerValue(payload.weight);

            const errors = {};

            if (!categoryId) {
              errors.categoryId = { message: "دسته‌بندی الزامی است." };
            }

            if (!label) {
              errors.label = { message: "عنوان سوال الزامی است." };
            }

            if (!type) {
              errors.type = { message: "نوع سوال الزامی است." };
            }

            if (order === null) {
              errors.order = { message: "ترتیب باید عدد صحیح باشد." };
            }

            if (weight !== null && (weight < 0 || weight > 100)) {
              errors.weight = {
                message: "وزن باید بین 0 تا 100 باشد.",
              };
            }

            if (Object.keys(errors).length) {
              throw new ValidationError(errors);
            }

            const category = await prisma.formQuestionCategory.findUnique({
              where: {
                id: categoryId,
              },
              select: {
                id: true,
              },
            });

            if (!category) {
              throw new ValidationError({
                categoryId: {
                  message: "دسته‌بندی معتبر نیست.",
                },
              });
            }

            if (weight !== null) {
              const aggregate = await prisma.formQuestion.aggregate({
                where: {
                  categoryId,
                  weight: {
                    not: null,
                  },
                },
                _sum: {
                  weight: true,
                },
              });

              const currentSum = aggregate._sum.weight || 0;

              if (currentSum + weight > 100) {
                throw new ValidationError({
                  weight: {
                    message: `جمع وزن سوالات این دسته‌بندی نمی‌تواند بیشتر از 100 باشد (مجموع فعلی: ${currentSum})`,
                  },
                });
              }
            }

            const parsedOptions = parseFormQuestionOptionsJson(
              payload.optionsJson,
            );
            const normalizedOptions = validateFormQuestionOptionsForSave({
              type,
              isScored,
              weight,
              options: parsedOptions,
            });

            const created = await prisma.$transaction(async (tx) => {
              const question = await tx.formQuestion.create({
                data: {
                  categoryId,
                  label,
                  type,
                  isScored,
                  weight,
                  order,
                },
              });

              await persistFormQuestionOptions(
                question.id,
                normalizedOptions,
                tx,
              );

              return question;
            });

            const recordJson = buildRecordJson(resource, created, currentAdmin);
            await enrichFormQuestionRecordWithOptionsJson(recordJson);

            return {
              record: recordJson,
              notice: {
                message: "سوال و گزینه‌ها با موفقیت ایجاد شد.",
                type: "success",
              },
              redirectUrl: h.recordActionUrl({
                resourceId: resource.id(),
                recordId: created.id,
                actionName: "show",
              }),
            };
          },
        },

        edit: {
          layout: [
            "categoryId",
            "label",
            "type",
            "isScored",
            "weight",
            "order",
            "optionsJson",
          ],
          handler: async (request, response, context) => {
            const { record, resource, h, currentAdmin } = context;

            if (request.method === "get") {
              const recordJson = record?.toJSON(currentAdmin);
              await enrichAdminRecordFormQuestionCategoryIdReference(
                recordJson,
              );
              await enrichFormQuestionRecordWithOptionsJson(recordJson);
              return {
                record: recordJson,
                resource: resource.decorate().toJSON(currentAdmin),
              };
            }

            const payload = request.payload ?? {};

            const categoryId = String(payload.categoryId || "");
            const label = String(payload.label || "").trim();
            const type = String(payload.type || "");
            const isScored = parseBooleanValue(payload.isScored);
            const order = parseIntegerValue(payload.order);
            const weight =
              payload.weight == null || payload.weight === ""
                ? null
                : parseIntegerValue(payload.weight);

            const errors = {};

            if (!categoryId)
              errors.categoryId = { message: "دسته‌بندی الزامی است." };
            if (!label) errors.label = { message: "عنوان سوال الزامی است." };
            if (!type) errors.type = { message: "نوع سوال الزامی است." };
            if (order === null)
              errors.order = { message: "ترتیب باید عدد صحیح باشد." };

            if (weight !== null && (weight < 0 || weight > 100)) {
              errors.weight = { message: "وزن باید بین 0 تا 100 باشد." };
            }

            if (Object.keys(errors).length) throw new ValidationError(errors);

            const category = await prisma.formQuestionCategory.findUnique({
              where: { id: categoryId },
              select: { id: true },
            });

            if (!category) {
              throw new ValidationError({
                categoryId: { message: "دسته‌بندی معتبر نیست." },
              });
            }

            if (weight !== null) {
              const aggregate = await prisma.formQuestion.aggregate({
                where: {
                  categoryId,
                  weight: { not: null },
                  NOT: { id: record.params.id },
                },
                _sum: { weight: true },
              });

              const total = (aggregate._sum.weight || 0) + weight;
              if (total > 100) {
                throw new ValidationError({
                  weight: {
                    message: `جمع وزن نمی‌تواند بیشتر از 100 باشد (مجموع جدید: ${total})`,
                  },
                });
              }
            }

            const parsedOptions = parseFormQuestionOptionsJson(
              payload.optionsJson,
            );
            const normalizedOptions = validateFormQuestionOptionsForSave({
              type,
              isScored,
              weight,
              options: parsedOptions,
            });

            const questionId = record.params.id;

            const updated = await prisma.$transaction(async (tx) => {
              const question = await tx.formQuestion.update({
                where: { id: questionId },
                data: {
                  label,
                  type,
                  isScored,
                  weight,
                  order,
                  category: { connect: { id: categoryId } },
                },
              });

              await persistFormQuestionOptions(
                question.id,
                normalizedOptions,
                tx,
              );

              return question;
            });

            const recordJson = buildRecordJson(resource, updated, currentAdmin);
            await enrichAdminRecordFormQuestionCategoryIdReference(recordJson);
            await enrichFormQuestionRecordWithOptionsJson(recordJson);

            return {
              record: recordJson,
              notice: {
                message: "سوال و گزینه‌ها با موفقیت ویرایش شد.",
                type: "success",
              },
              redirectUrl: h.recordActionUrl({
                resourceId: resource.id(),
                recordId: record.params.id,
                actionName: "show",
              }),
            };
          },
        },
      },
    }),
    prismaResource("FormQuestionOption", {
      navigation: { ...formQuestionsNavigation, show: false },

      properties: {
        id: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },

        questionId: {
          reference: "FormQuestion",
          isRequired: true,
          isVisible: {
            list: false,
            filter: false,
            show: true,
            edit: true,
          },
        },

        question: {
          reference: "FormQuestion",
          label: "سوال",
          isVisible: { list: false, filter: true, show: false, edit: false },
        },

        label: {
          isTitle: true,
          isRequired: true,
        },

        value: {
          isRequired: true,
        },

        score: {
          availableValues: [
            { value: 1, label: "1" },
            { value: 2, label: "2" },
            { value: 3, label: "3" },
            { value: 4, label: "4" },
            { value: 5, label: "5" },
          ],
          isRequired: false,
        },

        order: {
          type: "number",
          isRequired: true,
        },

        questionTitle: {
          type: "string",
          isVirtual: true,
          label: "سوال",
          isVisible: { list: true, show: true, edit: false, filter: false },
        },

        createdAt: { isVisible: false },
        updatedAt: { isVisible: false },
      },

      listProperties: [
        "id",
        "questionTitle",
        "label",
        "value",
        "score",
        "order",
      ],

      filterProperties: ["question", "label", "score"],

      showProperties: [
        "id",
        "questionTitle",
        "label",
        "value",
        "score",
        "order",
        "createdAt",
        "updatedAt",
      ],

      editProperties: ["questionId", "label", "value", "score", "order"],

      actions: {
        list: {
          before: applyFormQuestionOptionQuestionFilter,
          handler: async (request, response, context) => {
            const questionIds = request._formQuestionOptionQuestionIds;
            if (!questionIds?.length) {
              return ListAction.handler(request, response, context);
            }

            const { query } = request;
            const {
              sortBy,
              direction,
              filters = {},
              page,
              perPage: perPageRaw,
            } = flat.unflatten(query || {});
            const { resource, _admin, currentAdmin } = context;

            const perPage = perPageRaw
              ? Math.min(+perPageRaw, 500)
              : (_admin.options.settings?.defaultPerPage ?? 10);
            const pageNum = Number(page) || 1;

            const listProperties = resource.decorate().getListProperties();
            const firstProperty = listProperties.find((p) => p.isSortable());
            let sort;
            if (firstProperty) {
              const sortSetter = await getAdminJsSortSetter();
              sort = sortSetter(
                { sortBy, direction },
                firstProperty.name(),
                resource.decorate().options,
              );
            }

            const filter = await new Filter(filters, resource).populate(
              context,
            );
            const where = {
              ...convertFilter(
                getModelByName("FormQuestionOption").fields,
                filter,
              ),
              questionId: { in: questionIds },
            };

            const orderBy = resource.buildSortBy(sort);
            const [results, total] = await Promise.all([
              prisma.formQuestionOption.findMany({
                where,
                skip: (pageNum - 1) * perPage,
                take: perPage,
                orderBy,
              }),
              prisma.formQuestionOption.count({ where }),
            ]);

            const populator = await getAdminJsPopulator();
            const records = results.map((result) =>
              resource.build(resource.prepareReturnValues(result)),
            );
            const populatedRecords = await populator(records, context);
            context.records = populatedRecords;

            return {
              meta: {
                total,
                perPage,
                page: pageNum,
                direction: sort?.direction,
                sortBy: sort?.sortBy,
              },
              records: populatedRecords.map((r) => r.toJSON(currentAdmin)),
            };
          },
          after: async (response) => {
            if (!response.records?.length) return response;

            const questionIds = [
              ...new Set(
                response.records.map((r) => r.params.question).filter(Boolean),
              ),
            ];

            const questions = await prisma.formQuestion.findMany({
              where: {
                id: {
                  in: questionIds,
                },
              },
              select: {
                id: true,
                label: true,
              },
            });

            const questionMap = Object.fromEntries(
              questions.map((q) => [q.id, q.label]),
            );

            response.records.forEach((record) => {
              record.params.questionTitle =
                questionMap[record.params.question] ?? "—";
            });

            return response;
          },
        },

        show: {
          after: async (response) => {
            if (!response.record) return response;

            const questionId = response.record.params.question;

            if (!questionId) {
              response.record.params.questionTitle = "—";
              return response;
            }

            const question = await prisma.formQuestion.findUnique({
              where: {
                id: questionId,
              },
              select: {
                label: true,
              },
            });

            response.record.params.questionTitle = question?.label ?? "—";

            return response;
          },
        },

        new: {
          handler: async (request, response, context) => {
            const { resource, h, currentAdmin } = context;

            if (request.method === "get") {
              return {
                resource: resource.decorate().toJSON(currentAdmin),
                record: null,
              };
            }

            const payload = request.payload ?? {};

            const questionId = String(payload.questionId || "").trim();
            const label = String(payload.label || "").trim();
            const value = String(payload.value || "").trim();
            const order = parseIntegerValue(payload.order);
            const score =
              payload.score == null || payload.score === ""
                ? null
                : parseIntegerValue(payload.score);

            const errors = {};

            if (!questionId)
              errors.questionId = { message: "سوال الزامی است." };
            if (!label) errors.label = { message: "عنوان گزینه الزامی است." };
            if (!value) errors.value = { message: "مقدار گزینه الزامی است." };
            if (order === null)
              errors.order = { message: "ترتیب باید عدد صحیح باشد." };

            if (score !== null && ![1, 2, 3, 4, 5].includes(score)) {
              errors.score = { message: "نمره باید بین 1 تا 5 باشد." };
            }

            // اعتبارسنجی منطق وزن و امتیاز
            const question = await prisma.formQuestion.findUnique({
              where: { id: questionId },
              select: { weight: true, label: true },
            });

            if (!question) {
              errors.questionId = { message: "سوال انتخاب شده معتبر نیست." };
            } else {
              if (question.weight !== null && score === null) {
                errors.score = {
                  message:
                    "برای سوالات امتیازی، وارد کردن نمره گزینه الزامی است.",
                };
              }
              if (question.weight === null && score !== null) {
                errors.score = {
                  message: "برای سوالات بدون وزن، نمی‌توانید نمره وارد کنید.",
                };
              }
            }

            if (Object.keys(errors).length) throw new ValidationError(errors);

            const created = await prisma.formQuestionOption.create({
              data: {
                label,
                value,
                score,
                order,
                question: { connect: { id: questionId } },
              },
            });

            return {
              record: buildRecordJson(resource, created, currentAdmin),
              notice: { message: "گزینه با موفقیت ایجاد شد.", type: "success" },
              redirectUrl: h.recordActionUrl({
                resourceId: resource.id(),
                recordId: created.id,
                actionName: "show",
              }),
            };
          },
        },

        edit: {
          handler: async (request, response, context) => {
            const { record, resource, h, currentAdmin } = context;

            if (request.method === "get") {
              const recordJson = record?.toJSON(currentAdmin);
              await enrichAdminRecordFormQuestionOptionQuestionIdReference(
                recordJson,
              );
              return {
                record: recordJson,
                resource: resource.decorate().toJSON(currentAdmin),
              };
            }

            const payload = request.payload ?? {};

            const questionId = String(payload.questionId || "").trim();
            const label = String(payload.label || "").trim();
            const value = String(payload.value || "").trim();
            const order = parseIntegerValue(payload.order);
            const score =
              payload.score == null || payload.score === ""
                ? null
                : parseIntegerValue(payload.score);

            const errors = {};

            if (!questionId)
              errors.questionId = { message: "سوال الزامی است." };
            if (!label) errors.label = { message: "عنوان گزینه الزامی است." };
            if (!value) errors.value = { message: "مقدار گزینه الزامی است." };
            if (order === null)
              errors.order = { message: "ترتیب باید عدد صحیح باشد." };

            if (score !== null && ![1, 2, 3, 4, 5].includes(score)) {
              errors.score = { message: "نمره باید بین 1 تا 5 باشد." };
            }

            const question = await prisma.formQuestion.findUnique({
              where: { id: questionId },
              select: { weight: true },
            });

            if (!question) {
              errors.questionId = { message: "سوال انتخاب شده معتبر نیست." };
            } else {
              if (question.weight !== null && score === null) {
                errors.score = {
                  message:
                    "برای سوالات امتیازی، وارد کردن نمره گزینه الزامی است.",
                };
              }
              if (question.weight === null && score !== null) {
                errors.score = {
                  message: "برای سوالات بدون وزن، نمی‌توانید نمره وارد کنید.",
                };
              }
            }

            if (Object.keys(errors).length) throw new ValidationError(errors);

            const updated = await prisma.formQuestionOption.update({
              where: { id: record.params.id },
              data: {
                label,
                value,
                score,
                order,
                question: { connect: { id: questionId } },
              },
            });

            const recordJson = buildRecordJson(resource, updated, currentAdmin);
            await enrichAdminRecordFormQuestionOptionQuestionIdReference(
              recordJson,
            );

            return {
              record: recordJson,
              notice: {
                message: "گزینه با موفقیت ویرایش شد.",
                type: "success",
              },
              redirectUrl: h.recordActionUrl({
                resourceId: resource.id(),
                recordId: record.params.id,
                actionName: "show",
              }),
            };
          },
        },
      },
    }),
    prismaResource("FeaturedAnalysis", {
      navigation: analysisFormsNavigation,

      properties: {
        analysisFormId: {
          reference: "AnalysisForm",
          label: "فرم تحلیل تکی",
        },
        analysisForm: {
          reference: "AnalysisForm",
          label: "فرم تحلیل تکی",
        },
        multiAnalysisFormId: {
          reference: "MultiAnalysisForm",
          label: "فرم تحلیل چندگانه",
        },
        multiAnalysisForm: {
          reference: "MultiAnalysisForm",
          label: "فرم تحلیل چندگانه",
        },
        formTitle: {
          type: "string",
          label: "عنوان فرم",
          isVisible: {
            list: true,
            filter: false,
            show: true,
            edit: false,
          },
        },
      },

      editProperties: ["analysisFormId", "multiAnalysisFormId"],
      listProperties: ["formTitle", "createdAt"],

      showProperties: ["id", "analysisForm", "multiAnalysisForm", "createdAt"],
      actions: {
        list: {
          after: async (response) => {
            if (!response.records?.length) return response;

            const analysisFormIds = [
              ...new Set(
                response.records
                  .map((record) => record.params.analysisForm)
                  .filter(Boolean),
              ),
            ];

            const multiFormIds = [
              ...new Set(
                response.records
                  .map((record) => record.params.multiAnalysisForm)
                  .filter(Boolean),
              ),
            ];

            const [forms, multiForms] = await Promise.all([
              prisma.analysisForm.findMany({
                where: { id: { in: analysisFormIds } },
                select: { id: true, title: true },
              }),
              prisma.multiAnalysisForm.findMany({
                where: { id: { in: multiFormIds } },
                select: { id: true, title: true },
              }),
            ]);

            const formMap = Object.fromEntries(
              forms.map((form) => [form.id, form.title]),
            );
            const multiFormMap = Object.fromEntries(
              multiForms.map((form) => [form.id, form.title]),
            );

            response.records.forEach((record) => {
              record.params.formTitle =
                formMap[record.params.analysisForm] ??
                multiFormMap[record.params.multiAnalysisForm] ??
                "—";
            });

            return response;
          },
        },

        show: {
          after: async (response) => {
            if (!response.record) return response;

            const analysisFormId = response.record.params.analysisForm;
            const multiAnalysisFormId =
              response.record.params.multiAnalysisForm;

            if (analysisFormId) {
              const form = await prisma.analysisForm.findUnique({
                where: { id: analysisFormId },
                select: { title: true },
              });
              response.record.params.formTitle = form?.title ?? "—";
            } else if (multiAnalysisFormId) {
              const form = await prisma.multiAnalysisForm.findUnique({
                where: { id: multiAnalysisFormId },
                select: { title: true },
              });
              response.record.params.formTitle = form?.title ?? "—";
            } else {
              response.record.params.formTitle = "—";
            }

            return response;
          },
        },

        new: {
          handler: async (request, response, context) => {
            const { resource, h, currentAdmin } = context;

            if (request.method === "get") {
              return {
                resource: resource.decorate().toJSON(currentAdmin),
                record: { params: {}, errors: {}, populated: {} },
              };
            }

            const analysisFormId = String(
              request.payload?.analysisFormId || "",
            ).trim();
            const multiAnalysisFormId = String(
              request.payload?.multiAnalysisFormId || "",
            ).trim();
            const errors = {};

            if (!analysisFormId && !multiAnalysisFormId) {
              errors.analysisFormId = {
                message: "حداقل یکی از فرم‌ها الزامی است.",
              };
            }

            if (analysisFormId && multiAnalysisFormId) {
              errors.analysisFormId = {
                message: "فقط یکی از فرم‌ها را انتخاب کنید.",
              };
            }

            if (Object.keys(errors).length) {
              return {
                record: {
                  params: request.payload,
                  errors,
                  populated: {},
                },
              };
            }

            try {
              const record = await prisma.featuredAnalysis.create({
                data: {
                  analysisFormId: analysisFormId || null,
                  multiAnalysisFormId: multiAnalysisFormId || null,
                },
              });

              return {
                redirectUrl: h.resourceUrl({
                  resourceId: resource._decorated?.id() || resource.id(),
                }),
                notice: {
                  message: "رکورد با موفقیت ایجاد شد",
                  type: "success",
                },
                record: buildRecordJson(resource, record, currentAdmin),
              };
            } catch (error) {
              return {
                record: {
                  params: request.payload,
                  errors: {
                    analysisFormId: { message: error.message },
                  },
                  populated: {},
                },
              };
            }
          },
        },

        edit: {
          handler: async (request, response, context) => {
            const { resource, record, h, currentAdmin } = context;

            if (request.method === "get") {
              const recordJson = record?.toJSON(currentAdmin);
              await enrichAdminRecordAnalysisFormIdReference(recordJson);
              await enrichAdminRecordMultiAnalysisFormIdReference(recordJson);
              return {
                record: recordJson,
                resource: resource.decorate().toJSON(currentAdmin),
              };
            }

            const analysisFormId = String(
              request.payload?.analysisFormId || "",
            ).trim();
            const multiAnalysisFormId = String(
              request.payload?.multiAnalysisFormId || "",
            ).trim();
            const errors = {};

            if (!analysisFormId && !multiAnalysisFormId) {
              errors.analysisFormId = {
                message: "حداقل یکی از فرم‌ها الزامی است.",
              };
            }

            if (analysisFormId && multiAnalysisFormId) {
              errors.analysisFormId = {
                message: "فقط یکی از فرم‌ها را انتخاب کنید.",
              };
            }

            if (Object.keys(errors).length) {
              return {
                record: {
                  params: {
                    ...record.params,
                    ...request.payload,
                  },
                  errors,
                  populated: {},
                },
              };
            }

            try {
              const updated = await prisma.featuredAnalysis.update({
                where: { id: record.params.id },
                data: {
                  analysisFormId: analysisFormId || null,
                  multiAnalysisFormId: multiAnalysisFormId || null,
                },
              });

              const recordJson = buildRecordJson(
                resource,
                updated,
                currentAdmin,
              );
              await enrichAdminRecordAnalysisFormIdReference(recordJson);
              await enrichAdminRecordMultiAnalysisFormIdReference(recordJson);

              return {
                redirectUrl: h.resourceUrl({
                  resourceId: resource._decorated?.id() || resource.id(),
                }),
                notice: {
                  message: "رکورد با موفقیت ویرایش شد",
                  type: "success",
                },
                record: recordJson,
              };
            } catch (error) {
              return {
                record: {
                  params: {
                    ...record.params,
                    ...request.payload,
                  },
                  errors: {
                    analysisFormId: { message: error.message },
                  },
                  populated: {},
                },
              };
            }
          },
        },
      },
    }),
    prismaResource("FormGoal", {
      navigation: analysisFormsNavigation,

      properties: {
        id: {
          isVisible: {
            list: true,
            filter: false,
            show: true,
            edit: false,
          },
        },

        formId: {
          reference: "AnalysisForm",
          isRequired: true,
          isVisible: {
            list: false,
            filter: false,
            show: false,
            edit: true,
          },
        },

        form: {
          reference: "AnalysisForm",
          isVisible: {
            list: false,
            filter: true,
            show: false,
            edit: false,
          },
        },

        title: {
          isRequired: true,
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: true,
          },
          position: 2,
        },

        projects: {
          isVisible: false,
        },

        createdAt: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: false,
          },
        },

        updatedAt: {
          isVisible: {
            list: false,
            filter: true,
            show: true,
            edit: false,
          },
        },
        analysisForm: {
          type: "string",
          isVirtual: true,
          isVisible: {
            list: true,
            show: true,
            edit: false,
            filter: false,
          },
        },
      },

      listProperties: ["id", "analysisForm", "title", "createdAt"],
      filterProperties: ["form", "title", "createdAt"],
      showProperties: ["id", "analysisForm", "title", "createdAt", "updatedAt"],
      editProperties: ["formId", "title"],

      actions: {
        list: {
          after: async (response) => {
            if (!response.records?.length) {
              return response;
            }

            const formIds = [
              ...new Set(
                response.records
                  .map((record) => record.params.form)
                  .filter(Boolean),
              ),
            ];

            const forms = await prisma.analysisForm.findMany({
              where: {
                id: {
                  in: formIds,
                },
              },
              select: {
                id: true,
                title: true,
              },
            });

            const formMap = Object.fromEntries(
              forms.map((form) => [form.id, form.title]),
            );

            response.records.forEach((record) => {
              record.params.analysisForm = formMap[record.params.form] || "—";
            });

            return response;
          },
        },
        show: {
          after: async (response) => {
            if (!response.record) {
              return response;
            }

            const formId = response.record.params.form;

            if (!formId) {
              response.record.params.analysisForm = "—";
              return response;
            }

            const form = await prisma.analysisForm.findUnique({
              where: { id: formId },
              select: { title: true },
            });

            response.record.params.analysisForm = form?.title || "—";

            return response;
          },
        },

        new: {
          handler: async (request, response, context) => {
            const { resource, h, currentAdmin } = context;

            if (request.method === "get") {
              return {
                resource: resource.decorate().toJSON(currentAdmin),
                record: null,
              };
            }

            const payload = request.payload ?? {};
            const formId = payload.formId;
            const title = payload.title;

            const errors = {};

            if (!formId) {
              errors.formId = { message: "فرم الزامی است" };
            }

            if (!title || !String(title).trim()) {
              errors.title = { message: "عنوان الزامی است" };
            }

            if (Object.keys(errors).length > 0) {
              throw new ValidationError(errors);
            }

            try {
              const created = await prisma.formGoal.create({
                data: {
                  title: String(title).trim(),
                  form: {
                    connect: {
                      id: String(formId),
                    },
                  },
                },
              });

              return {
                record: buildRecordJson(resource, created, currentAdmin),
                notice: {
                  message: "رکورد با موفقیت ایجاد شد",
                  type: "success",
                },
                redirectUrl: h.resourceUrl({
                  resourceId: resource.id(),
                }),
              };
            } catch (error) {
              console.error("FORM_GOAL_CREATE_ERROR:", error);

              throw new ValidationError({
                formId: {
                  message:
                    "فرم انتخاب‌شده معتبر نیست یا ایجاد ارتباط با آن ممکن نشد",
                },
              });
            }
          },
        },

        edit: {
          handler: async (request, response, context) => {
            const { record, resource, h, currentAdmin } = context;

            if (!record) {
              throwRecordNotFound();
            }

            if (request.method === "get") {
              const recordJson = record.toJSON(currentAdmin);
              await enrichAdminRecordFormGoalFormIdReference(recordJson);
              return {
                record: recordJson,
                resource: resource.decorate().toJSON(currentAdmin),
              };
            }

            const payload = request.payload ?? {};
            const formId = payload.formId;
            const title = payload.title;

            const errors = {};

            if (!formId) {
              errors.formId = { message: "فرم الزامی است" };
            }

            if (!title || !String(title).trim()) {
              errors.title = { message: "عنوان الزامی است" };
            }

            if (Object.keys(errors).length > 0) {
              throw new ValidationError(errors);
            }

            try {
              const updated = await prisma.formGoal.update({
                where: {
                  id: record.param("id"),
                },
                data: {
                  title: String(title).trim(),
                  form: {
                    connect: {
                      id: String(formId),
                    },
                  },
                },
              });

              return {
                record: buildRecordJson(resource, updated, currentAdmin),
                notice: {
                  message: "رکورد با موفقیت ویرایش شد",
                  type: "success",
                },
                redirectUrl: h.recordActionUrl({
                  resourceId: resource.id(),
                  recordId: updated.id,
                  actionName: "show",
                }),
              };
            } catch (error) {
              console.error("FORM_GOAL_UPDATE_ERROR:", error);

              throw new ValidationError({
                formId: {
                  message:
                    "فرم انتخاب‌شده معتبر نیست یا به‌روزرسانی ارتباط با آن ممکن نشد",
                },
              });
            }
          },
        },
      },
    }),
    prismaResource("MultiAnalysisRequiredForm", {
      navigation: analysisFormsNavigation,

      properties: {
        id: {
          isVisible: { list: true, filter: false, show: true, edit: false },
        },

        multiAnalysisForm: {
          reference: "MultiAnalysisForm",
          isRequired: true,
          isVisible: { list: true, filter: true, show: true, edit: true },
          position: 1,
        },

        type: {
          availableValues: [
            { value: "SINGLE", label: "تحلیل تکی" },
            { value: "MULTI", label: "تحلیل چندگانه" },
          ],
          isRequired: true,
          isVisible: { list: false, filter: false, show: true, edit: true },
          position: 2,
        },

        form: {
          reference: "AnalysisForm",
          isRequired: false,
          isVisible: { list: true, filter: true, show: true, edit: true },
          position: 3,
        },

        requiredMultiAnalysisForm: {
          reference: "MultiAnalysisForm",
          isRequired: false,
          isVisible: { list: true, filter: true, show: true, edit: true },
          position: 4,
        },

        multiAnalysisFormId: {
          isVisible: false,
        },

        formId: {
          isVisible: false,
        },

        requiredMultiAnalysisFormId: {
          isVisible: false,
        },

        order: {
          isRequired: true,
          isVisible: { list: false, filter: false, show: true, edit: true },
          position: 5,
        },

        createdAt: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },

        updatedAt: {
          isVisible: { list: false, filter: true, show: true, edit: false },
        },
      },

      listProperties: [
        "id",
        "multiAnalysisForm",
        "form",
        "requiredMultiAnalysisForm",
        "createdAt",
      ],

      filterProperties: [
        "multiAnalysisForm",
        "form",
        "requiredMultiAnalysisForm",
        "createdAt",
      ],

      showProperties: [
        "id",
        "multiAnalysisForm",
        "type",
        "form",
        "requiredMultiAnalysisForm",
        "order",
        "createdAt",
        "updatedAt",
      ],

      editProperties: [
        "multiAnalysisForm",
        "type",
        "form",
        "requiredMultiAnalysisForm",
        "order",
      ],

      actions: {
        new: {
          before: async (request) => {
            validateMultiAnalysisRequiredFormPayload(request);
            return request;
          },
        },

        edit: {
          before: async (request) => {
            validateMultiAnalysisRequiredFormPayload(request);
            return request;
          },
        },
      },
    }),
    prismaResource("MultiAnalysisForm", {
      navigation: analysisFormsNavigation,

      properties: {
        title: {
          isTitle: true,
        },
        titleFa: {},
        checklistTitle: {},
        category: {
          reference: "AnalysisCategory",
        },

        order: {
          isVisible: {
            list: true,
            filter: false,
            show: true,
            edit: true,
          },
        },

        temperature: {
          type: "number",
          isVisible: {
            list: true,
            filter: false,
            show: true,
            edit: true,
          },
        },

        directFinalAnalysis: {
          type: "boolean",
          label: "تحلیل مستقیم (بدون فرضیه و review)",
        },
        isShowText: {
          type: "boolean",
          label: "نمایش متن",
        },

        createdAt: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: false,
          },
        },
        updatedAt: {
          isVisible: {
            list: false,
            filter: true,
            show: true,
            edit: false,
          },
        },
      },

      listProperties: [
        "id",
        "title",
        "titleFa",
        "isActive",
        "directFinalAnalysis",
        "isShowText",
        "order",
        "category",
        "temperature",
        "createdAt",
      ],

      filterProperties: [
        "title",
        "isActive",
        "directFinalAnalysis",
        "isShowText",
        "createdAt",
      ],

      showProperties: [
        "id",
        "title",
        "titleFa",
        "checklistTitle",
        "description",
        "isActive",
        "directFinalAnalysis",
        "isShowText",
        "order",
        "temperature",
        "category",
        "createdAt",
        "updatedAt",
      ],

      editProperties: [
        "title",
        "titleFa",
        "category",
        "checklistTitle",
        "description",
        "isActive",
        "directFinalAnalysis",
        "isShowText",
        "order",
        "temperature",
      ],
    }),
    prismaResource("MultiAnalysisGoal", {
      navigation: analysisFormsNavigation,

      properties: {
        id: {
          isVisible: {
            list: true,
            filter: false,
            show: true,
            edit: false,
          },
        },

        multiAnalysisFormId: {
          reference: "MultiAnalysisForm",
          isRequired: true,
          isVisible: {
            list: false,
            filter: false,
            show: false,
            edit: true,
          },
          position: 1,
        },

        title: {
          isRequired: true,
          position: 2,
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: true,
          },
        },

        createdAt: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: false,
          },
        },

        updatedAt: {
          isVisible: {
            list: false,
            filter: true,
            show: true,
            edit: false,
          },
        },

        multiAnalysisFormTitle: {
          type: "string",
          isVirtual: true,
          isVisible: {
            list: true,
            show: true,
            edit: false,
            filter: false,
          },
        },
        multiAnalysisForm: {
          reference: "MultiAnalysisForm",
          isVisible: {
            list: false,
            filter: true,
            show: false,
            edit: false,
          },
        },
      },

      listProperties: ["id", "multiAnalysisFormTitle", "title", "createdAt"],
      filterProperties: ["multiAnalysisForm", "title", "createdAt"],
      showProperties: [
        "id",
        "multiAnalysisFormTitle",
        "title",
        "createdAt",
        "updatedAt",
      ],

      editProperties: ["multiAnalysisFormId", "title"],

      actions: {
        list: {
          after: async (response) => {
            if (!response.records?.length) {
              return response;
            }

            const formIds = [
              ...new Set(
                response.records
                  .map((record) => record.params.multiAnalysisForm)
                  .filter(Boolean),
              ),
            ];

            const forms = await prisma.multiAnalysisForm.findMany({
              where: {
                id: {
                  in: formIds,
                },
              },
              select: {
                id: true,
                title: true,
              },
            });

            const formMap = Object.fromEntries(
              forms.map((form) => [form.id, form.title]),
            );

            response.records.forEach((record) => {
              record.params.multiAnalysisFormTitle =
                formMap[record.params.multiAnalysisForm] || "—";
            });

            return response;
          },
        },

        show: {
          after: async (response) => {
            if (!response.record) {
              return response;
            }

            const formId = response.record.params.multiAnalysisForm;

            if (!formId) {
              response.record.params.multiAnalysisFormTitle = "—";
              return response;
            }

            const form = await prisma.multiAnalysisForm.findUnique({
              where: { id: formId },
              select: { title: true },
            });

            response.record.params.multiAnalysisFormTitle = form?.title || "—";

            return response;
          },
        },
        new: {
          handler: async (request, response, context) => {
            const { resource, h, currentAdmin } = context;
            if (request.method === "get") {
              return {
                resource: resource.decorate().toJSON(currentAdmin),
                record: null,
              };
            }

            const payload = request.payload ?? {};

            const multiAnalysisFormId = String(
              payload.multiAnalysisFormId ?? "",
            ).trim();

            const title = String(payload.title ?? "").trim();

            const errors = {};

            if (!multiAnalysisFormId) {
              errors.multiAnalysisFormId = {
                message: "انتخاب فرم تحلیل چندگانه الزامی است.",
              };
            }

            if (!title) {
              errors.title = {
                message: "عنوان هدف الزامی است.",
              };
            }

            if (Object.keys(errors).length > 0) {
              throw new ValidationError(errors);
            }

            try {
              const created = await prisma.multiAnalysisGoal.create({
                data: {
                  title,

                  multiAnalysisForm: {
                    connect: {
                      id: multiAnalysisFormId,
                    },
                  },
                },
              });

              return {
                record: buildRecordJson(resource, created, currentAdmin),

                notice: {
                  message: "هدف تحلیل چندگانه با موفقیت ایجاد شد.",
                  type: "success",
                },

                redirectUrl: h.recordActionUrl({
                  resourceId: resource.id(),
                  recordId: created.id,
                  actionName: "show",
                }),
              };
            } catch (error) {
              console.error("MULTI_ANALYSIS_GOAL_CREATE_ERROR:", error);

              if (error instanceof ValidationError) {
                throw error;
              }

              throw new ValidationError({
                multiAnalysisFormId: {
                  message:
                    "فرم تحلیل چندگانه انتخاب‌شده معتبر نیست یا ایجاد ارتباط با آن ممکن نشد.",
                },
              });
            }
          },
        },
        edit: {
          handler: async (request, response, context) => {
            const { record, resource, h, currentAdmin } = context;

            if (!record) {
              throwRecordNotFound();
            }

            if (request.method === "get") {
              const recordJson = record.toJSON(currentAdmin);
              await enrichAdminRecordMultiAnalysisGoalFormReference(recordJson);
              return {
                record: recordJson,
                resource: resource.decorate().toJSON(currentAdmin),
              };
            }

            const payload = request.payload ?? {};

            const multiAnalysisFormId = String(
              payload.multiAnalysisFormId ?? "",
            ).trim();

            const title = String(payload.title ?? "").trim();

            const errors = {};

            if (!multiAnalysisFormId) {
              errors.multiAnalysisFormId = {
                message: "انتخاب فرم تحلیل چندگانه الزامی است.",
              };
            }

            if (!title) {
              errors.title = {
                message: "عنوان هدف الزامی است.",
              };
            }

            if (Object.keys(errors).length > 0) {
              throw new ValidationError(errors);
            }

            try {
              const updated = await prisma.multiAnalysisGoal.update({
                where: {
                  id: String(record.param("id")),
                },

                data: {
                  title,

                  multiAnalysisForm: {
                    connect: {
                      id: multiAnalysisFormId,
                    },
                  },
                },
              });

              const recordJson = buildRecordJson(
                resource,
                updated,
                currentAdmin,
              );
              await enrichAdminRecordMultiAnalysisGoalFormReference(recordJson);

              return {
                record: recordJson,

                notice: {
                  message: "هدف تحلیل چندگانه با موفقیت ویرایش شد.",
                  type: "success",
                },

                redirectUrl: h.recordActionUrl({
                  resourceId: resource.id(),
                  recordId: updated.id,
                  actionName: "show",
                }),
              };
            } catch (error) {
              console.error("MULTI_ANALYSIS_GOAL_UPDATE_ERROR:", error);

              if (error instanceof ValidationError) {
                throw error;
              }

              throw new ValidationError({
                multiAnalysisFormId: {
                  message:
                    "فرم تحلیل چندگانه انتخاب‌شده معتبر نیست یا به‌روزرسانی ارتباط با آن ممکن نشد.",
                },
              });
            }
          },
        },
      },
    }),
    prismaResource("FollowUpForm", {
      navigation: followUpNavigation,

      properties: {
        id: {
          isVisible: { list: true, filter: false, show: true, edit: false },
        },

        title: {
          isVisible: { list: true, filter: true, show: true, edit: true },
          isRequired: true,
        },

        description: {
          type: "textarea",
          isVisible: { list: false, filter: false, show: true, edit: true },
        },

        isActive: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },

        order: {
          isVisible: { list: false, filter: false, show: true, edit: true },
          isRequired: true,
        },

        questions: { isVisible: false },

        questionsJson: {
          type: "string",
          isVirtual: true,
          label: "سوالات",
          props: {
            typeOptions: questionTypeValues,
          },
          isVisible: {
            list: false,
            show: false,
            edit: true,
            filter: false,
            new: true,
          },
          components: {
            edit: Components.FollowUpFormQuestionsEditor,
            new: Components.FollowUpFormQuestionsEditor,
          },
        },

        createdAt: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },

        updatedAt: {
          isVisible: { list: false, filter: true, show: true, edit: false },
        },
      },

      listProperties: ["id", "title", "isActive", "createdAt"],

      editProperties: [
        "title",
        "description",
        "isActive",
        "order",
        "questionsJson",
      ],

      newProperties: [
        "title",
        "description",
        "isActive",
        "order",
        "questionsJson",
      ],

      showProperties: [
        "id",
        "title",
        "description",
        "isActive",
        "order",
        "createdAt",
        "updatedAt",
      ],

      filterProperties: ["title", "isActive", "createdAt", "updatedAt"],

      actions: {
        new: {
          layout: [
            "title",
            "description",
            "isActive",
            "order",
            "questionsJson",
          ],
          handler: async (request, response, context) => {
            const { resource, h, currentAdmin } = context;

            if (request.method === "get") {
              const recordJson = resource
                .build({ questionsJson: "[]" })
                .toJSON(currentAdmin);
              return {
                resource: resource.decorate().toJSON(currentAdmin),
                record: recordJson,
              };
            }

            const payload = { ...(request.payload || {}) };

            const title = String(payload.title || "").trim();

            const description =
              payload.description !== undefined && payload.description !== null
                ? String(payload.description).trim()
                : "";

            const isActive = parseBooleanValue(payload.isActive);

            const order = parseIntegerValue(payload.order);

            const errors = {};

            if (!title) {
              errors.title = {
                message: "عنوان فرم الزامی است.",
              };
            }

            if (order === null) {
              errors.order = {
                message: "ترتیب باید یک عدد صحیح باشد.",
              };
            }

            if (Object.keys(errors).length > 0) {
              throw new ValidationError(errors);
            }

            const parsedQuestions = parseFollowUpFormQuestionsJson(
              payload.questionsJson,
            );
            const normalizedQuestions =
              validateFollowUpFormQuestionsForSave(parsedQuestions);

            const created = await prisma.$transaction(async (tx) => {
              const form = await tx.followUpForm.create({
                data: {
                  title,
                  description,
                  isActive,
                  order,
                },
              });

              await persistFollowUpFormQuestions(
                form.id,
                normalizedQuestions,
                tx,
              );

              return form;
            });

            const recordJson = buildRecordJson(resource, created, currentAdmin);
            await enrichFollowUpFormRecordWithQuestionsJson(recordJson);

            return {
              record: recordJson,
              notice: {
                message: "فرم و سوالات با موفقیت ایجاد شد.",
                type: "success",
              },
              redirectUrl: h.recordActionUrl({
                resourceId: resource.id(),
                recordId: created.id,
                actionName: "show",
              }),
            };
          },
        },

        edit: {
          layout: [
            "title",
            "description",
            "isActive",
            "order",
            "questionsJson",
          ],
          handler: async (request, response, context) => {
            const { record, resource, h, currentAdmin } = context;

            if (!record) {
              throwRecordNotFound();
            }

            if (request.method === "get") {
              const recordJson = record.toJSON(currentAdmin);
              await enrichFollowUpFormRecordWithQuestionsJson(recordJson);
              return {
                record: recordJson,
                resource: resource.decorate().toJSON(currentAdmin),
              };
            }

            const recordId = String(record.param("id"));

            const payload = { ...(request.payload || {}) };

            const title = String(payload.title || "").trim();

            const description =
              payload.description !== undefined && payload.description !== null
                ? String(payload.description).trim()
                : "";

            const isActive = parseBooleanValue(payload.isActive);

            const order = parseIntegerValue(payload.order);

            const errors = {};

            if (!title) {
              errors.title = {
                message: "عنوان فرم الزامی است.",
              };
            }

            if (order === null) {
              errors.order = {
                message: "ترتیب باید یک عدد صحیح باشد.",
              };
            }

            if (Object.keys(errors).length > 0) {
              throw new ValidationError(errors);
            }

            const parsedQuestions = parseFollowUpFormQuestionsJson(
              payload.questionsJson,
            );
            const normalizedQuestions =
              validateFollowUpFormQuestionsForSave(parsedQuestions);

            const updated = await prisma.$transaction(async (tx) => {
              const form = await tx.followUpForm.update({
                where: {
                  id: recordId,
                },
                data: {
                  title,
                  description,
                  isActive,
                  order,
                },
              });

              await persistFollowUpFormQuestions(
                form.id,
                normalizedQuestions,
                tx,
              );

              return form;
            });

            const recordJson = buildRecordJson(resource, updated, currentAdmin);
            await enrichFollowUpFormRecordWithQuestionsJson(recordJson);

            return {
              record: recordJson,
              notice: {
                message: "فرم و سوالات با موفقیت ویرایش شد.",
                type: "success",
              },
              redirectUrl: h.recordActionUrl({
                resourceId: resource.id(),
                recordId: updated.id,
                actionName: "show",
              }),
            };
          },
        },
      },
    }),
    prismaResource("FollowUpFormQuestion", {
      navigation: { ...followUpNavigation, show: false },

      properties: {
        id: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },

        formId: {
          reference: "FollowUpForm",
          isRequired: true,
          position: 1,
          isVisible: { list: true, filter: true, show: true, edit: true },
        },

        form: {
          reference: "FollowUpForm",
          isVisible: {
            list: false,
            filter: true,
            show: false,
            edit: false,
          },
        },

        label: {
          isRequired: true,
          position: 2,
          isVisible: { list: true, filter: true, show: true, edit: true },
        },

        type: {
          isRequired: true,
          position: 3,
          availableValues: questionTypeValues,
          isVisible: { list: true, filter: true, show: true, edit: true },
        },

        optionsText: {
          type: "textarea",
          position: 4,
          props: {
            rows: 10,
            placeholder: `[
  {
    "label": "گزینه اول",
    "value": "option_1"
  },
  {
    "label": "گزینه دوم",
    "value": "option_2"
  }
]`,
          },
          description: "فقط برای RADIO و CHECKBOX",
          isVisible: { list: false, filter: false, show: true, edit: true },
        },

        options: {
          type: "mixed",
          isVisible: { list: false, filter: false, show: false, edit: false },
        },

        required: {
          position: 5,
          isVisible: { list: true, filter: true, show: true, edit: true },
        },

        order: {
          position: 6,
          isRequired: true,
          isVisible: { list: true, filter: true, show: true, edit: true },
        },

        createdAt: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },

        updatedAt: {
          isVisible: { list: false, filter: true, show: true, edit: false },
        },
      },

      listProperties: ["id", "formId", "label", "type", "required", "order"],

      editProperties: [
        "formId",
        "label",
        "type",
        "optionsText",
        "required",
        "order",
      ],

      showProperties: [
        "id",
        "formId",
        "label",
        "type",
        "optionsText",
        "required",
        "order",
        "createdAt",
        "updatedAt",
      ],

      filterProperties: [
        "id",
        "form",
        "label",
        "type",
        "required",
        "order",
        "createdAt",
        "updatedAt",
      ],

      actions: {
        new: {
          handler: async (request, response, context) => {
            const { resource, h, currentAdmin } = context;

            if (request.method === "get") {
              return {
                resource: resource.decorate().toJSON(currentAdmin),
                record: resource.build({}).toJSON(currentAdmin),
              };
            }

            const payload = { ...(request.payload || {}) };

            delete payload.form;

            const formId = String(payload.formId || "").trim();
            const label = String(payload.label || "").trim();
            const type = String(payload.type || "").trim();
            const required = parseBooleanValue(payload.required);
            const order = parseIntegerValue(payload.order);
            const optionsText = payload.optionsText;

            const errors = {};

            if (!formId) {
              errors.formId = {
                message: "انتخاب فرم الزامی است.",
              };
            }

            if (!label) {
              errors.label = {
                message: "عنوان سوال الزامی است.",
              };
            }

            if (!type) {
              errors.type = {
                message: "نوع سوال الزامی است.",
              };
            }

            if (order === null) {
              errors.order = {
                message: "ترتیب باید یک عدد صحیح باشد.",
              };
            }

            if (Object.keys(errors).length > 0) {
              throw new ValidationError(errors);
            }

            const formExists = await prisma.followUpForm.findUnique({
              where: {
                id: formId,
              },
            });

            if (!formExists) {
              throw new ValidationError({
                formId: {
                  message: "فرم پیگیری انتخاب‌شده وجود ندارد.",
                },
              });
            }

            const parsedOptions = parseOptionsText(optionsText);

            validateQuestionOptions({
              type,
              options: parsedOptions,
            });

            const data = {
              label,
              type,
              options: parsedOptions,
              required,
              order,
              form: {
                connect: {
                  id: formId,
                },
              },
            };

            const created = await prisma.followUpFormQuestion.create({
              data,
            });

            const recordJson = buildOptionsTextFromRecord(
              buildRecordJson(resource, created, currentAdmin),
            );

            return {
              record: recordJson,
              notice: {
                message: "سوال فرم پیگیری با موفقیت ایجاد شد.",
                type: "success",
              },
              redirectUrl: h.recordActionUrl({
                resourceId: resource.id(),
                recordId: created.id,
                actionName: "show",
              }),
            };
          },
        },

        edit: {
          before: async (request) => {
            if (request.method === "post") {
              const parsedOptions = parseOptionsText(
                request.payload?.optionsText,
              );

              request.payload.options = parsedOptions;

              delete request.payload.optionsText;
            }

            return request;
          },

          after: async (response, request) => {
            if (request.method === "get" && response.record) {
              response.record.params.optionsText = JSON.stringify(
                buildOptionsFromParams(response.record.params),
                null,
                2,
              );
            }

            return response;
          },
        },

        show: {
          after: fillOptionsTextAfterLoad,
        },

        list: {
          after: async (response) => {
            if (response.records) {
              response.records = response.records.map((record) => {
                return buildOptionsTextFromRecord(record);
              });
            }

            return response;
          },
        },
      },
    }),
    prismaResource("FollowUpRequest", {
      navigation: followUpNavigation,

      properties: {
        id: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },

        title: {
          isTitle: true,
          isVisible: { list: true, filter: true, show: true, edit: false },
        },

        status: {
          availableValues: [
            { value: "PENDING", label: "در انتظار" },
            { value: "ANSWERED", label: "پاسخ داده شده" },
          ],
          isVisible: { list: true, filter: true, show: true, edit: false },
          position: 2,
        },

        projectId: {
          reference: "Project",
          isVisible: {
            list: false,
            filter: false,
            show: true,
            edit: false,
          },
        },

        project: {
          reference: "Project",
          isVisible: {
            list: true,
            show: true,
            filter: true,
            edit: false,
          },
        },

        user: {
          reference: "User",
          isVisible: {
            list: true,
            show: true,
            filter: true,
            edit: false,
          },
        },

        userId: {
          reference: "User",
          isVisible: {
            list: false,
            filter: false,
            show: true,
            edit: false,
          },
        },

        formId: {
          reference: "FollowUpForm",
          isVisible: {
            list: false,
            filter: false,
            show: true,
            edit: false,
          },
        },

        form: {
          reference: "FollowUpForm",
          isVisible: {
            list: false,
            filter: true,
            show: true,
            edit: true,
          },
        },

        extraDescription: {
          type: "textarea",
          label: "توضیحات تکمیلی کاربر",
          props: {
            rows: 6,
          },
          isDisabled: true,
          isVisible: {
            list: false,
            filter: false,
            show: true,
            edit: true,
          },
        },

        responses: {
          type: "mixed",
          isVisible: { list: false, filter: false, show: false, edit: false },
        },

        responsesText: {
          type: "textarea",
          label: "پاسخ‌های فرم",
          position: 7,
          props: {
            rows: 12,
          },
          isDisabled: true,
          isVisible: {
            list: false,
            filter: false,
            show: true,
            edit: true,
          },
        },

        adminAnswer: {
          type: "textarea",
          label: "پاسخ ادمین",
          isVisible: { list: false, filter: false, show: true, edit: true },
          props: {
            rows: 10,
            placeholder: "پاسخ خود را به کاربر بنویسید...",
          },
        },

        answeredAt: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },

        answeredById: {
          reference: "User",
          isVisible: { list: true, filter: true, show: true, edit: false },
        },

        createdAt: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },
      },

      listProperties: ["id", "title", "status", "project", "user", "createdAt"],

      filterProperties: [
        "status",
        "project",
        "user",
        "form",
        "title",
        "createdAt",
      ],
      showProperties: [
        "id",
        "title",
        "status",
        "projectId",
        "project",
        "userId",
        "user",
        "formId",
        "form",
        "extraDescription",
        "responsesText",
        "adminAnswer",
        "answeredAt",
        "answeredById",
        "createdAt",
      ],

      editProperties: ["extraDescription", "responsesText", "adminAnswer"],

      actions: {
        show: {
          after: async (response) => {
            if (!response.record) {
              return response;
            }

            const recordJson = { params: response.record.params };
            await enrichFollowUpRequestRecord(recordJson);
            response.record.params = recordJson.params;

            return response;
          },
        },

        edit: {
          handler: async (request, response, context) => {
            const { record, resource, h, currentAdmin } = context;
            if (!record) throwRecordNotFound();

            if (request.method === "get") {
              const recordJson = record.toJSON(currentAdmin);
              await enrichFollowUpRequestRecord(recordJson);

              return {
                record: recordJson,
                resource: resource.decorate().toJSON(currentAdmin),
              };
            }

            const payload = { ...(request.payload || {}) };
            const adminAnswer = String(payload.adminAnswer || "").trim();
            const recordId = String(record.param("id"));

            if (!adminAnswer) {
              throw new ValidationError({
                adminAnswer: { message: "لطفاً پاسخ خود را وارد کنید." },
              });
            }

            const updated = await prisma.followUpRequest.update({
              where: { id: recordId },
              data: {
                adminAnswer,
                status: "ANSWERED",
                answeredAt: new Date(),
                answeredById: currentAdmin.id,
              },
            });

            void prisma.notification
              .create({
                data: {
                  userId: updated.userId,
                  type: "FOLLOW_UP_ANSWERED",
                  title: "پاسخ به درخواست پیگیری",
                  message: `ادمین به درخواست پیگیری شما با عنوان «${updated.title}» پاسخ داده است.`,
                  referenceId: updated.id,
                  referenceType: "FollowUpRequest",
                },
              })
              .catch((error) => {
                console.error("FOLLOWUP_NOTIFICATION_ERROR:", error);
              });

            return {
              record: buildRecordJson(resource, updated, currentAdmin),
              notice: {
                message:
                  "✅ پاسخ با موفقیت ثبت شد و وضعیت به 'پاسخ داده شده' تغییر کرد.",
                type: "success",
              },
              redirectUrl: h.recordActionUrl({
                resourceId: resource.id(),
                recordId: updated.id,
                actionName: "show",
              }),
            };
          },
        },
      },
    }),
    prismaResource("Notification", {
      navigation: {
        name: "اعلان‌ها",
        icon: "Bell",
      },
      properties: {
        userId: {
          isVisible: { list: true, filter: false, show: true, edit: true },
        },

        user: {
          reference: "User",
          isVisible: {
            list: false,
            filter: true,
            show: false,
            edit: true,
          },
        },
        type: {
          isVisible: { list: true, filter: false, show: true, edit: true },
        },
        referenceId: {
          isVisible: { list: true, filter: false, show: true, edit: true },
        },
        referenceType: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },
        createdAt: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },
        updatedAt: {
          isVisible: { list: false, filter: true, show: true, edit: false },
        },

        username: {
          type: "string",
          isVirtual: true,
          label: "کاربر",
          isVisible: {
            list: true,
            show: true,
            edit: false,
            filter: false,
          },
        },
      },
      listProperties: [
        "id",
        "username",
        "type",
        "title",
        "isRead",
        "referenceId",
        "createdAt",
      ],
      showProperties: [
        "id",
        "username",
        "type",
        "title",
        "message",
        "isRead",
        "referenceId",
        "referenceType",
        "createdAt",
      ],
      editProperties: [
        "user",
        "type",
        "title",
        "message",
        "isRead",
        "referenceId",
        "referenceType",
      ],
      filterProperties: ["user", "title", "isRead", "createdAt"],
      actions: {
        list: {
          after: async (response) => {
            if (!response.records?.length) {
              return response;
            }

            const userIds = [
              ...new Set(
                response.records
                  .map((record) => record.params.user)
                  .filter(Boolean),
              ),
            ];

            const users = await prisma.user.findMany({
              where: {
                id: {
                  in: userIds,
                },
              },
              select: {
                id: true,
                username: true,
              },
            });

            const userMap = Object.fromEntries(
              users.map((user) => [user.id, user.username]),
            );

            response.records.forEach((record) => {
              record.params.username = userMap[record.params.user] || "—";
            });

            return response;
          },
        },

        show: {
          after: async (response) => {
            if (!response.record) {
              return response;
            }

            const userId = response.record.params.user;

            if (!userId) {
              response.record.params.username = "—";
              return response;
            }

            const user = await prisma.user.findUnique({
              where: {
                id: userId,
              },
              select: {
                username: true,
              },
            });

            response.record.params.username = user?.username || "—";

            return response;
          },
        },
      },
    }),
    prismaResource("RefreshToken", {
      navigation: securityNavigationHidden,
      properties: {
        tokenHash: {
          isVisible: { list: false, filter: false, show: true, edit: false },
        },
        userId: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },
        expiresAt: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },
        revoked: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },
        createdAt: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },
        updatedAt: {
          isVisible: { list: false, filter: true, show: true, edit: false },
        },
      },
      listProperties: ["id", "userId", "expiresAt", "revoked", "createdAt"],
      editProperties: ["userId", "expiresAt", "revoked"],
    }),
    prismaResource("PromptDefinition", {
      navigation: promptsNavigation,

      titleProperty: "title",

      properties: {
        id: {
          isVisible: { list: true, filter: false, show: true, edit: false },
        },

        title: {
          isVisible: { list: true, filter: true, show: true, edit: true },
          position: 1,
        },

        ownerType: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: false,
            new: true,
          },
          availableValues: [
            { value: "ANALYSIS_FORM", label: "Analysis Form" },
            { value: "MULTI_ANALYSIS_FORM", label: "Multi Analysis Form" },
          ],
          position: 2,
        },

        analysisFormId: {
          reference: "AnalysisForm",
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: false,
            new: true,
          },
          position: 3,
        },

        analysisForm: {
          reference: "AnalysisForm",
          isVisible: {
            list: false,
            filter: true,
            show: false,
            edit: false,
          },
        },
        multiAnalysisFormId: {
          reference: "MultiAnalysisForm",
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: false,
            new: true,
          },
          position: 4,
        },

        multiAnalysisForm: {
          reference: "MultiAnalysisForm",
          isVisible: {
            list: false,
            filter: true,
            show: false,
            edit: false,
          },
        },

        promptEditorJson: {
          type: "string",
          isVirtual: true,
          label: "بخش‌های پرامپت",
          isVisible: {
            list: false,
            show: false,
            edit: true,
            filter: false,
            new: true,
          },
          components: {
            edit: Components.PromptDefinitionEditor,
            new: Components.PromptDefinitionEditor,
          },
        },

        createdAt: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },

        updatedAt: {
          isVisible: { list: false, filter: true, show: true, edit: false },
        },
        analysisOwnerTitle: {
          type: "string",
          isVirtual: true,
          label: "مالک پرامپت",
          isVisible: {
            list: true,
            show: true,
            edit: false,
            filter: false,
          },
        },
      },

      listProperties: [
        "id",
        "title",
        "ownerType",
        "analysisOwnerTitle",
        "createdAt",
      ],

      editProperties: ["title", "promptEditorJson"],

      newProperties: [
        "title",
        "ownerType",
        "analysisFormId",
        "multiAnalysisFormId",
        "promptEditorJson",
      ],

      showProperties: [
        "id",
        "title",
        "ownerType",
        "analysisOwnerTitle",
        "createdAt",
        "updatedAt",
      ],

      filterProperties: [
        "title",
        "ownerType",
        "analysisForm",
        "multiAnalysisForm",
        "createdAt",
        "updatedAt",
      ],

      actions: {
        list: {
          after: async (response) => {
            if (!response.records?.length) {
              return response;
            }

            const analysisFormIds = [
              ...new Set(
                response.records
                  .map((r) => r.params.analysisForm)
                  .filter(Boolean),
              ),
            ];

            const multiAnalysisFormIds = [
              ...new Set(
                response.records
                  .map((r) => r.params.multiAnalysisForm)
                  .filter(Boolean),
              ),
            ];

            const [analysisForms, multiAnalysisForms] = await Promise.all([
              prisma.analysisForm.findMany({
                where: {
                  id: {
                    in: analysisFormIds,
                  },
                },
                select: {
                  id: true,
                  title: true,
                },
              }),

              prisma.multiAnalysisForm.findMany({
                where: {
                  id: {
                    in: multiAnalysisFormIds,
                  },
                },
                select: {
                  id: true,
                  title: true,
                },
              }),
            ]);

            const analysisMap = Object.fromEntries(
              analysisForms.map((item) => [item.id, item.title]),
            );

            const multiAnalysisMap = Object.fromEntries(
              multiAnalysisForms.map((item) => [item.id, item.title]),
            );

            response.records.forEach((record) => {
              if (record.params.ownerType === "ANALYSIS_FORM") {
                record.params.analysisOwnerTitle =
                  analysisMap[record.params.analysisForm] || "—";
              } else {
                record.params.analysisOwnerTitle =
                  multiAnalysisMap[record.params.multiAnalysisForm] || "—";
              }
            });

            return response;
          },
        },

        show: {
          after: async (response) => {
            if (!response.record) {
              return response;
            }

            const params = response.record.params;

            if (params.ownerType === "ANALYSIS_FORM") {
              const analysisFormId = normalizeAdminReferenceId(
                params.analysisForm ?? params.analysisFormId,
              );

              if (analysisFormId) {
                const form = await prisma.analysisForm.findUnique({
                  where: { id: analysisFormId },
                  select: { title: true },
                });
                params.analysisOwnerTitle = form?.title || "—";
              } else {
                params.analysisOwnerTitle = "—";
              }
            } else if (params.ownerType === "MULTI_ANALYSIS_FORM") {
              const multiAnalysisFormId = normalizeAdminReferenceId(
                params.multiAnalysisForm ?? params.multiAnalysisFormId,
              );

              if (multiAnalysisFormId) {
                const form = await prisma.multiAnalysisForm.findUnique({
                  where: { id: multiAnalysisFormId },
                  select: { title: true },
                });
                params.analysisOwnerTitle = form?.title || "—";
              } else {
                params.analysisOwnerTitle = "—";
              }
            } else {
              params.analysisOwnerTitle = "—";
            }

            return response;
          },
        },
        new: {
          layout: [
            "title",
            "ownerType",
            "analysisFormId",
            "multiAnalysisFormId",
            "promptEditorJson",
          ],
          handler: async (request, response, context) => {
            const { resource, h, currentAdmin } = context;

            if (request.method === "get") {
              const recordJson = resource
                .build({
                  promptEditorJson: JSON.stringify({
                    status: "DRAFT",
                    segments: [
                      {
                        label: "بخش 1",
                        description: "",
                        isRequired: true,
                        content: "",
                      },
                    ],
                  }),
                })
                .toJSON(currentAdmin);
              return { record: recordJson };
            }

            const payload = { ...(request.payload || {}) };

            const ownerType = String(payload.ownerType || "").trim();
            let title = payload.title ? String(payload.title).trim() : "";

            const analysisFormId = payload.analysisFormId
              ? String(payload.analysisFormId).trim()
              : null;

            const multiAnalysisFormId = payload.multiAnalysisFormId
              ? String(payload.multiAnalysisFormId).trim()
              : null;

            if (!ownerType) {
              throwFieldValidation("ownerType", "نوع مالک الزامی است.");
            }

            const parsedEditor = parsePromptEditorJson(payload.promptEditorJson);
            const normalizedEditor =
              validatePromptEditorSegmentsForSave(parsedEditor);

            const data = {
              ownerType,
            };

            if (ownerType === "ANALYSIS_FORM") {
              if (!analysisFormId) {
                throwFieldValidation(
                  "analysisFormId",
                  "انتخاب فرم تحلیل الزامی است.",
                );
              }

              const analysisFormExists = await prisma.analysisForm.findUnique({
                where: { id: analysisFormId },
                select: { id: true, title: true },
              });

              if (!analysisFormExists) {
                throwFieldValidation(
                  "analysisFormId",
                  "فرم تحلیل انتخاب‌شده یافت نشد.",
                );
              }

              if (!title) {
                title = `پرامپت فرم: ${analysisFormExists.title}`;
              }

              data.title = title;
              data.analysisForm = {
                connect: {
                  id: analysisFormId,
                },
              };
            } else if (ownerType === "MULTI_ANALYSIS_FORM") {
              if (!multiAnalysisFormId) {
                throwFieldValidation(
                  "multiAnalysisFormId",
                  "انتخاب فرم تحلیل چندگانه الزامی است.",
                );
              }

              const multiAnalysisFormExists =
                await prisma.multiAnalysisForm.findUnique({
                  where: { id: multiAnalysisFormId },
                  select: { id: true, title: true },
                });

              if (!multiAnalysisFormExists) {
                throwFieldValidation(
                  "multiAnalysisFormId",
                  "فرم تحلیل چندگانه انتخاب‌شده یافت نشد.",
                );
              }

              if (!title) {
                title = `پرامپت تحلیل چندگانه: ${multiAnalysisFormExists.title}`;
              }

              data.title = title;
              data.multiAnalysisForm = {
                connect: {
                  id: multiAnalysisFormId,
                },
              };
            } else {
              throwFieldValidation("ownerType", "نوع مالک معتبر نیست.");
            }

            const created = await prisma.$transaction(async (tx) => {
              const definition = await tx.promptDefinition.create({
                data,
              });

              await persistPromptDefinitionEditorContent(
                definition.id,
                title,
                normalizedEditor,
                tx,
              );

              return definition;
            });

            const recordJson = buildRecordJson(resource, created, currentAdmin);
            await enrichPromptDefinitionRecordWithEditorJson(recordJson);

            return {
              record: recordJson,
              redirectUrl: h.recordActionUrl({
                resourceId: resource.id(),
                recordId: created.id,
                actionName: "show",
              }),
              notice: {
                message: "پرامپت با موفقیت ایجاد شد",
                type: "success",
              },
            };
          },
        },

        edit: {
          layout: ["title", "promptEditorJson"],
          handler: async (request, response, context) => {
            const { record, resource, h, currentAdmin } = context;

            if (!record) {
              throwRecordNotFound();
            }

            const recordId = String(record.param("id"));

            if (request.method === "get") {
              const recordJson = record.toJSON(currentAdmin);
              await enrichPromptDefinitionRecordWithEditorJson(recordJson);
              return {
                record: recordJson,
                resource: resource.decorate().toJSON(currentAdmin),
              };
            }

            const payload = { ...(request.payload || {}) };

            const title = payload.title ? String(payload.title).trim() : "";

            if (!title) {
              throwFieldValidation("title", "عنوان پرامپت الزامی است.");
            }

            const parsedEditor = parsePromptEditorJson(payload.promptEditorJson);
            const normalizedEditor =
              validatePromptEditorSegmentsForSave(parsedEditor);

            const updated = await prisma.$transaction(async (tx) => {
              const definition = await tx.promptDefinition.update({
                where: { id: recordId },
                data: { title },
              });

              await persistPromptDefinitionEditorContent(
                definition.id,
                title,
                normalizedEditor,
                tx,
              );

              return definition;
            });

            const recordJson = buildRecordJson(resource, updated, currentAdmin);
            await enrichPromptDefinitionRecordWithEditorJson(recordJson);

            return {
              record: recordJson,
              redirectUrl: h.recordActionUrl({
                resourceId: resource.id(),
                recordId,
                actionName: "show",
              }),
              notice: {
                message: "پرامپت با موفقیت ویرایش شد",
                type: "success",
              },
            };
          },
        },

        delete: {
          handler: async (request, response, context) => {
            const { record, resource, h, currentAdmin } = context;

            if (!record) {
              throwRecordNotFound();
            }

            if (request.method === "get") {
              return {
                record: record.toJSON(currentAdmin),
              };
            }

            const definitionId = String(record.id());
            const recordJson = record.toJSON(currentAdmin);

            await prisma.$transaction(async (tx) => {
              await deletePromptDefinitionWithDependents(definitionId, tx);
            });

            return {
              record: recordJson,
              notice: {
                message: "پرامپت و بخش‌های وابسته با موفقیت حذف شد.",
                type: "success",
              },
              redirectUrl: h.resourceActionUrl({
                resourceId: resource.id(),
                actionName: "list",
              }),
            };
          },
        },

        bulkDelete: {
          handler: async (request, response, context) => {
            const { records, resource, h, currentAdmin } = context;

            if (request.method === "get") {
              return {
                records: (records ?? []).map((item) =>
                  item.toJSON(currentAdmin),
                ),
              };
            }

            const definitionIds = (records ?? []).map((item) => String(item.id()));
            const recordsJson = (records ?? []).map((item) =>
              item.toJSON(currentAdmin),
            );

            await prisma.$transaction(async (tx) => {
              for (const definitionId of definitionIds) {
                await deletePromptDefinitionWithDependents(definitionId, tx);
              }
            });

            return {
              records: recordsJson,
              notice: {
                message: "پرامپت‌های انتخاب‌شده با موفقیت حذف شدند.",
                type: "success",
              },
              redirectUrl: h.resourceActionUrl({
                resourceId: resource.id(),
                actionName: "list",
              }),
            };
          },
        },
      },
    }),
    prismaResource("PromptSegmentDefinition", {
      navigation: promptsNavigationHidden,
      titleProperty: "label",

      properties: {
        id: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },

        // FK به PromptDefinition
        promptDefinitionId: {
          reference: "PromptDefinition",
          isRequired: true,
          isVisible: {
            list: true,
            filter: false,
            show: true,
            edit: true,
          },
        },

        promptDefinition: {
          reference: "PromptDefinition",
          isVisible: {
            list: false,
            filter: true,
            show: false,
            edit: false,
          },
        },
        key: {
          isRequired: true,
          isVisible: { list: true, filter: true, show: true, edit: true },
          position: 2,
        },

        label: {
          isRequired: true,
          isVisible: { list: true, filter: true, show: true, edit: true },
          position: 3,
        },

        description: {
          type: "textarea",
          isVisible: { list: false, filter: false, show: true, edit: true },
          position: 4,
        },

        sortOrder: {
          isVisible: { list: true, filter: true, show: true, edit: true },
          position: 5,
        },

        isRequired: {
          isVisible: { list: true, filter: true, show: true, edit: true },
          position: 6,
        },

        createdAt: {
          isVisible: { list: true, filter: true, show: true, edit: false },
          position: 100,
        },

        updatedAt: {
          isVisible: { list: false, filter: true, show: true, edit: false },
          position: 101,
        },
        promptDefinitionTitle: {
          type: "string",
          isVirtual: true,
          label: "پرامپت",
          isVisible: {
            list: true,
            show: true,
            edit: false,
            filter: false,
          },
        },
      },

      listProperties: [
        "id",
        "promptDefinitionTitle",
        "key",
        "label",
        "sortOrder",
        "isRequired",
        "createdAt",
      ],

      editProperties: [
        "promptDefinitionId",
        "key",
        "label",
        "description",
        "sortOrder",
        "isRequired",
      ],

      showProperties: [
        "id",
        "promptDefinitionTitle",
        "key",
        "label",
        "description",
        "sortOrder",
        "isRequired",
        "createdAt",
        "updatedAt",
      ],

      filterProperties: [
        "id",
        "promptDefinition",
        "key",
        "label",
        "sortOrder",
        "isRequired",
        "createdAt",
        "updatedAt",
      ],

      actions: {
        list: {
          after: async (response) => {
            if (!response.records?.length) {
              return response;
            }

            const promptDefinitionIds = [
              ...new Set(
                response.records
                  .map((record) => record.params.promptDefinition)
                  .filter(Boolean),
              ),
            ];

            const promptDefinitions = await prisma.promptDefinition.findMany({
              where: {
                id: {
                  in: promptDefinitionIds,
                },
              },
              select: {
                id: true,
                title: true,
              },
            });

            const promptMap = Object.fromEntries(
              promptDefinitions.map((item) => [item.id, item.title]),
            );

            response.records.forEach((record) => {
              record.params.promptDefinitionTitle =
                promptMap[record.params.promptDefinition] || "—";
            });

            return response;
          },
        },

        show: {
          after: async (response) => {
            if (!response.record) {
              return response;
            }

            const promptDefinition = await prisma.promptDefinition.findUnique({
              where: {
                id: response.record.params.promptDefinition,
              },
              select: {
                title: true,
              },
            });

            response.record.params.promptDefinitionTitle =
              promptDefinition?.title || "—";

            return response;
          },
        },
        new: {
          handler: async (request, response, context) => {
            const { resource, h, currentAdmin } = context;

            if (request.method !== "post") {
              // فرم خالی
              return {
                record: resource.build({}).toJSON(currentAdmin),
              };
            }

            const payload = { ...(request.payload || {}) };

            delete payload.promptDefinition;

            const promptDefinitionId = payload.promptDefinitionId
              ? String(payload.promptDefinitionId).trim()
              : "";

            const key = payload.key ? String(payload.key).trim() : "";
            const label = payload.label ? String(payload.label).trim() : "";
            const description = payload.description
              ? String(payload.description).trim()
              : null;

            const sortOrder =
              payload.sortOrder !== undefined && payload.sortOrder !== null
                ? Number(payload.sortOrder)
                : null;

            const isRequired =
              typeof payload.isRequired === "boolean"
                ? payload.isRequired
                : payload.isRequired === "true";

            if (!promptDefinitionId) {
              throwFieldValidation(
                "promptDefinitionId",
                "انتخاب پرامپت الزامی است.",
              );
            }

            if (!key) {
              throwFieldValidation("key", "کلید بخش الزامی است.");
            }

            if (!label) {
              throwFieldValidation("label", "عنوان بخش الزامی است.");
            }

            if (sortOrder !== null && Number.isNaN(sortOrder)) {
              throwFieldValidation("sortOrder", "ترتیب باید عدد معتبر باشد.");
            }

            const promptDefinitionExists =
              await prisma.promptDefinition.findUnique({
                where: { id: promptDefinitionId },
              });

            if (!promptDefinitionExists) {
              throwFieldValidation(
                "promptDefinitionId",
                "پرامپت انتخاب‌شده یافت نشد.",
              );
            }

            const data = {
              key,
              label,
              description,
              sortOrder,
              isRequired,
              promptDefinition: {
                connect: { id: promptDefinitionId },
              },
            };

            const created = await prisma.promptSegmentDefinition.create({
              data,
            });

            const record = resource.build(created);

            return {
              record: record.toJSON(currentAdmin),
              redirectUrl: h.recordActionUrl({
                resourceId: resource.id(),
                recordId: created.id,
                actionName: "show",
              }),
              notice: {
                message: "بخش پرامپت با موفقیت ایجاد شد",
                type: "success",
              },
            };
          },
        },

        edit: {
          handler: async (request, response, context) => {
            const { record, resource, h, currentAdmin } = context;

            if (!record) {
              throwRecordNotFound();
            }

            const recordId = record.params.id;

            if (request.method !== "post") {
              return {
                record: record.toJSON(currentAdmin),
              };
            }

            const payload = { ...(request.payload || {}) };

            delete payload.promptDefinition;

            const promptDefinitionId = payload.promptDefinitionId
              ? String(payload.promptDefinitionId).trim()
              : "";

            const key = payload.key ? String(payload.key).trim() : "";
            const label = payload.label ? String(payload.label).trim() : "";
            const description = payload.description
              ? String(payload.description).trim()
              : null;

            const sortOrder =
              payload.sortOrder !== undefined && payload.sortOrder !== null
                ? Number(payload.sortOrder)
                : null;

            const isRequired =
              typeof payload.isRequired === "boolean"
                ? payload.isRequired
                : payload.isRequired === "true";

            if (!promptDefinitionId) {
              throwFieldValidation(
                "promptDefinitionId",
                "انتخاب پرامپت الزامی است.",
              );
            }

            if (!key) {
              throwFieldValidation("key", "کلید بخش الزامی است.");
            }

            if (!label) {
              throwFieldValidation("label", "عنوان بخش الزامی است.");
            }

            if (sortOrder !== null && Number.isNaN(sortOrder)) {
              throwFieldValidation("sortOrder", "ترتیب باید عدد معتبر باشد.");
            }

            const promptDefinitionExists =
              await prisma.promptDefinition.findUnique({
                where: { id: promptDefinitionId },
              });

            if (!promptDefinitionExists) {
              throwFieldValidation(
                "promptDefinitionId",
                "پرامپت انتخاب‌شده یافت نشد.",
              );
            }

            const data = {
              key,
              label,
              description,
              sortOrder,
              isRequired,
              promptDefinition: {
                connect: { id: promptDefinitionId },
              },
            };

            const updated = await prisma.promptSegmentDefinition.update({
              where: { id: recordId },
              data,
            });

            const updatedRecord = resource.build(updated);

            return {
              record: updatedRecord.toJSON(currentAdmin),
              redirectUrl: h.recordActionUrl({
                resourceId: resource.id(),
                recordId,
                actionName: "show",
              }),
              notice: {
                message: "بخش پرامپت با موفقیت ویرایش شد",
                type: "success",
              },
            };
          },
        },
      },
    }),
    prismaResource("PromptVersion", {
      navigation: promptsNavigationHidden,

      titleProperty: "versionKey",

      properties: {
        id: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },

        promptDefinitionId: {
          reference: "PromptDefinition",
          isVisible: {
            list: true,
            filter: false,
            show: true,
            edit: true,
          },
        },

        promptDefinition: {
          reference: "PromptDefinition",
          isVisible: {
            list: false,
            filter: true,
            show: false,
            edit: false,
          },
        },

        versionNumber: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },

        versionKey: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },

        status: {
          isVisible: { list: true, filter: true, show: true, edit: true },
          availableValues: [
            { value: "DRAFT", label: "Draft" },
            { value: "PUBLISHED", label: "Published" },
            { value: "ARCHIVED", label: "Archived" },
          ],
        },

        publishedAt: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },

        createdAt: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },

        updatedAt: {
          isVisible: { list: false, filter: true, show: true, edit: false },
        },
        promptDefinitionTitle: {
          type: "string",
          isVirtual: true,
          label: "پرامپت",
          isVisible: {
            list: true,
            show: true,
            edit: false,
            filter: false,
          },
        },
      },

      listProperties: [
        "id",
        "promptDefinitionTitle",
        "versionNumber",
        "versionKey",
        "status",
        "publishedAt",
        "createdAt",
      ],

      editProperties: [
        "promptDefinitionId",
        "versionNumber",
        "versionKey",
        "status",
        "publishedAt",
      ],

      showProperties: [
        "id",
        "promptDefinitionTitle",
        "versionNumber",
        "versionKey",
        "status",
        "publishedAt",
        "createdAt",
        "updatedAt",
      ],

      filterProperties: [
        "id",
        "promptDefinition",
        "versionNumber",
        "versionKey",
        "status",
        "publishedAt",
        "createdAt",
        "updatedAt",
      ],

      actions: {
        list: {
          after: async (response) => {
            if (!response.records?.length) {
              return response;
            }

            const promptDefinitionIds = [
              ...new Set(
                response.records
                  .map((record) => record.params.promptDefinition)
                  .filter(Boolean),
              ),
            ];

            const promptDefinitions = await prisma.promptDefinition.findMany({
              where: {
                id: {
                  in: promptDefinitionIds,
                },
              },
              select: {
                id: true,
                title: true,
              },
            });

            const promptMap = Object.fromEntries(
              promptDefinitions.map((item) => [item.id, item.title]),
            );

            response.records.forEach((record) => {
              record.params.promptDefinitionTitle =
                promptMap[record.params.promptDefinition] || "—";
            });

            return response;
          },
        },

        show: {
          after: async (response) => {
            if (!response.record) {
              return response;
            }

            const promptDefinition = await prisma.promptDefinition.findUnique({
              where: {
                id: response.record.params.promptDefinition,
              },
              select: {
                title: true,
              },
            });

            response.record.params.promptDefinitionTitle =
              promptDefinition?.title || "—";

            return response;
          },
        },
        new: {
          handler: async (request, response, context) => {
            const { resource, h, currentAdmin } = context;

            if (request.method !== "post") {
              return {
                record: resource.build({}).toJSON(currentAdmin),
              };
            }

            const payload = { ...(request.payload || {}) };

            delete payload.promptDefinition;

            const promptDefinitionId = payload.promptDefinitionId
              ? String(payload.promptDefinitionId).trim()
              : "";

            const versionNumber =
              payload.versionNumber !== undefined &&
              payload.versionNumber !== null
                ? Number(payload.versionNumber)
                : null;

            const versionKey = payload.versionKey
              ? String(payload.versionKey).trim()
              : "";

            const status = payload.status ? String(payload.status).trim() : "";

            let publishedAt =
              payload.publishedAt && String(payload.publishedAt).trim() !== ""
                ? new Date(payload.publishedAt)
                : null;

            if (!promptDefinitionId) {
              throwFieldValidation(
                "promptDefinitionId",
                "انتخاب پرامپت الزامی است.",
              );
            }

            if (versionNumber === null || Number.isNaN(versionNumber)) {
              throwFieldValidation(
                "versionNumber",
                "شماره نسخه الزامی است و باید عدد معتبر باشد.",
              );
            }

            if (!versionKey) {
              throwFieldValidation("versionKey", "کلید نسخه الزامی است.");
            }

            if (!status) {
              throwFieldValidation("status", "وضعیت الزامی است.");
            }

            if (publishedAt && Number.isNaN(publishedAt.getTime())) {
              throwFieldValidation("publishedAt", "تاریخ انتشار معتبر نیست.");
            }

            const promptDefinitionExists =
              await prisma.promptDefinition.findUnique({
                where: { id: promptDefinitionId },
                select: { id: true },
              });

            if (!promptDefinitionExists) {
              throwFieldValidation(
                "promptDefinitionId",
                "پرامپت انتخاب‌شده یافت نشد.",
              );
            }

            if (status === "PUBLISHED" && !publishedAt) {
              publishedAt = new Date();
            }

            const data = {
              versionNumber,
              versionKey,
              status,
              publishedAt,
              promptDefinition: {
                connect: {
                  id: promptDefinitionId,
                },
              },
            };

            const created = await prisma.promptVersion.create({ data });

            const record = resource.build(created);

            return {
              record: record.toJSON(currentAdmin),
              redirectUrl: h.recordActionUrl({
                resourceId: resource.id(),
                recordId: created.id,
                actionName: "show",
              }),
              notice: {
                message: "نسخه پرامپت با موفقیت ایجاد شد",
                type: "success",
              },
            };
          },
        },

        edit: {
          handler: async (request, response, context) => {
            const { record, resource, h, currentAdmin } = context;

            if (!record) {
              throwRecordNotFound();
            }

            const recordId = record.params.id;

            if (request.method !== "post") {
              return {
                record: record.toJSON(currentAdmin),
              };
            }

            const payload = { ...(request.payload || {}) };

            delete payload.promptDefinition;

            const promptDefinitionId = payload.promptDefinitionId
              ? String(payload.promptDefinitionId).trim()
              : "";

            const versionNumber =
              payload.versionNumber !== undefined &&
              payload.versionNumber !== null
                ? Number(payload.versionNumber)
                : null;

            const versionKey = payload.versionKey
              ? String(payload.versionKey).trim()
              : "";

            const status = payload.status ? String(payload.status).trim() : "";

            let publishedAt =
              payload.publishedAt && String(payload.publishedAt).trim() !== ""
                ? new Date(payload.publishedAt)
                : null;

            if (!promptDefinitionId) {
              throwFieldValidation(
                "promptDefinitionId",
                "انتخاب پرامپت الزامی است.",
              );
            }

            if (versionNumber === null || Number.isNaN(versionNumber)) {
              throwFieldValidation(
                "versionNumber",
                "شماره نسخه الزامی است و باید عدد معتبر باشد.",
              );
            }

            if (!versionKey) {
              throwFieldValidation("versionKey", "کلید نسخه الزامی است.");
            }

            if (!status) {
              throwFieldValidation("status", "وضعیت الزامی است.");
            }

            if (publishedAt && Number.isNaN(publishedAt.getTime())) {
              throwFieldValidation("publishedAt", "تاریخ انتشار معتبر نیست.");
            }

            const promptDefinitionExists =
              await prisma.promptDefinition.findUnique({
                where: { id: promptDefinitionId },
                select: { id: true },
              });

            if (!promptDefinitionExists) {
              throwFieldValidation(
                "promptDefinitionId",
                "پرامپت انتخاب‌شده یافت نشد.",
              );
            }

            if (status === "PUBLISHED" && !publishedAt) {
              publishedAt = new Date();
            }

            const data = {
              versionNumber,
              versionKey,
              status,
              publishedAt,
              promptDefinition: {
                connect: {
                  id: promptDefinitionId,
                },
              },
            };

            const updated = await prisma.promptVersion.update({
              where: { id: recordId },
              data,
            });

            const updatedRecord = resource.build(updated);

            return {
              record: updatedRecord.toJSON(currentAdmin),
              redirectUrl: h.recordActionUrl({
                resourceId: resource.id(),
                recordId,
                actionName: "show",
              }),
              notice: {
                message: "نسخه پرامپت با موفقیت ویرایش شد",
                type: "success",
              },
            };
          },
        },
      },
    }),
    prismaResource("PromptVersionSegmentValue", {
      navigation: promptsNavigationHidden,

      properties: {
        id: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },

        promptVersionId: {
          reference: "PromptVersion",
          isVisible: {
            list: true,
            filter: false,
            show: true,
            edit: true,
          },
        },

        promptVersion: {
          reference: "PromptVersion",
          isVisible: {
            list: false,
            filter: true,
            show: false,
            edit: false,
          },
        },

        segmentDefinitionId: {
          reference: "PromptSegmentDefinition",
          isVisible: {
            list: true,
            filter: false,
            show: true,
            edit: true,
          },
        },

        segmentDefinition: {
          reference: "PromptSegmentDefinition",
          isVisible: {
            list: false,
            filter: true,
            show: false,
            edit: false,
          },
        },

        content: {
          type: "textarea",
          isVisible: { list: false, filter: false, show: true, edit: true },
        },

        createdAt: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },

        updatedAt: {
          isVisible: { list: false, filter: true, show: true, edit: false },
        },
        promptVersionTitle: {
          type: "string",
          isVirtual: true,
          label: "نسخه پرامپت",
          isVisible: {
            list: true,
            show: true,
            edit: false,
            filter: false,
          },
        },

        segmentDefinitionTitle: {
          type: "string",
          isVirtual: true,
          label: "بخش پرامپت",
          isVisible: {
            list: true,
            show: true,
            edit: false,
            filter: false,
          },
        },
      },

      listProperties: [
        "id",
        "promptVersionTitle",
        "segmentDefinitionTitle",
        "createdAt",
      ],

      editProperties: ["promptVersionId", "segmentDefinitionId", "content"],

      showProperties: [
        "id",
        "promptVersionTitle",
        "segmentDefinitionTitle",
        "content",
        "createdAt",
        "updatedAt",
      ],

      filterProperties: [
        "id",
        "promptVersion",
        "segmentDefinition",
        "createdAt",
        "updatedAt",
      ],

      actions: {
        list: {
          after: async (response) => {
            if (!response.records?.length) {
              return response;
            }

            const promptVersionIds = [
              ...new Set(
                response.records
                  .map((record) => record.params.promptVersion)
                  .filter(Boolean),
              ),
            ];

            const segmentDefinitionIds = [
              ...new Set(
                response.records
                  .map((record) => record.params.segmentDefinition)
                  .filter(Boolean),
              ),
            ];

            const [promptVersions, segmentDefinitions] = await Promise.all([
              prisma.promptVersion.findMany({
                where: {
                  id: {
                    in: promptVersionIds,
                  },
                },
                select: {
                  id: true,
                  versionKey: true,
                },
              }),

              prisma.promptSegmentDefinition.findMany({
                where: {
                  id: {
                    in: segmentDefinitionIds,
                  },
                },
                select: {
                  id: true,
                  label: true,
                },
              }),
            ]);

            const promptVersionMap = Object.fromEntries(
              promptVersions.map((item) => [item.id, item.versionKey]),
            );

            const segmentDefinitionMap = Object.fromEntries(
              segmentDefinitions.map((item) => [item.id, item.label]),
            );

            response.records.forEach((record) => {
              record.params.promptVersionTitle =
                promptVersionMap[record.params.promptVersion] || "—";

              record.params.segmentDefinitionTitle =
                segmentDefinitionMap[record.params.segmentDefinition] || "—";
            });

            return response;
          },
        },

        show: {
          after: async (response) => {
            if (!response.record) {
              return response;
            }

            const [promptVersion, segmentDefinition] = await Promise.all([
              prisma.promptVersion.findUnique({
                where: {
                  id: response.record.params.promptVersion,
                },
                select: {
                  versionKey: true,
                },
              }),

              prisma.promptSegmentDefinition.findUnique({
                where: {
                  id: response.record.params.segmentDefinition,
                },
                select: {
                  label: true,
                },
              }),
            ]);

            response.record.params.promptVersionTitle =
              promptVersion?.versionKey || "—";

            response.record.params.segmentDefinitionTitle =
              segmentDefinition?.label || "—";

            return response;
          },
        },
        new: {
          handler: async (request, response, context) => {
            const { resource, h, currentAdmin } = context;

            if (request.method !== "post") {
              return {
                record: resource.build({}).toJSON(currentAdmin),
              };
            }

            const payload = { ...(request.payload || {}) };

            delete payload.promptVersion;
            delete payload.segmentDefinition;

            const promptVersionId = payload.promptVersionId
              ? String(payload.promptVersionId).trim()
              : "";

            const segmentDefinitionId = payload.segmentDefinitionId
              ? String(payload.segmentDefinitionId).trim()
              : "";

            const content = payload.content
              ? String(payload.content).trim()
              : "";

            if (!promptVersionId) {
              throwFieldValidation(
                "promptVersionId",
                "انتخاب نسخه پرامپت الزامی است.",
              );
            }

            if (!segmentDefinitionId) {
              throwFieldValidation(
                "segmentDefinitionId",
                "انتخاب بخش پرامپت الزامی است.",
              );
            }

            if (!content) {
              throwFieldValidation("content", "محتوا الزامی است.");
            }

            const [promptVersion, segmentDefinition] = await Promise.all([
              prisma.promptVersion.findUnique({
                where: { id: promptVersionId },
                select: { id: true, promptDefinitionId: true },
              }),
              prisma.promptSegmentDefinition.findUnique({
                where: { id: segmentDefinitionId },
                select: { id: true, promptDefinitionId: true },
              }),
            ]);

            if (!promptVersion) {
              throwFieldValidation(
                "promptVersionId",
                "نسخه پرامپت انتخاب‌شده یافت نشد.",
              );
            }

            if (!segmentDefinition) {
              throwFieldValidation(
                "segmentDefinitionId",
                "بخش پرامپت انتخاب‌شده یافت نشد.",
              );
            }

            if (
              segmentDefinition.promptDefinitionId !==
              promptVersion.promptDefinitionId
            ) {
              throwFieldValidation(
                "segmentDefinitionId",
                "بخش پرامپت متعلق به همان تعریف پرامپت نسخه انتخاب‌شده نیست.",
              );
            }

            const duplicate = await prisma.promptVersionSegmentValue.findUnique(
              {
                where: {
                  promptVersionId_segmentDefinitionId: {
                    promptVersionId,
                    segmentDefinitionId,
                  },
                },
              },
            );

            if (duplicate) {
              throwFieldValidation(
                "segmentDefinitionId",
                "برای این نسخه و بخش قبلاً مقداری ثبت شده است.",
              );
            }

            const created = await prisma.promptVersionSegmentValue.create({
              data: {
                content,
                promptVersion: { connect: { id: promptVersionId } },
                segmentDefinition: { connect: { id: segmentDefinitionId } },
              },
            });

            const record = resource.build(created);

            return {
              record: record.toJSON(currentAdmin),
              redirectUrl: h.recordActionUrl({
                resourceId: resource.id(),
                recordId: created.id,
                actionName: "show",
              }),
              notice: {
                message: "مقدار بخش نسخه پرامپت با موفقیت ایجاد شد",
                type: "success",
              },
            };
          },
        },

        edit: {
          handler: async (request, response, context) => {
            const { record, resource, h, currentAdmin } = context;

            if (!record) {
              throwRecordNotFound();
            }

            const recordId = record.params.id;

            if (request.method !== "post") {
              return {
                record: record.toJSON(currentAdmin),
              };
            }

            const payload = { ...(request.payload || {}) };

            delete payload.promptVersion;
            delete payload.segmentDefinition;

            const promptVersionId = payload.promptVersionId
              ? String(payload.promptVersionId).trim()
              : "";

            const segmentDefinitionId = payload.segmentDefinitionId
              ? String(payload.segmentDefinitionId).trim()
              : "";

            const content = payload.content
              ? String(payload.content).trim()
              : "";

            if (!promptVersionId) {
              throwFieldValidation(
                "promptVersionId",
                "انتخاب نسخه پرامپت الزامی است.",
              );
            }

            if (!segmentDefinitionId) {
              throwFieldValidation(
                "segmentDefinitionId",
                "انتخاب بخش پرامپت الزامی است.",
              );
            }

            if (!content) {
              throwFieldValidation("content", "محتوا الزامی است.");
            }

            const [promptVersion, segmentDefinition, duplicate] =
              await Promise.all([
                prisma.promptVersion.findUnique({
                  where: { id: promptVersionId },
                  select: { id: true, promptDefinitionId: true },
                }),
                prisma.promptSegmentDefinition.findUnique({
                  where: { id: segmentDefinitionId },
                  select: { id: true, promptDefinitionId: true },
                }),
                prisma.promptVersionSegmentValue.findUnique({
                  where: {
                    promptVersionId_segmentDefinitionId: {
                      promptVersionId,
                      segmentDefinitionId,
                    },
                  },
                  select: { id: true },
                }),
              ]);

            if (!promptVersion) {
              throwFieldValidation(
                "promptVersionId",
                "نسخه پرامپت انتخاب‌شده یافت نشد.",
              );
            }

            if (!segmentDefinition) {
              throwFieldValidation(
                "segmentDefinitionId",
                "بخش پرامپت انتخاب‌شده یافت نشد.",
              );
            }

            if (
              segmentDefinition.promptDefinitionId !==
              promptVersion.promptDefinitionId
            ) {
              throwFieldValidation(
                "segmentDefinitionId",
                "بخش پرامپت متعلق به همان تعریف پرامپت نسخه انتخاب‌شده نیست.",
              );
            }

            if (duplicate && duplicate.id !== recordId) {
              throwFieldValidation(
                "segmentDefinitionId",
                "برای این نسخه و بخش قبلاً مقداری ثبت شده است.",
              );
            }

            const updated = await prisma.promptVersionSegmentValue.update({
              where: { id: recordId },
              data: {
                content,
                promptVersion: { connect: { id: promptVersionId } },
                segmentDefinition: { connect: { id: segmentDefinitionId } },
              },
            });

            const updatedRecord = resource.build(updated);

            return {
              record: updatedRecord.toJSON(currentAdmin),
              redirectUrl: h.recordActionUrl({
                resourceId: resource.id(),
                recordId,
                actionName: "show",
              }),
              notice: {
                message: "مقدار بخش نسخه پرامپت با موفقیت ویرایش شد",
                type: "success",
              },
            };
          },
        },
      },
    }),
    prismaResource("AnalysisFormProfileField", {
      navigation: analysisFormsNavigation,

      properties: {
        id: {
          isTitle: true,
        },

        form: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: true,
          },
        },

        profileFieldKey: {
          availableValues: COMPANY_PROFILE_FIELD_OPTIONS,
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: true,
          },
        },

        profileFieldKeys: {
          type: "string",
          isVirtual: true,
          isArray: true,
          availableValues: COMPANY_PROFILE_FIELD_OPTIONS,
          isRequired: true,
          isVisible: {
            list: false,
            filter: false,
            show: false,
            edit: true,
          },
          components: {
            edit: Components.ProfileFieldKeyMultiSelect,
          },
        },

        isArray: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: true,
          },
        },

        createdAt: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: false,
          },
        },
      },

      listProperties: ["id", "form", "profileFieldKey", "isArray", "createdAt"],

      filterProperties: ["form", "profileFieldKey", "isArray", "createdAt"],

      showProperties: ["id", "form", "profileFieldKey", "isArray", "createdAt"],

      newProperties: ["form", "profileFieldKeys", "isArray"],
      editProperties: ["form", "profileFieldKey", "isArray"],

      actions: {
        new: {
          layout: ["form", "profileFieldKeys", "isArray"],
          handler: buildBulkCreateAnalysisFormProfileFieldHandler(),
        },

        edit: {
          before: async (request, context) => {
            validateAdminProfileFieldPayload(request);
            await assertUniqueAnalysisFormProfileField(
              request,
              context.record?.params?.id,
            );
            return request;
          },
          handler: withAdminDuplicateProfileFieldError(
            DUPLICATE_ANALYSIS_FORM_PROFILE_FIELD_MESSAGE,
            actions.edit.handler,
          ),
        },
      },
    }),
    prismaResource("MultiAnalysisFormProfileField", {
      navigation: analysisFormsNavigation,

      properties: {
        id: {
          isTitle: true,
        },

        multiAnalysisForm: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: true,
          },
        },

        profileFieldKey: {
          availableValues: COMPANY_PROFILE_FIELD_OPTIONS,
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: true,
          },
        },

        profileFieldKeys: {
          type: "string",
          isVirtual: true,
          isArray: true,
          availableValues: COMPANY_PROFILE_FIELD_OPTIONS,
          isRequired: true,
          isVisible: {
            list: false,
            filter: false,
            show: false,
            edit: true,
          },
          components: {
            edit: Components.ProfileFieldKeyMultiSelect,
          },
        },

        isArray: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: true,
          },
        },

        createdAt: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: false,
          },
        },
      },

      listProperties: [
        "id",
        "multiAnalysisForm",
        "profileFieldKey",
        "isArray",
        "createdAt",
      ],

      filterProperties: [
        "multiAnalysisForm",
        "profileFieldKey",
        "isArray",
        "createdAt",
      ],

      showProperties: [
        "id",
        "multiAnalysisForm",
        "profileFieldKey",
        "isArray",
        "createdAt",
      ],

      newProperties: ["multiAnalysisForm", "profileFieldKeys", "isArray"],
      editProperties: ["multiAnalysisForm", "profileFieldKey", "isArray"],

      actions: {
        new: {
          layout: ["multiAnalysisForm", "profileFieldKeys", "isArray"],
          handler: buildBulkCreateMultiAnalysisFormProfileFieldHandler(),
        },

        edit: {
          before: async (request, context) => {
            validateAdminProfileFieldPayload(request);
            await assertUniqueMultiAnalysisFormProfileField(
              request,
              context.record?.params?.id,
            );
            return request;
          },
          handler: withAdminDuplicateProfileFieldError(
            DUPLICATE_MULTI_ANALYSIS_FORM_PROFILE_FIELD_MESSAGE,
            actions.edit.handler,
          ),
        },
      },
    }),
    prismaResource("StrategyPlan", {
      navigation: strategyNavigation,
      properties: {
        id: { isTitle: true },
        project: { reference: "Project", label: "پروژه" },
        company: { reference: "Company", label: "شرکت" },
        framework: {
          availableValues: strategyFrameworkValues,
          label: "چارچوب",
        },
        status: { availableValues: strategyStatusValues, label: "وضعیت" },
        state: { availableValues: strategyStateValues, label: "مرحله" },
        strategyText: { type: "textarea", label: "متن استراتژی" },
        companyProfile: { type: "mixed", label: "پروفایل شرکت" },
      },
      listProperties: [
        "id",
        "project",
        "company",
        "framework",
        "status",
        "state",
        "createdAt",
      ],
      showProperties: [
        "id",
        "project",
        "company",
        "framework",
        "status",
        "state",
        "strategyText",
        "companyProfile",
        "createdAt",
        "updatedAt",
      ],
      editProperties: [
        "project",
        "company",
        "framework",
        "status",
        "state",
        "strategyText",
        "companyProfile",
      ],
      filterProperties: ["project", "company", "framework", "status", "state"],
    }),
    prismaResource("StrategyMap", {
      navigation: strategyNavigation,
      properties: {
        id: { isTitle: true },
        strategyPlan: { reference: "StrategyPlan", label: "برنامه استراتژی" },
        version: { label: "نسخه" },
        status: { availableValues: strategyMapStatusValues, label: "وضعیت" },
        initialData: { type: "mixed", label: "داده اولیه AI" },
        editedData: { type: "mixed", label: "داده ویرایش‌شده" },
        finalData: { type: "mixed", label: "داده نهایی" },
        approvedBy: { reference: "User", label: "تأییدکننده" },
      },
      listProperties: ["id", "strategyPlan", "version", "status", "approvedAt"],
      showProperties: [
        "id",
        "strategyPlan",
        "version",
        "status",
        "initialData",
        "editedData",
        "finalData",
        "approvedAt",
        "approvedBy",
        "createdAt",
        "updatedAt",
      ],
      editProperties: [
        "strategyPlan",
        "version",
        "status",
        "initialData",
        "editedData",
        "finalData",
        "approvedAt",
        "approvedBy",
      ],
      filterProperties: ["strategyPlan", "status", "approvedAt"],
    }),
    prismaResource("StrategyObjective", {
      navigation: strategyNavigation,
      properties: {
        title: { isTitle: true, label: "عنوان" },
        strategyPlan: { reference: "StrategyPlan", label: "برنامه استراتژی" },
        map: { reference: "StrategyMap", label: "نقشه" },
        parent: { reference: "StrategyObjective", label: "هدف والد" },
        description: { type: "textarea", label: "توضیحات" },
        perspective: { availableValues: bscPerspectiveValues, label: "منظر" },
        learningGrowthCategory: {
          availableValues: learningGrowthCategoryValues,
          label: "دسته یادگیری و رشد",
        },
      },
      listProperties: [
        "id",
        "strategyPlan",
        "title",
        "perspective",
        "sortOrder",
        "createdAt",
      ],
      showProperties: [
        "id",
        "strategyPlan",
        "map",
        "code",
        "title",
        "description",
        "perspective",
        "learningGrowthCategory",
        "priority",
        "sortOrder",
        "parent",
        "createdAt",
        "updatedAt",
      ],
      editProperties: [
        "strategyPlan",
        "map",
        "code",
        "title",
        "description",
        "perspective",
        "learningGrowthCategory",
        "priority",
        "sortOrder",
        "parent",
      ],
      filterProperties: ["strategyPlan", "map", "perspective", "parent"],
    }),
    prismaResource("StrategyObjectiveRelation", {
      navigation: strategyNavigation,
      properties: {
        fromObjective: {
          reference: "StrategyObjective",
          label: "هدف مبدأ",
        },
        toObjective: {
          reference: "StrategyObjective",
          label: "هدف مقصد",
        },
      },
      listProperties: ["id", "fromObjective", "toObjective", "createdAt"],
      showProperties: ["id", "fromObjective", "toObjective", "createdAt"],
      editProperties: ["fromObjective", "toObjective"],
      filterProperties: ["fromObjective", "toObjective", "createdAt"],
    }),
    prismaResource("StrategyMeasure", {
      navigation: strategyNavigation,
      properties: {
        name: { isTitle: true, label: "نام سنجه" },
        strategyPlan: { reference: "StrategyPlan", label: "برنامه استراتژی" },
        objective: { reference: "StrategyObjective", label: "هدف" },
        description: { type: "textarea", label: "توضیحات" },
        formula: { type: "textarea", label: "فرمول" },
        frequency: {
          availableValues: measurementFrequencyValues,
          label: "دوره اندازه‌گیری",
        },
        desirability: {
          availableValues: measureDesirabilityValues,
          label: "مطلوبیت",
        },
        status: {
          availableValues: strategyMeasureStatusValues,
          label: "وضعیت",
        },
        monitoringStatus: {
          availableValues: strategyMonitoringStatusValues,
          label: "وضعیت پایش",
        },
        owner: { reference: "User", label: "مالک" },
        approvedBy: { reference: "User", label: "تأییدکننده" },
      },
      listProperties: [
        "id",
        "strategyPlan",
        "name",
        "status",
        "frequency",
        "desirability",
        "monitoringStatus",
      ],
      showProperties: [
        "id",
        "strategyPlan",
        "objective",
        "name",
        "description",
        "unit",
        "frequency",
        "baseline",
        "finalTarget",
        "formula",
        "desirability",
        "monitoringStartDate",
        "monitoringDurationMonths",
        "monitoringStatus",
        "owner",
        "status",
        "approvedAt",
        "approvedBy",
        "createdAt",
        "updatedAt",
      ],
      editProperties: [
        "strategyPlan",
        "objective",
        "name",
        "description",
        "unit",
        "frequency",
        "baseline",
        "finalTarget",
        "formula",
        "desirability",
        "monitoringStartDate",
        "monitoringDurationMonths",
        "monitoringStatus",
        "owner",
        "status",
        "approvedAt",
        "approvedBy",
      ],
      filterProperties: ["strategyPlan", "objective", "status", "owner"],
    }),
    prismaResource("StrategyMeasureTarget", {
      navigation: strategyNavigation,
      properties: {
        measure: { reference: "StrategyMeasure", label: "سنجه" },
        periodLabel: { label: "برچسب دوره" },
      },
      listProperties: [
        "id",
        "measure",
        "periodStart",
        "periodEnd",
        "targetValue",
      ],
      showProperties: [
        "id",
        "measure",
        "periodStart",
        "periodEnd",
        "periodLabel",
        "targetValue",
        "createdAt",
        "updatedAt",
      ],
      editProperties: [
        "measure",
        "periodStart",
        "periodEnd",
        "periodLabel",
        "targetValue",
      ],
      filterProperties: ["measure", "periodStart", "periodEnd"],
    }),
    prismaResource("StrategyMeasureMeasurement", {
      navigation: strategyNavigation,
      properties: {
        measure: { reference: "StrategyMeasure", label: "سنجه" },
        note: { type: "textarea", label: "یادداشت" },
        submittedBy: { reference: "User", label: "ثبت‌کننده" },
      },
      listProperties: [
        "id",
        "measure",
        "periodStart",
        "periodEnd",
        "actualValue",
        "submittedAt",
      ],
      showProperties: [
        "id",
        "measure",
        "periodStart",
        "periodEnd",
        "actualValue",
        "note",
        "submittedBy",
        "submittedAt",
        "createdAt",
        "updatedAt",
      ],
      editProperties: [
        "measure",
        "periodStart",
        "periodEnd",
        "actualValue",
        "note",
        "submittedBy",
      ],
      filterProperties: ["measure", "submittedBy", "periodStart", "periodEnd"],
    }),
    prismaResource("StrategyAiRun", {
      navigation: strategyNavigation,
      properties: {
        strategyPlan: { reference: "StrategyPlan", label: "برنامه استراتژی" },
        framework: {
          availableValues: strategyFrameworkValues,
          label: "چارچوب",
        },
        state: { availableValues: strategyStateValues, label: "مرحله" },
        requestPayload: { type: "mixed", label: "درخواست" },
        responsePayload: { type: "mixed", label: "پاسخ" },
        errorMessage: { type: "textarea", label: "پیام خطا" },
      },
      listProperties: [
        "id",
        "strategyPlan",
        "framework",
        "state",
        "success",
        "startedAt",
      ],
      showProperties: [
        "id",
        "strategyPlan",
        "framework",
        "state",
        "requestPayload",
        "responsePayload",
        "success",
        "errorMessage",
        "startedAt",
        "finishedAt",
        "createdAt",
      ],
      editProperties: [
        "strategyPlan",
        "framework",
        "state",
        "requestPayload",
        "responsePayload",
        "success",
        "errorMessage",
        "startedAt",
        "finishedAt",
      ],
      filterProperties: ["strategyPlan", "framework", "state", "success"],
    }),
    prismaResource("StrategyApproval", {
      navigation: strategyNavigation,
      properties: {
        strategyPlan: { reference: "StrategyPlan", label: "برنامه استراتژی" },
        type: { availableValues: strategyApprovalTypeValues, label: "نوع" },
        version: { label: "نسخه" },
      },
      listProperties: ["id", "strategyPlan", "type", "version", "approvedAt"],
      showProperties: [
        "id",
        "strategyPlan",
        "type",
        "version",
        "approvedAt",
        "createdAt",
      ],
      editProperties: ["strategyPlan", "type", "version", "approvedAt"],
      filterProperties: ["strategyPlan", "type", "approvedAt"],
    }),
    prismaResource("ProjectPlan", {
      navigation: {
        name: "پروژه‌ها",
        icon: "Folder",
      },
      properties: {
        project: { reference: "Project", label: "پروژه", isTitle: true },
        status: { availableValues: projectPlanStatusValues, label: "وضعیت" },
      },
      listProperties: ["id", "project", "status", "lockedAt", "createdAt"],
      showProperties: [
        "id",
        "project",
        "status",
        "lockedAt",
        "createdAt",
        "updatedAt",
      ],
      editProperties: ["project", "status", "lockedAt"],
      filterProperties: ["project", "status", "lockedAt"],
    }),
    prismaResource("ProjectPlanAction", {
      navigation: {
        name: "پروژه‌ها",
        icon: "Folder",
      },
      properties: {
        title: { isTitle: true, type: "textarea", label: "عنوان" },
        plan: {
          reference: "ProjectPlan",
          label: "برنامه پروژه",
          isVisible: {
            list: false,
            filter: false,
            show: true,
            edit: true,
          },
        },
        project: {
          reference: "Project",
          label: "پروژه",
          isVirtual: true,
          isVisible: {
            list: true,
            filter: true,
            show: false,
            edit: false,
          },
        },
        description: { type: "textarea", label: "توضیحات" },
        executor: { reference: "User", label: "مجری" },
        prerequisiteAction: {
          reference: "ProjectPlanAction",
          label: "اقدام پیش‌نیاز",
        },
        status: {
          availableValues: projectPlanActionStatusValues,
          label: "وضعیت",
        },
      },
      listProperties: [
        "id",
        "project",
        "title",
        "status",
        "progress",
        "executor",
        "startDate",
        "endDate",
      ],
      showProperties: [
        "id",
        "plan",
        "title",
        "description",
        "startDate",
        "endDate",
        "executor",
        "progress",
        "status",
        "completedAt",
        "order",
        "prerequisiteAction",
        "createdAt",
        "updatedAt",
      ],
      editProperties: [
        "plan",
        "title",
        "description",
        "startDate",
        "endDate",
        "executor",
        "progress",
        "status",
        "completedAt",
        "order",
        "prerequisiteAction",
      ],
      filterProperties: ["project", "executor", "status", "startDate", "endDate"],
      actions: {
        list: {
          before: applyProjectPlanActionProjectFilter,
          after: async (response) => {
            await enrichProjectPlanActionRecordsWithProject(
              response.records ?? [],
            );
            return response;
          },
        },
      },
    }),
  ],
  });
}

const authenticate = async (emailOrUsername, password) => {
  const loginId = String(emailOrUsername ?? "").trim();
  const plainPassword = String(password ?? "");

  if (!loginId || !plainPassword) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[admin login] missing email/username or password in form");
    }
    return null;
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: loginId }, { username: loginId }],
      role: "SUPER_ADMIN",
    },
    select: {
      id: true,
      email: true,
      username: true,
      password: true,
      role: true,
    },
  });

  if (!user) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[admin login] no SUPER_ADMIN for:", loginId);
    }
    return null;
  }

  const isValid = await bcrypt.compare(plainPassword, user.password);

  if (!isValid) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[admin login] invalid password for:", user.username);
    }
    return null;
  }

  return {
    id: user.id,
    email: user.email || user.username,
    title: user.username,
    role: user.role,
  };
};

const start = async () => {
  await createAdmin();
  await admin.initialize();
  if (process.env.NODE_ENV !== "production") {
    await admin.watch();
  }
  const router = AdminJSExpress.buildAuthenticatedRouter(
    admin,
    {
      authenticate,
      cookieName: "strategy_proposal_admin",
      cookiePassword: ADMIN_COOKIE_SECRET,
    },
    null,
    {
      // @adminjs/express overwrites `secret` with auth.cookiePassword at runtime.
      secret: ADMIN_COOKIE_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 8,
        path: ADMIN_ROOT_PATH,
      },
    },
    {
      uploadDir: ADMIN_UPLOAD_TMP,
    },
  );

  app.use(admin.options.rootPath, router);

  app.get("/", (req, res) => {
    res.redirect(admin.options.rootPath);
  });

  app.listen(PORT, () => {
    console.log(
      `AdminJS is running on http://localhost:${PORT}${ADMIN_ROOT_PATH}`,
    );
  });
};

start().catch(async (error) => {
  console.error("AdminJS startup error:", error);
  await prisma.$disconnect();
  process.exit(1);
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
