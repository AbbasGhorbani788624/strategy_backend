const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  resolveInboxViewMode,
} = require("../../src/services/formCollaborationService");

describe("form delegation inbox viewMode", () => {
  it("sender + PENDING + FILL is READ_ONLY_SNAPSHOT not CLOSED", () => {
    const viewMode = resolveInboxViewMode({
      mode: "FILL",
      canSubmit: false,
      myResponse: null,
      readOnlyContent: null,
      displayStatus: "PENDING",
      viewerRole: "SENDER",
      hasFormSchema: false,
    });
    assert.equal(viewMode, "READ_ONLY_SNAPSHOT");
  });

  it("assignee with canSubmit is EDIT", () => {
    const viewMode = resolveInboxViewMode({
      mode: "FILL",
      canSubmit: true,
      myResponse: null,
      readOnlyContent: null,
      displayStatus: "PENDING",
      viewerRole: "ASSIGNEE",
      hasFormSchema: true,
    });
    assert.equal(viewMode, "EDIT");
  });

  it("displayStatus CLOSED wins for both roles", () => {
    assert.equal(
      resolveInboxViewMode({
        mode: "FILL",
        canSubmit: false,
        displayStatus: "CLOSED",
        viewerRole: "SENDER",
        hasFormSchema: true,
      }),
      "CLOSED",
    );
  });
});
