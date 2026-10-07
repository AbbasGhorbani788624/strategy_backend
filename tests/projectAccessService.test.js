const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  parseColleaguesPayload,
  normalizeCollaboratorCapabilities,
  legacyPermissionToCapabilities,
  resolveMemberProjectAccess,
  PROJECT_CAPABILITY,
} = require("../src/services/projectAccessService");

describe("projectAccessService", () => {
  it("normalizeCollaboratorCapabilities forces canView when action or visualize", () => {
    const caps = normalizeCollaboratorCapabilities({
      canView: false,
      canAction: true,
      canVisualize: false,
    });
    assert.equal(caps.canView, true);
    assert.equal(caps.canAction, true);
  });

  it("legacy EDIT maps to view-only capabilities", () => {
    const caps = legacyPermissionToCapabilities("EDIT");
    assert.equal(caps.canView, true);
    assert.equal(caps.canAction, false);
    assert.equal(caps.canVisualize, false);
  });

  it("parseColleaguesPayload accepts capability flags", () => {
    const parsed = parseColleaguesPayload({
      colleagues: [
        {
          userId: "11111111-1111-1111-1111-111111111111",
          canView: true,
          canAction: true,
          canVisualize: false,
        },
      ],
    });
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].capabilities.canAction, true);
  });

  it("parseColleaguesPayload maps legacy permission VIEW", () => {
    const parsed = parseColleaguesPayload({
      colleagues: [
        {
          userId: "11111111-1111-1111-1111-111111111111",
          permission: "VIEW",
        },
      ],
    });
    assert.equal(parsed[0].capabilities.canView, true);
    assert.equal(parsed[0].capabilities.canAction, false);
  });

  it("resolveMemberProjectAccess denies without canView", () => {
    const project = {
      creatorId: "owner",
      status: "WAITING_FOR_FORM",
      accesses: [
        {
          userId: "u2",
          canView: false,
          canAction: true,
          canVisualize: false,
        },
      ],
    };
    const result = resolveMemberProjectAccess(project, "u2");
    assert.equal(result.allowed, false);
  });

  it("resolveMemberProjectAccess returns capabilities for grantee", () => {
    const project = {
      creatorId: "owner",
      status: "FINAL_ANALYSIS",
      accesses: [
        {
          userId: "u2",
          canView: true,
          canAction: true,
          canVisualize: true,
        },
      ],
    };
    const result = resolveMemberProjectAccess(project, "u2");
    assert.equal(result.allowed, true);
    assert.equal(result.capabilities.canContinueAnalysis, false);
    assert.equal(result.capabilities.canMutateAnalysisPipeline, false);
  });
});
