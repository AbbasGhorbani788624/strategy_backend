const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildProjectAccessGrantedPayload,
  buildProjectCollaboratorActivityPayload,
  buildProjectPlanAccessGrantedPayload,
  buildStrategyPlanAccessGrantedPayload,
  buildFormCollaborationInvitePayload,
  buildFormCollaborationResponseSubmittedPayload,
  buildProjectPlanCollaboratorActivityPayload,
  buildStrategyPlanCollaboratorActivityPayload,
} = require("../../src/services/notificationDispatchService");

describe("notification payload contracts (frontend navigation)", () => {
  it("PROJECT_ACCESS_GRANTED includes projectId in referenceId and metadata", () => {
    const payload = buildProjectAccessGrantedPayload({
      userId: "u1",
      projectId: "p1",
      projectTitle: "پروژه آلفا",
      capabilities: {
        canView: true,
        canAction: true,
        canVisualize: false,
      },
      grantedByUsername: "owner",
    });
    assert.equal(payload.type, "PROJECT_ACCESS_GRANTED");
    assert.equal(payload.referenceId, "p1");
    assert.equal(payload.metadata.projectId, "p1");
    assert.equal(payload.metadata.canAction, true);
    assert.match(payload.message, /اقدام/);
  });

  it("PROJECT_COLLABORATOR_ACTIVITY uses projectId referenceId", () => {
    const payload = buildProjectCollaboratorActivityPayload({
      userId: "granter",
      projectId: "p1",
      projectTitle: "پروژه آلفا",
      actorUserId: "collab-id",
      actorUsername: "collab",
      action: "ILLUSTRATED_MARKED",
      projectStatus: "ANALYSIS_PENDING",
    });
    assert.equal(payload.type, "PROJECT_COLLABORATOR_ACTIVITY");
    assert.equal(payload.referenceId, "p1");
    assert.equal(payload.metadata.action, "ILLUSTRATED_MARKED");
    assert.match(payload.message, /مصور/);
  });

  it("PROJECT_PLAN_ACCESS_GRANTED requires metadata.projectId for frontend", () => {
    const payload = buildProjectPlanAccessGrantedPayload({
      userId: "u1",
      plan: { id: "plan1", projectId: "proj1", project: { title: "T" } },
      permission: "VIEW",
      granterUsername: "admin",
    });
    assert.equal(payload.metadata.projectId, "proj1");
    assert.equal(payload.metadata.planId, "plan1");
    assert.equal(payload.referenceId, "proj1");
  });

  it("STRATEGY_PLAN_ACCESS_GRANTED uses planId referenceId", () => {
    const payload = buildStrategyPlanAccessGrantedPayload({
      userId: "u1",
      plan: {
        id: "sp1",
        projectId: "proj1",
        framework: "OKR",
        project: { title: "T" },
      },
      permission: "EDIT",
      isReadyForMonitoring: true,
    });
    assert.equal(payload.referenceId, "sp1");
    assert.equal(payload.metadata.planId, "sp1");
    assert.equal(payload.metadata.isReadyForMonitoring, true);
  });

  it("FORM_COLLABORATION_INVITE uses delegationId", () => {
    const payload = buildFormCollaborationInvitePayload({
      userId: "assignee",
      delegationId: "d1",
      projectId: "p1",
      projectTitle: "T",
      mode: "FILL",
      senderUsername: "owner",
    });
    assert.equal(payload.referenceId, "d1");
    assert.equal(payload.metadata.delegationId, "d1");
    assert.match(payload.message, /پر کردن/);
  });

  it("PROJECT_PLAN_COLLABORATOR_ACTIVITY notifies granter with action metadata", () => {
    const payload = buildProjectPlanCollaboratorActivityPayload({
      userId: "granter",
      projectId: "proj1",
      projectTitle: "T",
      planId: "plan1",
      actorUserId: "collab",
      actorUsername: "ali",
      action: "ACTION_CREATED",
    });
    assert.equal(payload.type, "PROJECT_PLAN_COLLABORATOR_ACTIVITY");
    assert.equal(payload.referenceId, "proj1");
    assert.equal(payload.metadata.action, "ACTION_CREATED");
    assert.match(payload.message, /اقدام جدید ثبت کرد/);
  });

  it("STRATEGY_PLAN_COLLABORATOR_ACTIVITY uses planId referenceId", () => {
    const payload = buildStrategyPlanCollaboratorActivityPayload({
      userId: "granter",
      plan: {
        id: "sp1",
        projectId: "proj1",
        framework: "OKR",
        project: { title: "T" },
      },
      actorUserId: "collab",
      actorUsername: "ali",
      action: "TABLE_APPROVED",
    });
    assert.equal(payload.type, "STRATEGY_PLAN_COLLABORATOR_ACTIVITY");
    assert.equal(payload.referenceId, "sp1");
    assert.match(payload.message, /جدول OKR را تأیید کرد/);
  });

  it("FORM_COLLABORATION_RESPONSE_SUBMITTED uses projectId referenceId", () => {
    const payload = buildFormCollaborationResponseSubmittedPayload({
      userId: "owner",
      projectId: "p1",
      projectTitle: "T",
      assigneeUsername: "a1",
    });
    assert.equal(payload.referenceId, "p1");
    assert.equal(payload.metadata.projectId, "p1");
    assert.equal(payload.metadata.assigneeUsername, "a1");
  });
});
