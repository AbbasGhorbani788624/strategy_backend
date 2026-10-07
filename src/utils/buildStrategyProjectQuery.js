const { createBadRequestError } = require("./index");

const STRATEGY_PLANNING_CATEGORY_TITLE = "استراتژی گذاری";

const STRATEGY_FLOW_FRAMEWORKS = Object.freeze(["OKR", "BSC"]);

const normalizeStrategyFlowFramework = (raw) => {
  if (raw == null || String(raw).trim() === "") {
    createBadRequestError(
      "پارامتر framework الزامی است. مقادیر مجاز: OKR، BSC",
      400,
    );
  }

  const normalized = String(raw).trim().toUpperCase();
  if (!STRATEGY_FLOW_FRAMEWORKS.includes(normalized)) {
    createBadRequestError(
      "مقدار framework نامعتبر است. مقادیر مجاز: OKR، BSC",
      400,
    );
  }

  return normalized;
};

/** Prisma where fragment: multi-analysis forms in the strategy-planning category. */
const buildStrategyCategoryProjectWhere = () => ({
  multiAnalysisForm: {
    is: {
      category: {
        is: {
          title: STRATEGY_PLANNING_CATEGORY_TITLE,
        },
      },
    },
  },
});

/**
 * List-query flags for strategy flow project picker (OKR = tier-4 analyses, BSC = multi + strategy category).
 */
const buildStrategyProjectQuery = ({ framework }) => {
  const normalized = normalizeStrategyFlowFramework(framework);

  if (normalized === "BSC") {
    return {
      mode: "MULTI",
      strategyCategoryOnly: true,
    };
  }

  return {};
};

const validateStrategyFlowListQuery = (query = {}) => {
  const framework = normalizeStrategyFlowFramework(query.framework);

  if (query.page === undefined || query.page === "") {
    createBadRequestError("پارامتر page الزامی است", 400);
  }
  if (query.limit === undefined || query.limit === "") {
    createBadRequestError("پارامتر limit الزامی است", 400);
  }

  const page = parseInt(query.page, 10);
  const limit = parseInt(query.limit, 10);

  if (!Number.isFinite(page) || page < 1) {
    createBadRequestError("page باید عددی بزرگتر یا مساوی ۱ باشد", 400);
  }
  if (!Number.isFinite(limit) || limit < 1) {
    createBadRequestError("limit باید عددی بزرگتر یا مساوی ۱ باشد", 400);
  }

  const { sortBy = "createdAt", sortOrder = "desc" } = query;

  return {
    framework,
    page,
    limit,
    sortBy,
    sortOrder,
    search: query.search,
    targetUserId: query.targetUserId,
    scoreFilter: query.scoreFilter,
    status: query.status,
  };
};

module.exports = {
  STRATEGY_FLOW_FRAMEWORKS,
  STRATEGY_PLANNING_CATEGORY_TITLE,
  normalizeStrategyFlowFramework,
  buildStrategyCategoryProjectWhere,
  buildStrategyProjectQuery,
  validateStrategyFlowListQuery,
};
