const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../../src/prismaClient");
const { agent, withAuthCookie } = require("../helpers/testApp");
const {
  createTwoCompanyScenario,
  cleanupQaData,
} = require("../helpers/testFixtures");
const {
  notifyProjectPlanCollaboratorActivity,
  notifyStrategyPlanCollaboratorActivity,
  PROJECT_PLAN_COLLABORATOR_ACTION,
  STRATEGY_PLAN_COLLABORATOR_ACTION,
} = require("../../src/services/planCollaboratorNotificationService");
const { PROJECT_COLLABORATOR_ACTION } = require("../../src/services/notificationDispatchService");
const { addIllustratedService } = require("../../src/services/illustratedService");
const { createPlanAction } = require("../../src/services/projectPlanService");
const { shouldSkipCollaboratorActivityDedupe } = require("../../src/utils/collaboratorActivityDedupe");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const memberUser = (scenario, which = "memberA2") => ({
  id: scenario[which].user.id,
  role: "MEMBER",
  companyId: scenario.companyA.id,
});

describe("collaborator activity notifications", { concurrency: false }, () => {
  let scenario;

  before(async () => {
    scenario = await createTwoCompanyScenario();
  });

  after(async () => {
    await cleanupQaData();
  });

  describe("project access", () => {
    let projectId;

    before(async () => {
      const project = await prisma.project.create({
        data: {
          title: "__qa_test__ collab notify project",
          creatorId: scenario.memberA.user.id,
          companyId: scenario.companyA.id,
          mode: "SINGLE",
          status: "FINAL_ANALYSIS",
        },
      });
      projectId = project.id;
    });

    it("Test 1: canView read does not notify granter", async () => {
      await prisma.projectAccess.create({
        data: {
          projectId,
          userId: scenario.memberA2.user.id,
          canView: true,
          canAction: false,
          canVisualize: false,
          grantedByUserId: scenario.memberA.user.id,
        },
      });

      const before = await prisma.notification.count({
        where: {
          userId: scenario.memberA.user.id,
          type: "PROJECT_COLLABORATOR_ACTIVITY",
        },
      });

      const res = await withAuthCookie(
        agent().get(`/api/project/${projectId}`),
        scenario.memberA2.accessToken,
      );
      assert.equal(res.status, 200);

      const after = await prisma.notification.count({
        where: {
          userId: scenario.memberA.user.id,
          type: "PROJECT_COLLABORATOR_ACTIVITY",
        },
      });
      assert.equal(after, before);
    });

    it("Test 2: canAction plan mutation notifies access granter (not project owner when they differ)", async () => {
      const project = await prisma.project.create({
        data: {
          title: "__qa_test__ collab canAction granter",
          creatorId: scenario.memberA.user.id,
          companyId: scenario.companyA.id,
          mode: "SINGLE",
          status: "FINAL_ANALYSIS",
        },
      });

      await prisma.projectAccess.create({
        data: {
          projectId: project.id,
          userId: scenario.memberA2.user.id,
          canView: true,
          canAction: true,
          canVisualize: false,
          grantedByUserId: scenario.companyUserA.user.id,
        },
      });

      const plan = await prisma.projectPlan.create({
        data: { projectId: project.id, status: "DRAFT" },
      });

      await createPlanAction(memberUser(scenario), plan.id, {
        title: "اقدام همکار",
      });
      await sleep(300);

      const ownerNotes = await prisma.notification.findMany({
        where: {
          userId: scenario.memberA.user.id,
          type: "PROJECT_PLAN_COLLABORATOR_ACTIVITY",
        },
      });
      const granterNotes = await prisma.notification.findMany({
        where: {
          userId: scenario.companyUserA.user.id,
          type: "PROJECT_PLAN_COLLABORATOR_ACTIVITY",
        },
      });

      assert.equal(ownerNotes.length, 0);
      assert.ok(granterNotes.length >= 1);
      assert.equal(granterNotes[0].metadata.action, "ACTION_CREATED");
    });

    it("Test 3: canVisualize illustrated mark notifies granter", async () => {
      const project = await prisma.project.create({
        data: {
          title: "__qa_test__ collab visualize",
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
          canVisualize: true,
          grantedByUserId: scenario.memberA.user.id,
        },
      });

      await addIllustratedService(scenario.memberA2.user.id, project.id);
      await sleep(200);

      const notes = await prisma.notification.findMany({
        where: {
          userId: scenario.memberA.user.id,
          type: "PROJECT_COLLABORATOR_ACTIVITY",
        },
      });
      const match = notes.find(
        (n) =>
          n.referenceId === project.id &&
          n.metadata?.action === PROJECT_COLLABORATOR_ACTION.ILLUSTRATED_MARKED,
      );
      assert.ok(match);
    });

    it("Test 4: canView only cannot mutate plan and produces no activity notification", async () => {
      const project = await prisma.project.create({
        data: {
          title: "__qa_test__ collab view only plan",
          creatorId: scenario.memberA.user.id,
          companyId: scenario.companyA.id,
          mode: "SINGLE",
          status: "FINAL_ANALYSIS",
        },
      });

      await prisma.projectAccess.create({
        data: {
          projectId: project.id,
          userId: scenario.memberA2.user.id,
          canView: true,
          canAction: false,
          grantedByUserId: scenario.memberA.user.id,
        },
      });

      const plan = await prisma.projectPlan.create({
        data: { projectId: project.id, status: "DRAFT" },
      });

      const before = await prisma.notification.count({
        where: { userId: scenario.memberA.user.id },
      });

      await assert.rejects(
        () =>
          createPlanAction(memberUser(scenario), plan.id, {
            title: "blocked",
          }),
        (err) => err.statusCode === 403,
      );

      const after = await prisma.notification.count({
        where: { userId: scenario.memberA.user.id },
      });
      assert.equal(after, before);
    });
  });

  describe("action plan access", () => {
    it("Test 8–10: EDIT grantee mutations notify granter", async () => {
      const project = await prisma.project.create({
        data: {
          title: "__qa_test__ collab plan access",
          creatorId: scenario.memberA.user.id,
          companyId: scenario.companyA.id,
          mode: "SINGLE",
          status: "FINAL_ANALYSIS",
        },
      });
      const plan = await prisma.projectPlan.create({
        data: { projectId: project.id, status: "DRAFT" },
      });

      await prisma.projectPlanAccess.create({
        data: {
          companyId: scenario.companyA.id,
          projectPlanId: plan.id,
          userId: scenario.memberA2.user.id,
          permission: "EDIT",
          grantedByUserId: scenario.companyUserA.user.id,
        },
      });

      await notifyProjectPlanCollaboratorActivity(
        scenario.memberA2.user.id,
        plan.id,
        PROJECT_PLAN_COLLABORATOR_ACTION.ACTION_CREATED,
      );
      await notifyProjectPlanCollaboratorActivity(
        scenario.memberA2.user.id,
        plan.id,
        PROJECT_PLAN_COLLABORATOR_ACTION.ACTION_UPDATED,
      );
      await notifyProjectPlanCollaboratorActivity(
        scenario.memberA2.user.id,
        plan.id,
        PROJECT_PLAN_COLLABORATOR_ACTION.PROGRESS_UPDATED,
      );

      const notes = await prisma.notification.findMany({
        where: {
          userId: scenario.companyUserA.user.id,
          type: "PROJECT_PLAN_COLLABORATOR_ACTIVITY",
        },
        orderBy: { createdAt: "asc" },
      });

      const actions = notes.map((n) => n.metadata.action);
      assert.ok(actions.includes("ACTION_CREATED"));
      assert.ok(actions.includes("ACTION_UPDATED"));
      assert.ok(actions.includes("PROGRESS_UPDATED"));
    });

    it("Test 11: granter acting as collaborator does not self-notify", async () => {
      const project = await prisma.project.create({
        data: {
          title: "__qa_test__ collab plan self",
          creatorId: scenario.memberA.user.id,
          companyId: scenario.companyA.id,
          mode: "SINGLE",
          status: "FINAL_ANALYSIS",
        },
      });
      const plan = await prisma.projectPlan.create({
        data: { projectId: project.id, status: "DRAFT" },
      });

      await prisma.projectPlanAccess.create({
        data: {
          companyId: scenario.companyA.id,
          projectPlanId: plan.id,
          userId: scenario.memberA2.user.id,
          permission: "EDIT",
          grantedByUserId: scenario.memberA2.user.id,
        },
      });

      const result = await notifyProjectPlanCollaboratorActivity(
        scenario.memberA2.user.id,
        plan.id,
        PROJECT_PLAN_COLLABORATOR_ACTION.ACTION_CREATED,
      );
      assert.equal(result, null);
    });
  });

  describe("strategy plan access", () => {
    it("Test 12: EDIT mutation notifies granter", async () => {
      const project = await prisma.project.create({
        data: {
          title: "__qa_test__ collab strategy",
          creatorId: scenario.memberA.user.id,
          companyId: scenario.companyA.id,
          mode: "SINGLE",
          status: "WAITING_FOR_FORM",
        },
      });
      const plan = await prisma.strategyPlan.create({
        data: {
          projectId: project.id,
          companyId: scenario.companyA.id,
          framework: "OKR",
          status: "DRAFT",
          state: "TABLE_VALIDATION",
        },
      });

      await prisma.strategyPlanAccess.create({
        data: {
          companyId: scenario.companyA.id,
          planId: plan.id,
          userId: scenario.memberA2.user.id,
          permission: "EDIT",
          grantedByUserId: scenario.companyUserA.user.id,
        },
      });

      await notifyStrategyPlanCollaboratorActivity(
        scenario.memberA2.user.id,
        plan.id,
        STRATEGY_PLAN_COLLABORATOR_ACTION.TABLE_APPROVED,
      );

      const notes = await prisma.notification.findMany({
        where: {
          userId: scenario.companyUserA.user.id,
          type: "STRATEGY_PLAN_COLLABORATOR_ACTIVITY",
        },
      });
      assert.ok(notes.some((n) => n.metadata.action === "TABLE_APPROVED"));
    });

    it("Test 13: VIEW access does not produce activity notification", async () => {
      const project = await prisma.project.create({
        data: {
          title: "__qa_test__ collab strategy view",
          creatorId: scenario.memberA.user.id,
          companyId: scenario.companyA.id,
          mode: "SINGLE",
          status: "WAITING_FOR_FORM",
        },
      });
      const plan = await prisma.strategyPlan.create({
        data: {
          projectId: project.id,
          companyId: scenario.companyA.id,
          framework: "OKR",
          status: "DRAFT",
          state: "TABLE_VALIDATION",
        },
      });

      await prisma.strategyPlanAccess.create({
        data: {
          companyId: scenario.companyA.id,
          planId: plan.id,
          userId: scenario.memberA2.user.id,
          permission: "VIEW",
          grantedByUserId: scenario.companyUserA.user.id,
        },
      });

      const result = await notifyStrategyPlanCollaboratorActivity(
        scenario.memberA2.user.id,
        plan.id,
        STRATEGY_PLAN_COLLABORATOR_ACTION.KPI_APPROVED,
      );
      assert.equal(result, null);
    });

    it("Test 14: self mutation does not notify", async () => {
      const project = await prisma.project.create({
        data: {
          title: "__qa_test__ collab strategy self",
          creatorId: scenario.memberA.user.id,
          companyId: scenario.companyA.id,
          mode: "SINGLE",
          status: "WAITING_FOR_FORM",
        },
      });
      const plan = await prisma.strategyPlan.create({
        data: {
          projectId: project.id,
          companyId: scenario.companyA.id,
          framework: "BSC",
          status: "DRAFT",
          state: "MAP_VALIDATION",
        },
      });

      await prisma.strategyPlanAccess.create({
        data: {
          companyId: scenario.companyA.id,
          planId: plan.id,
          userId: scenario.memberA2.user.id,
          permission: "EDIT",
          grantedByUserId: scenario.memberA2.user.id,
        },
      });

      const result = await notifyStrategyPlanCollaboratorActivity(
        scenario.memberA2.user.id,
        plan.id,
        STRATEGY_PLAN_COLLABORATOR_ACTION.MAP_VALIDATED,
      );
      assert.equal(result, null);
    });
  });

  describe("dedupe", () => {
    it("same actor/recipient/type/reference/action within window dedupes", async () => {
      const granterId = scenario.memberA.user.id;
      const actorId = scenario.memberA2.user.id;
      const projectId = "dedupe-proj-ref";

      await prisma.notification.create({
        data: {
          userId: granterId,
          type: "PROJECT_COLLABORATOR_ACTIVITY",
          title: "t",
          message: "m",
          referenceId: projectId,
          referenceType: "PROJECT",
          metadata: {
            actorUserId: actorId,
            action: PROJECT_COLLABORATOR_ACTION.ILLUSTRATED_MARKED,
          },
          isRead: false,
        },
      });

      const skip = await shouldSkipCollaboratorActivityDedupe({
        recipientId: granterId,
        type: "PROJECT_COLLABORATOR_ACTIVITY",
        referenceId: projectId,
        actorUserId: actorId,
        action: PROJECT_COLLABORATOR_ACTION.ILLUSTRATED_MARKED,
      });
      assert.equal(skip, true);
    });

    it("different action within window is not deduped", async () => {
      const granterId = scenario.memberA.user.id;
      const actorId = scenario.memberA2.user.id;
      const projectId = "dedupe-proj-ref-2";

      await prisma.notification.create({
        data: {
          userId: granterId,
          type: "PROJECT_COLLABORATOR_ACTIVITY",
          title: "t",
          message: "m",
          referenceId: projectId,
          referenceType: "PROJECT",
          metadata: {
            actorUserId: actorId,
            action: PROJECT_COLLABORATOR_ACTION.ILLUSTRATED_MARKED,
          },
          isRead: false,
        },
      });

      const skip = await shouldSkipCollaboratorActivityDedupe({
        recipientId: granterId,
        type: "PROJECT_COLLABORATOR_ACTIVITY",
        referenceId: projectId,
        actorUserId: actorId,
        action: PROJECT_COLLABORATOR_ACTION.ILLUSTRATED_REMOVED,
      });
      assert.equal(skip, false);
    });
  });
});

