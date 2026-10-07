const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../src/prismaClient");
const { agent, withAuthCookie } = require("./helpers/testApp");
const {
  createTwoCompanyScenario,
  cleanupQaData,
} = require("./helpers/testFixtures");
const {
  resolveProjectPlanAccess,
  PLAN_PERMISSION,
} = require("../src/services/projectPlanAccessService");

describe("project plan via project canAction", { concurrency: false }, () => {
  let scenario;
  let projectId;
  let planId;

  before(async () => {
    scenario = await createTwoCompanyScenario();
    const project = await prisma.project.create({
      data: {
        title: "__qa_test__ plan canAction project",
        creatorId: scenario.memberA.user.id,
        companyId: scenario.companyA.id,
        mode: "SINGLE",
        status: "FINAL_ANALYSIS",
      },
    });
    projectId = project.id;

    await prisma.projectAccess.create({
      data: {
        projectId,
        userId: scenario.memberA2.user.id,
        canView: true,
        canAction: true,
        canVisualize: false,
        grantedByUserId: scenario.memberA.user.id,
      },
    });

    const plan = await prisma.projectPlan.create({
      data: { projectId },
    });
    planId = plan.id;
  });

  after(async () => {
    await cleanupQaData();
  });

  it("resolveProjectPlanAccess grants EDIT via project canAction without plan grant", async () => {
    const user = {
      id: scenario.memberA2.user.id,
      role: "MEMBER",
      companyId: scenario.companyA.id,
    };
    const resolved = await resolveProjectPlanAccess(user, planId);
    assert.equal(resolved.allowed, true);
    assert.equal(resolved.permission, PLAN_PERMISSION.EDIT);
    assert.equal(resolved.viaProjectAction, true);
  });

  it("GET project plan returns canCreatePlan when plan missing and member has canAction", async () => {
    const noPlanProject = await prisma.project.create({
      data: {
        title: "__qa_test__ plan canAction empty",
        creatorId: scenario.memberA.user.id,
        companyId: scenario.companyA.id,
        mode: "SINGLE",
        status: "FINAL_ANALYSIS",
      },
    });

    await prisma.projectAccess.create({
      data: {
        projectId: noPlanProject.id,
        userId: scenario.memberA2.user.id,
        canView: true,
        canAction: true,
        grantedByUserId: scenario.memberA.user.id,
      },
    });

    const res = await withAuthCookie(
      agent().get(`/api/project/${noPlanProject.id}/plan`),
      scenario.memberA2.accessToken,
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.data.plan, null);
    assert.equal(res.body.data.canCreatePlan, true);
    assert.equal(res.body.data.access.permission, "EDIT");
  });

  it("GET project plan denied for view-only collaborator", async () => {
    const viewProject = await prisma.project.create({
      data: {
        title: "__qa_test__ plan view only",
        creatorId: scenario.memberA.user.id,
        companyId: scenario.companyA.id,
        mode: "SINGLE",
        status: "FINAL_ANALYSIS",
      },
    });

    await prisma.projectAccess.create({
      data: {
        projectId: viewProject.id,
        userId: scenario.memberA2.user.id,
        canView: true,
        canAction: false,
        grantedByUserId: scenario.memberA.user.id,
      },
    });

    const res = await withAuthCookie(
      agent().get(`/api/project/${viewProject.id}/plan`),
      scenario.memberA2.accessToken,
    );

    assert.equal(res.status, 403);
  });

  it("GET project plan hub allowed for plan EDIT grant without project canAction", async () => {
    const planOnlyProject = await prisma.project.create({
      data: {
        title: "__qa_test__ plan grant only hub",
        creatorId: scenario.memberA.user.id,
        companyId: scenario.companyA.id,
        mode: "SINGLE",
        status: "FINAL_ANALYSIS",
      },
    });

    const planOnlyPlan = await prisma.projectPlan.create({
      data: { projectId: planOnlyProject.id, status: "DRAFT" },
    });

    await prisma.projectPlanAccess.create({
      data: {
        companyId: scenario.companyA.id,
        projectPlanId: planOnlyPlan.id,
        userId: scenario.memberA2.user.id,
        permission: "EDIT",
        grantedByUserId: scenario.companyUserA.user.id,
      },
    });

    const res = await withAuthCookie(
      agent().get(`/api/project/${planOnlyProject.id}/plan`),
      scenario.memberA2.accessToken,
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.data.plan.id, planOnlyPlan.id);
    assert.equal(res.body.data.access.permission, "EDIT");
  });

  it("GET project plan hub denied for plan-only grant when plan does not exist yet", async () => {
    const emptyPlanProject = await prisma.project.create({
      data: {
        title: "__qa_test__ plan grant no plan row",
        creatorId: scenario.memberA.user.id,
        companyId: scenario.companyA.id,
        mode: "SINGLE",
        status: "FINAL_ANALYSIS",
      },
    });

    const phantomPlan = await prisma.projectPlan.create({
      data: { projectId: emptyPlanProject.id, status: "DRAFT" },
    });

    await prisma.projectPlanAccess.create({
      data: {
        companyId: scenario.companyA.id,
        projectPlanId: phantomPlan.id,
        userId: scenario.memberA2.user.id,
        permission: "EDIT",
        grantedByUserId: scenario.companyUserA.user.id,
      },
    });

    await prisma.projectPlan.delete({ where: { id: phantomPlan.id } });

    const res = await withAuthCookie(
      agent().get(`/api/project/${emptyPlanProject.id}/plan`),
      scenario.memberA2.accessToken,
    );

    assert.equal(res.status, 403);
  });

  it("POST create plan allowed for canAction member (fails without finalAnalysis)", async () => {
    const res = await withAuthCookie(
      agent().post(`/api/project/${projectId}/plan`),
      scenario.memberA2.accessToken,
    );

    assert.equal(res.status, 400);
    assert.match(res.body.message || "", /تحلیل نهایی|برنامه پروژه از قبل/);
  });
});
