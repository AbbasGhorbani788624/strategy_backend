const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  getRequiredItemKey,
  getSelectionKey,
  getRequiredItemTitle,
  isRequiredItemCompleted,
  matchesSelectedProject,
  buildCompletedProjectWhereForRequiredItem,
} = require("../src/utils/multiAnalysisRequiredFormUtils");

describe("multiAnalysisRequiredFormUtils", () => {
  it("getRequiredItemKey returns single and multi keys", () => {
    assert.equal(
      getRequiredItemKey({ type: "SINGLE", formId: "form-1" }),
      "single:form-1",
    );
    assert.equal(
      getRequiredItemKey({
        type: "MULTI",
        requiredMultiAnalysisFormId: "multi-1",
      }),
      "multi:multi-1",
    );
  });

  it("getSelectionKey maps selected project payload", () => {
    assert.equal(getSelectionKey({ formId: "form-1" }), "single:form-1");
    assert.equal(
      getSelectionKey({ multiAnalysisFormId: "multi-1" }),
      "multi:multi-1",
    );
  });

  it("getRequiredItemTitle reads nested relations", () => {
    assert.equal(
      getRequiredItemTitle({
        type: "SINGLE",
        form: { title: "Single Form" },
      }),
      "Single Form",
    );

    assert.equal(
      getRequiredItemTitle({
        type: "MULTI",
        requiredMultiAnalysisForm: { title: "Multi Form" },
      }),
      "Multi Form",
    );
  });

  it("isRequiredItemCompleted checks both project sets", () => {
    const completedFormIds = new Set(["form-1"]);
    const completedMultiFormIds = new Set(["multi-1"]);

    assert.equal(
      isRequiredItemCompleted(
        { type: "SINGLE", formId: "form-1" },
        completedFormIds,
        completedMultiFormIds,
      ),
      true,
    );

    assert.equal(
      isRequiredItemCompleted(
        { type: "MULTI", requiredMultiAnalysisFormId: "multi-1" },
        completedFormIds,
        completedMultiFormIds,
      ),
      true,
    );
  });

  it("matchesSelectedProject validates source project mode", () => {
    assert.equal(
      matchesSelectedProject(
        { formId: "form-1" },
        { mode: "SINGLE", formId: "form-1" },
      ),
      true,
    );

    assert.equal(
      matchesSelectedProject(
        { multiAnalysisFormId: "multi-1" },
        { mode: "MULTI", multiAnalysisFormId: "multi-1" },
      ),
      true,
    );

    assert.equal(
      matchesSelectedProject(
        { formId: "form-1" },
        { mode: "MULTI", multiAnalysisFormId: "multi-1" },
      ),
      false,
    );
  });

  it("buildCompletedProjectWhereForRequiredItem builds mode-specific filters", () => {
    const baseWhere = { creatorId: "user-1", status: "FINAL_ANALYSIS" };

    assert.deepEqual(
      buildCompletedProjectWhereForRequiredItem(
        { type: "SINGLE", formId: "form-1" },
        baseWhere,
      ),
      {
        ...baseWhere,
        mode: "SINGLE",
        formId: "form-1",
      },
    );

    assert.deepEqual(
      buildCompletedProjectWhereForRequiredItem(
        { type: "MULTI", requiredMultiAnalysisFormId: "multi-1" },
        baseWhere,
      ),
      {
        ...baseWhere,
        mode: "MULTI",
        multiAnalysisFormId: "multi-1",
      },
    );
  });
});
