const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../../src/prismaClient");
const { agent, withAuthCookie } = require("../helpers/testApp");
const {
  createTwoCompanyScenario,
  cleanupQaData,
} = require("../helpers/testFixtures");

describe("unified inbox authorization", { concurrency: false }, () => {
  let scenario;
  let ownerProject;
  let viewAccessId;
  let strategyAccessId;
  let projectPlanAccessId;
  let formDelegationId;
  let formCollaborationId;
  let formProjectId;

  before(async () => {
    scenario = await createTwoCompanyScenario();

    ownerProject = await prisma.project.create({
      data: {
        title: "__qa_test__ inbox project alpha",
        creatorId: scenario.memberA.user.id,
        companyId: scenario.companyA.id,
        mode: "SINGLE",
        status: "WAITING_FOR_FORM",
      },
    });

    const access = await prisma.projectAccess.create({
      data: {
        projectId: ownerProject.id,
        userId: scenario.memberA2.user.id,
        canView: true,
        canAction: false,
        canVisualize: false,
        grantedByUserId: scenario.memberA.user.id,
      },
    });
    viewAccessId = access.id;

    const strategyProject = await prisma.project.create({
      data: {
        title: "__qa_test__ inbox strategy project",
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

    const strategyAccess = await prisma.strategyPlanAccess.create({
      data: {
        companyId: scenario.companyA.id,
        planId: strategyPlan.id,
        userId: scenario.memberA2.user.id,
        permission: "VIEW",
        grantedByUserId: scenario.companyUserA.user.id,
      },
    });
    strategyAccessId = strategyAccess.id;

    const planProject = await prisma.project.create({
      data: {
        title: "__qa_test__ inbox plan project",
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

    const ppAccess = await prisma.projectPlanAccess.create({
      data: {
        companyId: scenario.companyA.id,
        projectPlanId: projectPlan.id,
        userId: scenario.memberA2.user.id,
        permission: "EDIT",
        grantedByUserId: scenario.companyUserA.user.id,
      },
    });
    projectPlanAccessId = ppAccess.id;

    const formProject = await prisma.project.create({
      data: {
        title: "__qa_test__ inbox form project",
        creatorId: scenario.memberA.user.id,
        companyId: scenario.companyA.id,
        mode: "SINGLE",
        status: "WAITING_FOR_FORM",
      },
    });

    const collaboration = await prisma.formCollaboration.create({
      data: {
        projectId: formProject.id,
        createdById: scenario.memberA.user.id,
        status: "OPEN",
      },
    });

    const delegation = await prisma.formCollaborationDelegation.create({
      data: {
        collaborationId: collaboration.id,
        assigneeId: scenario.memberA2.user.id,
        senderId: scenario.memberA.user.id,
        mode: "FILL",
        message: "لطفاً تکمیل کنید",
      },
    });
    formDelegationId = delegation.id;
    formCollaborationId = collaboration.id;
    formProjectId = formProject.id;
  });

  after(async () => {
    await cleanupQaData();
  });

  it("invalid direction returns 400", async () => {
    const res = await withAuthCookie(
      agent().get("/api/inbox/project-access?direction=invalid"),
      scenario.memberA.accessToken,
    );
    assert.equal(res.status, 400);
  });

  describe("project access inbox", () => {
    it("received: grantee sees access", async () => {
      const res = await withAuthCookie(
        agent().get("/api/inbox/project-access?direction=received"),
        scenario.memberA2.accessToken,
      );
      assert.equal(res.status, 200);
      const ids = res.body.data.items.map((i) => i.id);
      assert.ok(ids.includes(viewAccessId));
      const row = res.body.data.items.find((i) => i.id === viewAccessId);
      assert.equal(row.canView, true);
      assert.equal(row.canAction, false);
    });

    it("received: unrelated user from company B sees nothing", async () => {
      const res = await withAuthCookie(
        agent().get("/api/inbox/project-access?direction=received"),
        scenario.memberB.accessToken,
      );
      assert.equal(res.status, 200);
      assert.equal(res.body.data.items.length, 0);
    });

    it("sent: project owner sees grants", async () => {
      const res = await withAuthCookie(
        agent().get("/api/inbox/project-access?direction=sent"),
        scenario.memberA.accessToken,
      );
      assert.equal(res.status, 200);
      const ids = res.body.data.items.map((i) => i.id);
      assert.ok(ids.includes(viewAccessId));
      assert.equal(
        res.body.data.items.find((i) => i.id === viewAccessId).counterparty.id,
        scenario.memberA2.user.id,
      );
    });

    it("sent: VIEW collaborator cannot see sent list", async () => {
      const res = await withAuthCookie(
        agent().get("/api/inbox/project-access?direction=sent"),
        scenario.memberA2.accessToken,
      );
      assert.equal(res.status, 200);
      assert.equal(res.body.data.items.length, 0);
    });

    it("search filters by project title", async () => {
      const res = await withAuthCookie(
        agent().get(
          "/api/inbox/project-access?direction=received&search=inbox project alpha",
        ),
        scenario.memberA2.accessToken,
      );
      assert.equal(res.status, 200);
      assert.equal(res.body.data.items.length, 1);
    });

    it("sent: one inbox item per grantee (3 grants → 3 items)", async () => {
      const projectA = await prisma.project.create({
        data: {
          title: "__qa_test__ inbox sent multi A",
          creatorId: scenario.memberA.user.id,
          companyId: scenario.companyA.id,
          mode: "SINGLE",
          status: "WAITING_FOR_FORM",
        },
      });
      const projectB = await prisma.project.create({
        data: {
          title: "__qa_test__ inbox sent multi B",
          creatorId: scenario.memberA.user.id,
          companyId: scenario.companyA.id,
          mode: "SINGLE",
          status: "WAITING_FOR_FORM",
        },
      });

      await prisma.projectAccess.createMany({
        data: [
          {
            projectId: projectA.id,
            userId: scenario.memberA2.user.id,
            canView: true,
            canAction: false,
            canVisualize: false,
            grantedByUserId: scenario.memberA.user.id,
          },
          {
            projectId: projectA.id,
            userId: scenario.companyUserA.user.id,
            canView: true,
            canAction: true,
            canVisualize: false,
            grantedByUserId: scenario.memberA.user.id,
          },
          {
            projectId: projectB.id,
            userId: scenario.memberA2.user.id,
            canView: true,
            canAction: false,
            canVisualize: false,
            grantedByUserId: scenario.memberA.user.id,
          },
        ],
      });

      const res = await withAuthCookie(
        agent().get("/api/inbox/project-access?direction=sent&limit=50"),
        scenario.memberA.accessToken,
      );
      assert.equal(res.status, 200);

      const multiItems = res.body.data.items.filter(
        (i) =>
          i.resource?.id === projectA.id || i.resource?.id === projectB.id,
      );
      assert.equal(multiItems.length, 3);

      const toA2OnA = multiItems.find(
        (i) =>
          i.resource.id === projectA.id &&
          i.counterparty.id === scenario.memberA2.user.id,
      );
      const toCompanyOnA = multiItems.find(
        (i) =>
          i.resource.id === projectA.id &&
          i.counterparty.id === scenario.companyUserA.user.id,
      );
      const toA2OnB = multiItems.find(
        (i) =>
          i.resource.id === projectB.id &&
          i.counterparty.id === scenario.memberA2.user.id,
      );

      assert.equal(toA2OnA.canAction, false);
      assert.equal(toCompanyOnA.canAction, true);
      assert.equal(toA2OnB.canView, true);
    });

    it("search does not bypass company isolation", async () => {
      const res = await withAuthCookie(
        agent().get(
          "/api/inbox/project-access?direction=received&search=inbox project alpha",
        ),
        scenario.memberB.accessToken,
      );
      assert.equal(res.status, 200);
      assert.equal(res.body.data.items.length, 0);
    });
  });

  describe("strategy plan access inbox", () => {
    it("received: grantee sees plan access", async () => {
      const res = await withAuthCookie(
        agent().get("/api/inbox/strategy-plan-access?direction=received"),
        scenario.memberA2.accessToken,
      );
      assert.equal(res.status, 200);
      assert.ok(
        res.body.data.items.some((i) => i.id === strategyAccessId),
      );
    });

    it("sent: granter sees shared access", async () => {
      const res = await withAuthCookie(
        agent().get("/api/inbox/strategy-plan-access?direction=sent"),
        scenario.companyUserA.accessToken,
      );
      assert.equal(res.status, 200);
      assert.ok(
        res.body.data.items.some((i) => i.id === strategyAccessId),
      );
    });

    it("sent: grantee cannot see sent list", async () => {
      const res = await withAuthCookie(
        agent().get("/api/inbox/strategy-plan-access?direction=sent"),
        scenario.memberA2.accessToken,
      );
      assert.equal(res.status, 200);
      assert.equal(res.body.data.items.length, 0);
    });

    it("received: COMPANY role returns empty (intentional)", async () => {
      const res = await withAuthCookie(
        agent().get("/api/inbox/strategy-plan-access?direction=received"),
        scenario.companyUserA.accessToken,
      );
      assert.equal(res.status, 200);
      assert.equal(res.body.data.items.length, 0);
    });
  });

  describe("project plan access inbox", () => {
    it("received: grantee sees access with status", async () => {
      const res = await withAuthCookie(
        agent().get("/api/inbox/project-plan-access?direction=received"),
        scenario.memberA2.accessToken,
      );
      assert.equal(res.status, 200);
      const row = res.body.data.items.find((i) => i.id === projectPlanAccessId);
      assert.ok(row);
      assert.equal(row.permission, "EDIT");
      assert.equal(row.status, "DRAFT");
    });

    it("sent: granter sees grant", async () => {
      const res = await withAuthCookie(
        agent().get("/api/inbox/project-plan-access?direction=sent"),
        scenario.companyUserA.accessToken,
      );
      assert.equal(res.status, 200);
      assert.ok(
        res.body.data.items.some((i) => i.id === projectPlanAccessId),
      );
    });

    it("received: COMPANY role returns empty (intentional)", async () => {
      const res = await withAuthCookie(
        agent().get("/api/inbox/project-plan-access?direction=received"),
        scenario.companyUserA.accessToken,
      );
      assert.equal(res.status, 200);
      assert.equal(res.body.data.items.length, 0);
    });
  });

  describe("form delegations inbox", () => {
    it("received default: assignee sees delegation", async () => {
      const res = await withAuthCookie(
        agent().get("/api/inbox/form-delegations"),
        scenario.memberA2.accessToken,
      );
      assert.equal(res.status, 200);
      assert.ok(
        res.body.data.items.some((i) => i.id === formDelegationId),
      );
      const row = res.body.data.items.find((i) => i.id === formDelegationId);
      assert.equal(row.direction, "received");
      assert.equal(row.message, "لطفاً تکمیل کنید");
    });

    it("sent: sender sees delegation", async () => {
      const res = await withAuthCookie(
        agent().get("/api/inbox/form-delegations?direction=sent"),
        scenario.memberA.accessToken,
      );
      assert.equal(res.status, 200);
      assert.ok(
        res.body.data.items.some((i) => i.id === formDelegationId),
      );
    });

    it("sent: assignee does not see item in sent", async () => {
      const res = await withAuthCookie(
        agent().get("/api/inbox/form-delegations?direction=sent"),
        scenario.memberA2.accessToken,
      );
      assert.equal(res.status, 200);
      assert.equal(res.body.data.items.length, 0);
    });

    it("detail: assignee GET by list id returns 200", async () => {
      const res = await withAuthCookie(
        agent().get(`/api/inbox/form-delegations/${formDelegationId}`),
        scenario.memberA2.accessToken,
      );
      assert.equal(res.status, 200);
      assert.equal(res.body.data.delegation.id, formDelegationId);
      assert.equal(res.body.data.meta.viewerRole, "ASSIGNEE");
    });

    it("detail: sender GET same id returns 200 (sent tab)", async () => {
      const res = await withAuthCookie(
        agent().get(`/api/inbox/form-delegations/${formDelegationId}`),
        scenario.memberA.accessToken,
      );
      assert.equal(res.status, 200);
      assert.equal(res.body.data.delegation.id, formDelegationId);
      assert.equal(res.body.data.meta.viewerRole, "SENDER");
      assert.equal(res.body.data.meta.canSubmit, false);
      assert.equal(res.body.data.meta.displayStatus, "PENDING");
      assert.equal(res.body.data.meta.viewMode, "READ_ONLY_SNAPSHOT");
      assert.ok(res.body.data.meta.reasonsDisabled.includes("NOT_ASSIGNEE"));
    });

    it("detail: unrelated user gets 404", async () => {
      const res = await withAuthCookie(
        agent().get(`/api/inbox/form-delegations/${formDelegationId}`),
        scenario.memberB.accessToken,
      );
      assert.equal(res.status, 404);
    });

    it("detail: CLOSED collaboration still returns 200 with viewMode CLOSED", async () => {
      await prisma.formCollaboration.update({
        where: { id: formCollaborationId },
        data: { status: "APPLIED" },
      });
      await prisma.project.update({
        where: { id: formProjectId },
        data: { status: "ANALYSIS_PENDING" },
      });

      const assigneeRes = await withAuthCookie(
        agent().get(`/api/inbox/form-delegations/${formDelegationId}`),
        scenario.memberA2.accessToken,
      );
      assert.equal(assigneeRes.status, 200);
      assert.equal(assigneeRes.body.data.meta.displayStatus, "CLOSED");
      assert.equal(assigneeRes.body.data.meta.viewMode, "CLOSED");

      const senderRes = await withAuthCookie(
        agent().get(`/api/inbox/form-delegations/${formDelegationId}`),
        scenario.memberA.accessToken,
      );
      assert.equal(senderRes.status, 200);
      assert.equal(senderRes.body.data.meta.displayStatus, "CLOSED");
    });
  });

  it("pagination meta is present", async () => {
    const res = await withAuthCookie(
      agent().get("/api/inbox/project-access?page=1&limit=5"),
      scenario.memberA2.accessToken,
    );
    assert.equal(res.status, 200);
    assert.ok(res.body.data.pagination.totalItems >= 1);
    assert.equal(res.body.data.pagination.currentPage, 1);
    assert.equal(res.body.data.pagination.limit, 5);
  });

  it("limit above 50 is rejected with 400", async () => {
    const res = await withAuthCookie(
      agent().get("/api/inbox/project-access?limit=51"),
      scenario.memberA2.accessToken,
    );
    assert.equal(res.status, 400);
  });

  it("canAction project collaborator cannot send form delegations", async () => {
    const editProject = await prisma.project.create({
      data: {
        title: "__qa_test__ inbox edit form project",
        creatorId: scenario.memberA.user.id,
        companyId: scenario.companyA.id,
        mode: "SINGLE",
        status: "WAITING_FOR_FORM",
      },
    });

    await prisma.projectAccess.create({
      data: {
        projectId: editProject.id,
        userId: scenario.memberA2.user.id,
        canView: true,
        canAction: true,
        grantedByUserId: scenario.memberA.user.id,
      },
    });

    await prisma.formCollaboration.create({
      data: {
        projectId: editProject.id,
        createdById: scenario.memberA.user.id,
        status: "OPEN",
      },
    });

    const res = await withAuthCookie(
      agent()
        .post(`/api/project/${editProject.id}/form-collaboration/delegations`)
        .send({
          assigneeIds: [scenario.memberA.user.id],
          mode: "FILL",
        }),
      scenario.memberA2.accessToken,
    );

    assert.equal(res.status, 403);
  });
});
