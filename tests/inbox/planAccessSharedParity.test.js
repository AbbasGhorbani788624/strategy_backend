const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../../src/prismaClient");
const { agent, withAuthCookie } = require("../helpers/testApp");
const {
  listSharedWithMeService: listSharedStrategyPlans,
} = require("../../src/services/strategyPlanCollaboratorsService");
const {
  listStrategyPlanAccessInboxService,
} = require("../../src/services/inboxStrategyPlanAccessService");
const {
  listProjectPlanAccessInboxService,
} = require("../../src/services/inboxProjectPlanAccessService");
const {
  listSharedWithMeService: listSharedProjectPlans,
} = require("../../src/services/projectPlanCollaboratorsService");
const {
  createTwoCompanyScenario,
  cleanupQaData,
} = require("../helpers/testFixtures");

describe("inbox plan-access parity with shared-with-me", { concurrency: false }, () => {
  let scenario;
  let strategyPlanId;
  let projectPlanId;

  before(async () => {
    scenario = await createTwoCompanyScenario();

    const strategyProject = await prisma.project.create({
      data: {
        title: "__qa_test__ parity strategy project",
        creatorId: scenario.memberA.user.id,
        companyId: scenario.companyA.id,
        mode: "SINGLE",
        status: "WAITING_FOR_FORM",
      },
    });

    const strategyPlan = await prisma.strategyPlan.create({
      data: {
        projectId: strategyProject.id,
        companyId: scenario.companyA.id,
        framework: "OKR",
        status: "DRAFT",
        state: "MAP_GENERATION",
      },
    });
    strategyPlanId = strategyPlan.id;

    await prisma.strategyPlanAccess.create({
      data: {
        companyId: scenario.companyA.id,
        planId: strategyPlan.id,
        userId: scenario.memberA2.user.id,
        permission: "EDIT",
        grantedByUserId: scenario.companyUserA.user.id,
      },
    });

    const planProject = await prisma.project.create({
      data: {
        title: "__qa_test__ parity plan project",
        creatorId: scenario.memberA.user.id,
        companyId: scenario.companyA.id,
        mode: "SINGLE",
        status: "WAITING_FOR_FORM",
      },
    });

    const projectPlan = await prisma.projectPlan.create({
      data: {
        projectId: planProject.id,
        status: "DRAFT",
      },
    });
    projectPlanId = projectPlan.id;

    await prisma.projectPlanAccess.create({
      data: {
        companyId: scenario.companyA.id,
        projectPlanId: projectPlan.id,
        userId: scenario.memberA2.user.id,
        permission: "VIEW",
        grantedByUserId: scenario.companyUserA.user.id,
      },
    });
  });

  after(async () => {
    await cleanupQaData();
  });

  it("strategy: received inbox total matches shared-with-me", async () => {
    const member = {
      id: scenario.memberA2.user.id,
      role: "MEMBER",
      companyId: scenario.companyA.id,
    };
    const shared = await listSharedStrategyPlans(member, {
      page: 1,
      limit: 20,
    });
    const inbox = await listStrategyPlanAccessInboxService(member, {
      direction: "received",
      page: 1,
      limit: 20,
    });

    assert.equal(inbox.pagination.totalItems, shared.pagination.totalItems);
    assert.ok(shared.pagination.totalItems >= 1);
    assert.ok(
      inbox.items.some((i) => i.planId === strategyPlanId),
    );
    assert.ok(inbox.items[0].counterparty?.username);
  });

  it("strategy: search filters by project title only", async () => {
    const inbox = await withAuthCookie(
      agent().get(
        "/api/inbox/strategy-plan-access?direction=received&search=parity strategy",
      ),
      scenario.memberA2.accessToken,
    );
    assert.equal(inbox.status, 200);
    assert.equal(inbox.body.data.pagination.totalItems, 1);

    const miss = await withAuthCookie(
      agent().get(
        "/api/inbox/strategy-plan-access?direction=received&search=nonexistent xyz",
      ),
      scenario.memberA2.accessToken,
    );
    assert.equal(miss.body.data.pagination.totalItems, 0);
  });

  it("strategy: member sent is empty", async () => {
    const res = await withAuthCookie(
      agent().get("/api/inbox/strategy-plan-access?direction=sent"),
      scenario.memberA2.accessToken,
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.data.items.length, 0);
  });

  it("project plan: received inbox total matches shared-with-me", async () => {
    const member = {
      id: scenario.memberA2.user.id,
      role: "MEMBER",
      companyId: scenario.companyA.id,
    };
    const shared = await listSharedProjectPlans(member, {
      page: 1,
      limit: 20,
    });
    const inbox = await listProjectPlanAccessInboxService(member, {
      direction: "received",
      page: 1,
      limit: 20,
    });

    assert.equal(inbox.pagination.totalItems, shared.pagination.totalItems);
    assert.ok(
      inbox.items.some((i) => i.planId === projectPlanId),
    );
  });

  it("company sent lists grants", async () => {
    const strategySent = await withAuthCookie(
      agent().get("/api/inbox/strategy-plan-access?direction=sent"),
      scenario.companyUserA.accessToken,
    );
    const planSent = await withAuthCookie(
      agent().get("/api/inbox/project-plan-access?direction=sent"),
      scenario.companyUserA.accessToken,
    );
    assert.ok(strategySent.body.data.items.length >= 1);
    assert.ok(planSent.body.data.items.length >= 1);
  });
});
