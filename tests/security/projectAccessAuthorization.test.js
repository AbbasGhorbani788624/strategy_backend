const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../../src/prismaClient");
const { agent, withAuthCookie } = require("../helpers/testApp");
const {
  createTwoCompanyScenario,
  cleanupQaData,
} = require("../helpers/testFixtures");
const {
  assertProjectAccess,
  assertProjectOwner,
  PROJECT_PERMISSION,
  PROJECT_CAPABILITY,
} = require("../../src/services/projectAccessService");
const {
  PROJECT_WORKFLOW_ACTION,
  assertProjectWorkflowAccess,
} = require("../../src/utils/projectWorkflowAuthorization");

describe("project access authorization", { concurrency: false }, () => {
  let scenario;
  let project;

  before(async () => {
    scenario = await createTwoCompanyScenario();
    project = await prisma.project.create({
      data: {
        title: "__qa_test__ access project",
        creatorId: scenario.memberA.user.id,
        companyId: scenario.companyA.id,
        mode: "SINGLE",
        status: "WAITING_FOR_FORM",
      },
    });

    await prisma.projectAccess.create({
      data: {
        projectId: project.id,
        userId: scenario.memberA2.user.id,
        canView: true,
        canAction: false,
        canVisualize: false,
        grantedByUserId: scenario.memberA.user.id,
      },
    });
  });

  after(async () => {
    await cleanupQaData();
  });

  it("collaborator with canView can assertProjectAccess VIEW", async () => {
    const user = {
      id: scenario.memberA2.user.id,
      role: "MEMBER",
      companyId: scenario.companyA.id,
    };
    const resolved = await assertProjectAccess(
      user,
      project.id,
      PROJECT_PERMISSION.VIEW,
    );
    assert.equal(resolved.isOwner, false);
    assert.equal(resolved.capabilities.canView, true);
  });

  it("collaborator denied legacy EDIT assertProjectAccess", async () => {
    const user = {
      id: scenario.memberA2.user.id,
      role: "MEMBER",
      companyId: scenario.companyA.id,
    };
    await assert.rejects(
      () =>
        assertProjectAccess(user, project.id, PROJECT_PERMISSION.EDIT),
      (err) => err.statusCode === 403,
    );
  });

  it("collaborator denied workflow SUBMIT_FORM (owner only)", async () => {
    const user = {
      id: scenario.memberA2.user.id,
      role: "MEMBER",
      companyId: scenario.companyA.id,
    };
    await assert.rejects(
      () =>
        assertProjectWorkflowAccess(
          user,
          project.id,
          PROJECT_WORKFLOW_ACTION.SUBMIT_FORM,
        ),
      (err) => err.statusCode === 403,
    );
  });

  it("collaborator with canAction still denied workflow (owner only)", async () => {
    await prisma.projectAccess.update({
      where: {
        projectId_userId: {
          projectId: project.id,
          userId: scenario.memberA2.user.id,
        },
      },
      data: { canAction: true },
    });

    const user = {
      id: scenario.memberA2.user.id,
      role: "MEMBER",
      companyId: scenario.companyA.id,
    };
    await assert.rejects(
      () =>
        assertProjectWorkflowAccess(
          user,
          project.id,
          PROJECT_WORKFLOW_ACTION.SUBMIT_FORM,
        ),
      (err) => err.statusCode === 403,
    );

    await prisma.projectAccess.update({
      where: {
        projectId_userId: {
          projectId: project.id,
          userId: scenario.memberA2.user.id,
        },
      },
      data: { canAction: false },
    });
  });

  it("owner passes assertProjectOwner", async () => {
    const user = {
      id: scenario.memberA.user.id,
      role: "MEMBER",
      companyId: scenario.companyA.id,
    };
    const resolved = await assertProjectOwner(user, project.id);
    assert.equal(resolved.isOwner, true);
  });

  it("GET analysis-status allowed for VIEW collaborator", async () => {
    const res = await withAuthCookie(
      agent().get(`/api/project/${project.id}/analysis-status`),
      scenario.memberA2.accessToken,
    );
    assert.equal(res.status, 200);
  });

  it("PUT project access with capability flags", async () => {
    const ownerRes = await withAuthCookie(
      agent()
        .put(`/api/project/${project.id}/access`)
        .send({
          colleagues: [
            {
              userId: scenario.memberA2.user.id,
              canView: true,
              canAction: true,
              canVisualize: true,
            },
          ],
        }),
      scenario.memberA.accessToken,
    );
    assert.equal(ownerRes.status, 200);
    assert.equal(ownerRes.body.colleagues?.[0]?.canAction, true);
  });

  it("GET colleague list returns capability flags", async () => {
    const res = await withAuthCookie(
      agent().get(`/api/companyuser/colleague/${project.id}`),
      scenario.memberA.accessToken,
    );
    assert.equal(res.status, 200);
    const row = res.body.data.colleagues.find(
      (c) => c.id === scenario.memberA2.user.id,
    );
    assert.ok(row);
    assert.equal(row.hasAccess, true);
    assert.equal(row.canAction, true);
  });

  it("GET project returns access object for collaborator", async () => {
    const res = await withAuthCookie(
      agent().get(`/api/project/${project.id}`),
      scenario.memberA2.accessToken,
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.data.access.canView, true);
    assert.equal(res.body.data.access.canContinueAnalysis, false);
  });

  it("POST analysis-retry owner only when FAILED", async () => {
    await prisma.project.update({
      where: { id: project.id },
      data: { status: "FAILED" },
    });

    const collabRes = await withAuthCookie(
      agent().post(`/api/project/${project.id}/analysis-retry`),
      scenario.memberA2.accessToken,
    );
    assert.equal(collabRes.status, 403);

    const ownerRes = await withAuthCookie(
      agent().post(`/api/project/${project.id}/analysis-retry`),
      scenario.memberA.accessToken,
    );

    await prisma.project.update({
      where: { id: project.id },
      data: { status: "WAITING_FOR_FORM" },
    });

    assert.equal(ownerRes.status, 202);
  });
});
