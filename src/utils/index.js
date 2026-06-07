const prisma = require("../prismaClient");
const path = require("path");
const fs = require("fs/promises");
const { parseProfileFieldKey } = require("../profileFieldKey.mjs");

const MODEL_TO_COMPANY_KEY = {
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

const createBadRequestError = (message, statusCode) => {
  const err = new Error(message);
  err.statusCode = statusCode || 400;
  throw err;
};

const buildProjectAccessWhere = async ({
  userId,
  userRole,
  companyId,
  targetUserId,
}) => {
  let whereClause = {};

  if (userRole === "SUPER_ADMIN") {
    if (targetUserId) {
      whereClause.creatorId = targetUserId;
    }
  } else if (userRole === "COMPANY") {
    if (targetUserId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { companyId: true },
      });

      if (!targetUser || targetUser.companyId !== companyId) {
        throw createBadRequestError(
          "دسترسی غیرمجاز: شما فقط می‌توانید پروژه‌های اعضای شرکت خود را مشاهده کنید.",
          401,
        );
      }

      whereClause.creatorId = targetUserId;
    } else {
      whereClause.companyId = companyId;
    }
  } else if (userRole === "MEMBER") {
    const accessCondition = {
      accesses: {
        some: {
          userId,
        },
      },
    };

    if (targetUserId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { companyId: true },
      });

      if (!targetUser || targetUser.companyId !== companyId) {
        throw createBadRequestError("دسترسی غیرمجاز.", 401);
      }

      whereClause.creatorId = targetUserId;
    } else {
      whereClause = {
        OR: [{ creatorId: userId }, accessCondition],
      };
    }
  }

  return whereClause;
};

const deletePhysicalFiles = async (files = []) => {
  if (!Array.isArray(files) || files.length === 0) return;

  await Promise.allSettled(
    files.map(async (file) => {
      const filePath =
        typeof file === "string" ? file : file?.path || file?.filePath;

      if (!filePath) return;

      try {
        await fs.unlink(filePath);
      } catch (error) {
        if (error.code !== "ENOENT") {
          console.error("Failed to delete file:", filePath, error);
        }
      }
    }),
  );
};

const isUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

const isEmpty = (value) =>
  value === undefined || value === null || value === "";

//////////

const normalizeProfileFields = (profileFields = []) => {
  return profileFields
    .map((item) => {
      if (item?.profileFieldKey) {
        const parsed = parseProfileFieldKey(item.profileFieldKey);
        if (!parsed) return null;

        return {
          ...item,
          model: parsed.model,
          fieldName: parsed.fieldName,
        };
      }

      if (item?.model && item?.fieldName) {
        return item;
      }

      return null;
    })
    .filter(Boolean);
};

const buildSelectedCompanyProfile = (company, profileFields = []) => {
  if (!company || !profileFields.length) return {};

  const normalizedProfileFields = normalizeProfileFields(profileFields);

  const grouped = normalizedProfileFields.reduce((acc, item) => {
    if (!item?.model || !item?.fieldName) return acc;

    if (!acc[item.model]) acc[item.model] = [];

    if (!acc[item.model].includes(item.fieldName)) {
      acc[item.model].push(item.fieldName);
    }

    return acc;
  }, {});

  const result = {};

  for (const [model, fields] of Object.entries(grouped)) {
    const companyKey = MODEL_TO_COMPANY_KEY[model];
    if (!companyKey) continue;

    const source = company[companyKey];
    if (!source) continue;

    if (Array.isArray(source)) {
      result[model] = source.map((row) => {
        const picked = {};
        for (const field of fields) {
          picked[field] = row?.[field] ?? null;
        }
        return picked;
      });
    } else {
      const picked = {};
      for (const field of fields) {
        picked[field] = source?.[field] ?? null;
      }
      result[model] = picked;
    }
  }

  return result;
};

const getModelsFromProfileFields = (profileFields = []) => {
  const normalizedProfileFields = normalizeProfileFields(profileFields);

  return [
    ...new Set(
      normalizedProfileFields.map((item) => item.model).filter(Boolean),
    ),
  ];
};

const getCompanyProfileDataForForm = async (companyId, profileFields = []) => {
  if (!companyId) {
    return {
      companyProfile: {},
      companyAdminData: null,
    };
  }

  const models = getModelsFromProfileFields(profileFields);

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      companyAdminData: true,
      basicInfo: models.includes("COMPANY_BASIC_INFO"),
      managers: models.includes("COMPANY_MANAGER"),
      revenueCenters: models.includes("REVENUE_CENTER"),
      shareholders: models.includes("COMPANY_SHAREHOLDER"),
      organizationUnits: models.includes("ORGANIZATION_UNIT"),
      licenseCertificates: models.includes("COMPANY_LICENSE_CERTIFICATE"),
      memberships: models.includes("COMPANY_MEMBERSHIP"),
      productServices: models.includes("COMPANY_PRODUCT_SERVICE"),
      markets: models.includes("COMPANY_MARKET"),
      keyCustomers: models.includes("KEY_CUSTOMER"),
      balanceSheets: models.includes("COMPANY_BALANCE_SHEET"),
      incomeStatements: models.includes("COMPANY_INCOME_STATEMENT"),
      resourceCapabilities: models.includes("COMPANY_RESOURCE_CAPABILITY"),
    },
  });

  if (!company) {
    return {
      companyProfile: {},
      companyAdminData: null,
    };
  }

  return {
    companyProfile: buildSelectedCompanyProfile(company, profileFields),
    companyAdminData: company.companyAdminData?.data || null,
  };
};

