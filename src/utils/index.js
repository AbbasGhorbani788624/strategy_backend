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

const resolveNextProjectStep = ({ currentStatus }) => {
  let nextStatus = currentStatus;
  let transitionReason = null;

  switch (currentStatus) {
    case "ANALYSIS_PENDING":
      nextStatus = "REVIEWING";
      transitionReason = "INITIAL_ANALYSIS_GENERATED";
      break;

    case "REVIEWING":
      nextStatus = "FINAL_ANALYSIS";
      transitionReason = "INITIAL_ANALYSIS_APPROVED";
      break;

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

const buildRecipeSteps = (promptSegments, startStep = 1) => {
  if (!Array.isArray(promptSegments) || !promptSegments.length) return [];

  const steps = promptSegments.reduce((result, segment, index) => {
    result[`step${startStep + index}`] = segment?.content || "";
    return result;
  }, {});

  return [steps];
};

const buildInitialAnalysisPrompt = ({
  promptSegments,
  title,
  companyProfileData,
  readableFormResponses,
  selectedGoals,
  domain,
  temperature,
}) => {
  const promptObject = {
    Recipes: buildRecipeSteps(promptSegments, 1),
    "Analysis title": title,
    temperature: temperature ?? 0.7,
    "company information": companyProfileData?.companyProfile || {},
    "Additional company information":
      companyProfileData?.companyAdminData?.text || "",
    "Selected goals": Array.isArray(selectedGoals) ? selectedGoals : [],
    "User Clarification": "",
    domain: domain || "",
    "Form responses": readableFormResponses || {},
  };

  return JSON.stringify(promptObject, null, 2);
};

const buildInitialMultiAnalysisPrompt = ({
  promptSegments,
  title,
  selectedGoals,
  companyProfileData,
  sourceProjectSummaries,
  domain,
  temperature,
}) => {
  const promptObject = {
    Recipes: buildRecipeSteps(promptSegments, 1),
    "Analysis title": title,
    temperature: temperature ?? 0.7,
    "Selected goals": Array.isArray(selectedGoals) ? selectedGoals : [],
    "User Clarification": "",
    domain: domain || "",
    Summaries: sourceProjectSummaries || {},
  };

  return JSON.stringify(promptObject, null, 2);
};

const buildFinalAnalysisPrompt = ({
  promptSegments,
  initialAnalysis,
  title,
  temperature,
}) => {
  const promptObject = {
    "Analysis title": title,
    Recipes: buildRecipeSteps(promptSegments, 2),
    initialAnalysis: initialAnalysis || "",
    temperature,
  };

  return JSON.stringify(promptObject, null, 2);
};

const buildFinalAnalysisWithCorrectionPrompt = ({
  promptSegments,
  title,
  mode,
  userCorrection,
  temperature,
  companyProfileData,
  selectedGoals,
  domain,
  readableFormResponses,
  sourceProjectSummaries,
}) => {
  const promptObject = {
    Recipes: buildRecipeSteps(promptSegments, 1),
    "Analysis title": title || "",
    "User Clarification": userCorrection || "",
    temperature: temperature ?? 0.7,
    "company information": companyProfileData?.companyProfile || {},
    "Additional company information":
      companyProfileData?.companyAdminData?.text || "",
    "Selected goals": Array.isArray(selectedGoals) ? selectedGoals : [],
    domain: domain || "",
  };

  if (mode === "MULTI") {
    promptObject.Summaries = sourceProjectSummaries || {};
  }

  if (mode === "SINGLE") {
    promptObject["Form responses"] = readableFormResponses || {};
  }

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

    const finalAnalysis = toText(
      parsed.finalAnalysis ??
        parsed.final_analysis ??
        parsed.analysis ??
        parsed.final ??
        aiResponse ??
        "",
    );

    const riskAnalysis = toText(
      parsed.riskAnalysis ??
        parsed.risk_analysis ??
        parsed.risk ??
        parsed.risks ??
        finalAnalysis,
    );

    const summary = toText(
      parsed.summary ??
        parsed.summaryAnalysis ??
        parsed.summary_analysis ??
        parsed.executiveSummary ??
        parsed.executive_summary ??
        finalAnalysis,
    );

    return {
      riskAnalysis: riskAnalysis || finalAnalysis,
      finalAnalysis,
      summary: summary || finalAnalysis,
    };
  } catch (error) {
    const fallback = toText(aiResponse);

    return {
      riskAnalysis: fallback,
      finalAnalysis: fallback,
      summary: fallback,
    };
  }
};

const buildSelectedSourceProjectSummaries = (selectedSourceProjects = []) => {
  return selectedSourceProjects
    .map((item) => {
      const title = item?.form?.title?.trim();
      const summary = item?.sourceProject?.summaryAnalysis?.trim();

      if (!title || !summary) return null;

      return {
        title,
        summary,
      };
    })
    .filter(Boolean);
};

const getOrderedPromptSegments = (promptVersion) => {
  if (!promptVersion?.values?.length) return [];

  return [...promptVersion.values]
    .sort((a, b) => {
      const aOrder = a.segmentDefinition?.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const bOrder = b.segmentDefinition?.sortOrder ?? Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder;
    })
    .map((item) => ({
      content: item.content,
    }));
};

const pickPromptSegments = (segments, indexes) => {
  return indexes.map((index) => segments[index]).filter(Boolean);
};

const safeStringify = (value) => {
  if (value == null) return null;

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const extractAnalysisData = (aiResponse) => {
  const result = {
    finalAnalysis: null,
    riskAnalysis: null,
    riskPercentage: null,
    summaryAnalysis: null,
    keyStrategicInsights: null,
  };

  if (!aiResponse?.final_output) {
    return result;
  }

  try {
    const cleanJson = aiResponse.final_output
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    const parsed = JSON.parse(cleanJson);

    result.finalAnalysis = safeStringify(parsed?.final_analysis);

    result.riskAnalysis = safeStringify(parsed?.risk_analysis);

    result.riskPercentage = parsed?.risk_percentage
      ? parseFloat(String(parsed.risk_percentage).replace("%", "").trim())
      : null;

    result.summaryAnalysis = safeStringify(parsed?.executive_summary);

    result.keyStrategicInsights = safeStringify(parsed?.key_strategic_insights);

    return result;
  } catch (error) {
    return {
      finalAnalysis: safeStringify(aiResponse.final_output),
      riskAnalysis: null,
      riskPercentage: null,
      summaryAnalysis: null,
      keyStrategicInsights: null,
    };
  }
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
  getOrderedPromptSegments,
  pickPromptSegments,
  extractAnalysisData,
  safeStringify,
};

// const parseFinalAnalysisResponse = (aiResponse) => {
//   const toText = (value) => {
//     if (value === null || value === undefined) return "";

//     if (typeof value === "string") return value.trim();

//     return JSON.stringify(value, null, 2);
//   };

//   const extractJsonText = (text) => {
//     if (!text || typeof text !== "string") return "";

//     let cleaned = text
//       .replace(/```json/gi, "")
//       .replace(/```/g, "")
//       .trim();

//     const firstBraceIndex = cleaned.indexOf("{");
//     const lastBraceIndex = cleaned.lastIndexOf("}");

//     if (
//       firstBraceIndex !== -1 &&
//       lastBraceIndex !== -1 &&
//       lastBraceIndex > firstBraceIndex
//     ) {
//       cleaned = cleaned.slice(firstBraceIndex, lastBraceIndex + 1);
//     }

//     return cleaned;
//   };

//   try {
//     const jsonText = extractJsonText(aiResponse);
//     const parsed = JSON.parse(jsonText);

//     return {
//       riskAnalysis: toText(
//         parsed.riskAnalysis ??
//           parsed.risk_analysis ??
//           parsed.risk ??
//           parsed.risks ??
//           "",
//       ),
//       finalAnalysis: toText(
//         parsed.finalAnalysis ??
//           parsed.final_analysis ??
//           parsed.analysis ??
//           parsed.final ??
//           "",
//       ),
//       summary: toText(
//         parsed.summary ??
//           parsed.summaryAnalysis ??
//           parsed.summary_analysis ??
//           parsed.executiveSummary ??
//           parsed.executive_summary ??
//           "",
//       ),
//     };
//   } catch (error) {
//     return {
//       riskAnalysis: "",
//       finalAnalysis: toText(aiResponse),
//       summary: "",
//     };
//   }
// };

//promptSegments: firstPromptSegment
