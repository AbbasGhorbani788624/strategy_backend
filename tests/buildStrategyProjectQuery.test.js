const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildStrategyProjectQuery,
  buildStrategyCategoryProjectWhere,
  normalizeStrategyFlowFramework,
  validateStrategyFlowListQuery,
  STRATEGY_PLANNING_CATEGORY_TITLE,
} = require("../src/utils/buildStrategyProjectQuery");

describe("buildStrategyProjectQuery", () => {
  it("BSC applies MULTI mode and strategy category filter flags", () => {
    assert.deepEqual(buildStrategyProjectQuery({ framework: "BSC" }), {
      mode: "MULTI",
      strategyCategoryOnly: true,
    });
    assert.deepEqual(buildStrategyProjectQuery({ framework: "bsc" }), {
      mode: "MULTI",
      strategyCategoryOnly: true,
    });
  });

  it("OKR does not restrict to strategy category or MULTI mode", () => {
    assert.deepEqual(buildStrategyProjectQuery({ framework: "OKR" }), {});
    assert.deepEqual(buildStrategyProjectQuery({ framework: "okr" }), {});
  });

  it("buildStrategyCategoryProjectWhere targets strategy-planning category title", () => {
    const where = buildStrategyCategoryProjectWhere();
    assert.equal(
      where.multiAnalysisForm.is.category.is.title,
      STRATEGY_PLANNING_CATEGORY_TITLE,
    );
  });

  it("normalizeStrategyFlowFramework rejects missing and invalid values", () => {
    assert.throws(
      () => normalizeStrategyFlowFramework(undefined),
      (err) => err.statusCode === 400,
    );
    assert.throws(
      () => normalizeStrategyFlowFramework("XYZ"),
      (err) => err.statusCode === 400,
    );
    assert.equal(normalizeStrategyFlowFramework("  okr "), "OKR");
  });

  it("validateStrategyFlowListQuery requires page and limit", () => {
    assert.throws(
      () =>
        validateStrategyFlowListQuery({
          framework: "OKR",
          limit: "6",
        }),
      (err) => err.statusCode === 400,
    );
    assert.throws(
      () =>
        validateStrategyFlowListQuery({
          framework: "OKR",
          page: "1",
        }),
      (err) => err.statusCode === 400,
    );

    const parsed = validateStrategyFlowListQuery({
      framework: "BSC",
      page: "2",
      limit: "6",
      sortBy: "averageRating",
      sortOrder: "asc",
    });

    assert.equal(parsed.framework, "BSC");
    assert.equal(parsed.page, 2);
    assert.equal(parsed.limit, 6);
    assert.equal(parsed.sortBy, "averageRating");
    assert.equal(parsed.sortOrder, "asc");
  });
});