const resolveNextProjectStep = ({ currentStatus, userInput }) => {
  const lowerInput = userInput?.toLowerCase().trim() || "";

  let nextStatus = currentStatus;
  let transitionReason = null;

  switch (currentStatus) {
    case "ANALYSIS_PENDING":
      nextStatus = "REVIEWING";
      transitionReason = "INITIAL_ANALYSIS_GENERATED";
      break;

    case "REVIEWING": {
      const isApproved = [
        "خوب",
        "تایید",
        "تأیید",
        "بله",
        "ادامه",
        "ok",
        "yes",
        "approve",
        "approved",
        "تایید میکنم",
        "تایید می‌کنم",
        "اوکی",
      ].some((k) => lowerInput.includes(k));

      const isRejected = [
        "رد",
        "نه",
        "کافی نبود",
        "اشتباه",
        "خوب نیست",
        "no",
        "reject",
        "rejected",
        "wrong",
        "نمی‌خوام",
        "نمیخوام",
      ].some((k) => lowerInput.includes(k));

      if (isApproved) {
        nextStatus = "FINAL_ANALYSIS";
        transitionReason = "INITIAL_ANALYSIS_APPROVED";
      } else if (isRejected) {
        nextStatus = "CHAT_MODE";
        transitionReason = "INITIAL_ANALYSIS_REJECTED";
      } else {
        nextStatus = "REVIEWING";
        transitionReason = "WAITING_FOR_REVIEW_DECISION";
      }

      break;
    }

    case "CHAT_MODE": {
      if (lowerInput) {
        nextStatus = "FINAL_ANALYSIS";
        transitionReason = "USER_CORRECTION_SUBMITTED";
      } else {
        nextStatus = "CHAT_MODE";
        transitionReason = "WAITING_FOR_USER_CORRECTION";
      }

      break;
    }

    case "FINAL_ANALYSIS":
      nextStatus = "FINAL_ANALYSIS";
      transitionReason = "FINAL_ANALYSIS_ALREADY_GENERATED";
      break;

    default:
      nextStatus = currentStatus;
      transitionReason = "UNKNOWN_STATUS";
      break;
  }

  return {
    nextStatus,
    transitionReason,
  };
};

const getPublishedPromptContentsForAnalysisForm = async (formId) => {
  const promptDefinition = await prisma.promptDefinition.findFirst({
    where: {
      ownerType: "ANALYSIS_FORM",
      analysisFormId: formId,
    },
    include: {
      versions: {
        where: {
          status: "PUBLISHED",
        },
        orderBy: {
          versionNumber: "desc",
        },
        take: 1,
        include: {
          values: {
            include: {
              segmentDefinition: true,
            },
          },
        },
      },
    },
  });

  const publishedVersion = promptDefinition?.versions?.[0];

  if (!publishedVersion) {
    return {};
  }

  return publishedVersion.values.reduce((acc, item) => {
    if (!item.content) return acc;

    const key = item.segmentDefinition.key;
    acc[key] = item.content;

    return acc;
  }, {});
};

const getPublishedPromptContentsForMultiAnalysisForm = async (
  multiAnalysisFormId,
) => {
  const promptDefinition = await prisma.promptDefinition.findFirst({
    where: {
      ownerType: "MULTI_ANALYSIS_FORM",
      multiAnalysisFormId,
    },
    include: {
      versions: {
        where: {
          status: "PUBLISHED",
        },
        orderBy: {
          versionNumber: "desc",
        },
        take: 1,
        include: {
          values: {
            include: {
              segmentDefinition: true,
            },
          },
        },
      },
    },
  });

  const publishedVersion = promptDefinition?.versions?.[0];

  if (!publishedVersion) {
    return {};
  }

  return publishedVersion.values.reduce((acc, item) => {
    if (!item.content) return acc;

    const key = item.segmentDefinition.key;
    acc[key] = item.content;

    return acc;
  }, {});
};