describe("form collaboration activity notifications (mocked)", () => {
  const CREATOR_ID = "granter-user-id";
  const ASSIGNEE_ID = "assignee-user-id";
  const PROJECT_ID = "form-project-id";
  const COLLAB_ID = "collab-id";
  const DELEGATION_ID = "delegation-id";

  const baseProject = {
    id: PROJECT_ID,
    title: "Form Project",
    creatorId: CREATOR_ID,
    companyId: "company-id",
    status: "WAITING_FOR_FORM",
    mode: "SINGLE",
    formId: "form-id",
    multiAnalysisFormId: null,
  };

  const delegation = {
    id: DELEGATION_ID,
    assigneeId: ASSIGNEE_ID,
    senderId: CREATOR_ID,
    mode: "FILL",
    status: "PENDING",
  };

  const openCollaboration = {
    id: COLLAB_ID,
    projectId: PROJECT_ID,
    status: "OPEN",
    responses: [],
    delegations: [delegation],
  };

  const mockForm = {
    categories: [
      {
        id: "category-1",
        title: "Cat",
        questions: [{ id: "q1", label: "Q1", type: "TEXT", options: [] }],
        children: [],
      },
    ],
  };

  function installMocks(notificationSink) {
    const prismaClientPath = require.resolve("../../src/prismaClient");
    const tierServicePath = require.resolve(
      "../../src/services/companyAnalysisTierService",
    );
    const formLoaderPath = require.resolve(
      "../../src/services/formCollaborationFormLoader",
    );
    const dedupePath = require.resolve("../../src/utils/collaboratorActivityDedupe");
    const servicePath = require.resolve(
      "../../src/services/formCollaborationService",
    );

    require.cache[dedupePath] = {
      id: dedupePath,
      filename: dedupePath,
      loaded: true,
      exports: {
        shouldSkipCollaboratorActivityDedupe: async () => false,
      },
    };

    require.cache[prismaClientPath] = {
      id: prismaClientPath,
      filename: prismaClientPath,
      loaded: true,
      exports: {
        project: { findUnique: async () => baseProject },
        formCollaboration: {
          findFirst: async () => openCollaboration,
          findUnique: async () => null,
        },
        formCollaborationResponse: {
          findUnique: async () => null,
          upsert: async ({ create, update }) => ({
            id: "response-id",
            ...(create || update),
          }),
        },
        formCollaborationDelegation: {
          update: async () => ({}),
        },
        user: {
          findUnique: async ({ where }) => ({
            username: where.id === ASSIGNEE_ID ? "assignee" : "granter",
          }),
        },
        notification: {
          create: async (args) => {
            notificationSink.push(args.data);
            return args.data;
          },
        },
      },
    };

    require.cache[tierServicePath] = {
      id: tierServicePath,
      filename: tierServicePath,
      loaded: true,
      exports: { assertFormInEnabledTier: async () => {} },
    };

    require.cache[formLoaderPath] = {
      id: formLoaderPath,
      filename: formLoaderPath,
      loaded: true,
      exports: { getProjectForm: async () => mockForm },
    };

    const dispatchPath = require.resolve(
      "../../src/services/notificationDispatchService",
    );
    delete require.cache[dispatchPath];
    delete require.cache[servicePath];
    return require(servicePath);
  }

  it("Test 5: draft save does not notify granter", async () => {
    const sink = [];
    const { submitMyCollaborationResponseService } = installMocks(sink);
    await submitMyCollaborationResponseService(
      PROJECT_ID,
      ASSIGNEE_ID,
      { q1: "draft" },
      { submit: false },
    );
    assert.equal(sink.length, 0);
  });

  it("Test 6: final submit notifies delegation sender (granter)", async () => {
    const sink = [];
    const { submitMyCollaborationResponseService } = installMocks(sink);
    await submitMyCollaborationResponseService(
      PROJECT_ID,
      ASSIGNEE_ID,
      { q1: "final" },
      { submit: true },
    );
    assert.equal(sink.length, 1);
    assert.equal(sink[0].userId, CREATOR_ID);
    assert.equal(sink[0].type, "FORM_COLLABORATION_RESPONSE_SUBMITTED");
    assert.equal(sink[0].metadata.action, "FORM_RESPONSE_SUBMITTED");
  });

  it("Test 7: READ_ONLY assignee flow does not reach submit notification", async () => {
    const sink = [];
    const readOnlyDelegation = { ...delegation, mode: "READ_ONLY" };
    const collab = {
      ...openCollaboration,
      delegations: [readOnlyDelegation],
    };

    const prismaClientPath = require.resolve("../../src/prismaClient");
    const tierServicePath = require.resolve(
      "../../src/services/companyAnalysisTierService",
    );
    const formLoaderPath = require.resolve(
      "../../src/services/formCollaborationFormLoader",
    );
    const dedupePath = require.resolve("../../src/utils/collaboratorActivityDedupe");
    const servicePath = require.resolve(
      "../../src/services/formCollaborationService",
    );

    require.cache[dedupePath] = {
      id: dedupePath,
      filename: dedupePath,
      loaded: true,
      exports: { shouldSkipCollaboratorActivityDedupe: async () => false },
    };

    require.cache[prismaClientPath] = {
      id: prismaClientPath,
      filename: prismaClientPath,
      loaded: true,
      exports: {
        project: { findUnique: async () => baseProject },
        formCollaboration: {
          findFirst: async () => collab,
          findUnique: async () => null,
        },
        formCollaborationResponse: {
          findUnique: async () => null,
          upsert: async () => ({}),
        },
        formCollaborationDelegation: { update: async () => ({}) },
        user: { findUnique: async () => ({ username: "x" }) },
        notification: {
          create: async (args) => {
            sink.push(args.data);
            return args.data;
          },
        },
      },
    };

    require.cache[tierServicePath] = {
      id: tierServicePath,
      filename: tierServicePath,
      loaded: true,
      exports: { assertFormInEnabledTier: async () => {} },
    };

    require.cache[formLoaderPath] = {
      id: formLoaderPath,
      filename: formLoaderPath,
      loaded: true,
      exports: { getProjectForm: async () => mockForm },
    };

    const dispatchPath = require.resolve(
      "../../src/services/notificationDispatchService",
    );
    delete require.cache[dispatchPath];
    delete require.cache[servicePath];
    const { submitMyCollaborationResponseService } = require(servicePath);

    await assert.rejects(
      () =>
        submitMyCollaborationResponseService(
          PROJECT_ID,
          ASSIGNEE_ID,
          { q1: "x" },
          { submit: true },
        ),
      (err) => err.statusCode === 403,
    );
    assert.equal(sink.length, 0);
  });
});