const buildInitialAnalysisPrompt = ({
  formPrompts,
  companyProfileData,
  readableFormResponses,
  selectedGoals,
  domain,
  temperature,
}) => {
  const promptObject = {
    Recipes: formPrompts,

    temperature: temperature ?? 0.7,

    "company information": companyProfileData?.companyProfile || {},

    "Additional company information":
      companyProfileData?.companyAdminData || {},

    "Selected goals": Array.isArray(selectedGoals) ? selectedGoals : [],
    domain: domain || "",

    "Form responses": readableFormResponses || {},
  };

  return JSON.stringify(promptObject, null, 2);
};

const buildInitialMultiAnalysisPrompt = ({
  formPrompts,
  selectedGoals,
  companyProfileData,
  sourceProjectSummaries,
  domain,
  temperature,
}) => {
  const promptObject = {
    Recipes: formPrompts,

    temperature: temperature ?? 0.7,

    "company information": companyProfileData?.companyProfile || {},

    "Additional company information":
      companyProfileData?.companyAdminData || {},

    "Selected goals": Array.isArray(selectedGoals) ? selectedGoals : [],
    domain: domain || "",

    Summaries: Array.isArray(sourceProjectSummaries)
      ? sourceProjectSummaries
      : [],
  };

  return JSON.stringify(promptObject, null, 2);
};

const buildFinalAnalysisPrompt = ({ initialAnalysis }) => {
  const promptObject = {
    "User Accecpt": true || "",
    "Problem and Assumptions": initialAnalysis,
  };

  return JSON.stringify(promptObject, null, 2);
};

const buildFinalAnalysisWithCorrectionPrompt = ({
  userCorrection,
  initialAnalysis,
}) => {
  const promptObject = {
    "User Clarification": userCorrection || "",
    "Problem and Assumptions": initialAnalysis,
  };

  return JSON.stringify(promptObject, null, 2);
};

const buildReadableFormResponses = async ({ formId, formResponses }) => {
  if (!formId || !formResponses || Object.keys(formResponses).length === 0) {
    return {};
  }

  const formQuestions = await prisma.formQuestion.findMany({
    where: {
      formId,
    },
    select: {
      id: true,
      label: true,
    },
  });

  const idToLabelMap = {};

  formQuestions.forEach((question) => {
    idToLabelMap[question.id] = question.label;
  });

  return Object.keys(formResponses).reduce((acc, key) => {
    acc[idToLabelMap[key] || key] = formResponses[key];
    return acc;
  }, {});
};

const parseFinalAnalysisResponse = (aiResponse) => {
  const toText = (value) => {
    if (value === null || value === undefined) return "";

    if (typeof value === "string") return value.trim();

    return JSON.stringify(value, null, 2);
  };

  const extractJsonText = (text) => {
    if (!text || typeof text !== "string") return "";

    let cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const firstBraceIndex = cleaned.indexOf("{");
    const lastBraceIndex = cleaned.lastIndexOf("}");

    if (
      firstBraceIndex !== -1 &&
      lastBraceIndex !== -1 &&
      lastBraceIndex > firstBraceIndex
    ) {
      cleaned = cleaned.slice(firstBraceIndex, lastBraceIndex + 1);
    }

    return cleaned;
  };

  try {
    const jsonText = extractJsonText(aiResponse);
    const parsed = JSON.parse(jsonText);

    return {
      riskAnalysis: toText(
        parsed.riskAnalysis ??
          parsed.risk_analysis ??
          parsed.risk ??
          parsed.risks ??
          "",
      ),
      finalAnalysis: toText(
        parsed.finalAnalysis ??
          parsed.final_analysis ??
          parsed.analysis ??
          parsed.final ??
          "",
      ),
      summary: toText(
        parsed.summary ??
          parsed.summaryAnalysis ??
          parsed.summary_analysis ??
          parsed.executiveSummary ??
          parsed.executive_summary ??
          "",
      ),
    };
  } catch (error) {
    return {
      riskAnalysis: "",
      finalAnalysis: toText(aiResponse),
      summary: "",
    };
  }
};

const buildSelectedSourceProjectSummaries = (selectedSourceProjects) => {
  return (selectedSourceProjects || [])
    .map((item) => {
      const title = item?.form?.title;
      const summary = item?.sourceProject?.summaryAnalysis;

      if (!title || !summary?.trim()) return null;

      return `${title}:\n${summary.trim()}`;
    })
    .filter(Boolean)
    .join("\n\n");
};

module.exports = {
  createBadRequestError,
  buildProjectAccessWhere,
  resolveNextProjectStep,
  getPublishedPromptContentsForAnalysisForm,
  getPublishedPromptContentsForMultiAnalysisForm,
  isUuid,
  isEmpty,
  deletePhysicalFiles,
  getCompanyProfileDataForForm,
  buildInitialAnalysisPrompt,
  buildFinalAnalysisPrompt,
  buildFinalAnalysisWithCorrectionPrompt,
  buildReadableFormResponses,
  parseFinalAnalysisResponse,
  buildInitialMultiAnalysisPrompt,
  buildSelectedSourceProjectSummaries,
};
