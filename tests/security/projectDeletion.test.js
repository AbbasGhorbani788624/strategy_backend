const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../../src/prismaClient");
const { agent, withAuthCookie } = require("../helpers/testApp");
const {
  createTwoCompanyScenario,
  createTestUser,
  cleanupQaData,
} = require("../helpers/testFixtures");

const createBareProject = async ({ creatorId, companyId, titleSuffix }) =>
  prisma.project.create({
    data: {
      title: `__qa_test__ deletion ${titleSuffix} ${Date.now()}`,
      creatorId,
      companyId,
      mode: "SINGLE",
      status: "WAITING_FOR_FORM",
    },
  });

describe("Project deletion policy", { concurrency: false }, () => {
  let scenario;
  let superAdmin;

  before(async () => {
    scenario = await createTwoCompanyScenario();
    superAdmin = await createTestUser({
      role: "SUPER_ADMIN",
      companyId: null,
      usernameLabel: "superadmin",
    });
  });

  after(async () => {
    await cleanupQaData();
    if (superAdmin?.user?.id) {
      await prisma.user.delete({ where: { id: superAdmin.user.id } }).catch(() => {});
    }
  });

  it("1. MEMBER creator + no Strategy → delete succeeds", async () => {
    const project = await createBareProject({
      creatorId: scenario.memberA.user.id,
      companyId: scenario.companyA.id,
      titleSuffix: "member plain",
    });

    const res = await withAuthCookie(
      agent().delete(`/api/project/${project.id}`),
      scenario.memberA.accessToken,
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.deleted, true);

    const gone = await prisma.project.findUnique({ where: { id: project.id } });
    assert.equal(gone, null);
  });

  it("2. MEMBER non-creator → 403", async () => {
    const project = await createBareProject({
      creatorId: scenario.memberA.user.id,
      companyId: scenario.companyA.id,
      titleSuffix: "member other",
    });

    const res = await withAuthCookie(
      agent().delete(`/api/project/${project.id}`),
      scenario.memberA2.accessToken,
    );

    await prisma.project.delete({ where: { id: project.id } });

    assert.equal(res.status, 403);
    assert.equal(res.body.code, "PROJECT_DELETION_FORBIDDEN");
  });

  it("3. MEMBER creator + deletion lock → blocked", async () => {
    const project = await createBareProject({
      creatorId: scenario.memberA.user.id,
      companyId: scenario.companyA.id,
      titleSuffix: "locked",
    });

    await prisma.project.update({
      where: { id: project.id },
      data: {
        deletionLockedAt: new Date(),
        deletionLockedById: scenario.companyUserA.user.id,
      },
    });

    const res = await withAuthCookie(
      agent().delete(`/api/project/${project.id}`),
      scenario.memberA.accessToken,
    );

    await prisma.project.delete({ where: { id: project.id } });

    assert.equal(res.status, 409);
    assert.equal(res.body.code, "PROJECT_DELETION_BLOCKED");
    assert.equal(res.body.data.reason, "DELETION_LOCKED");
  });

  it("4. MEMBER creator + Strategy at cutoff state → blocked", async () => {
    const project = await createBareProject({
      creatorId: scenario.memberA.user.id,
      companyId: scenario.companyA.id,
      titleSuffix: "strategy cutoff",
    });

    await prisma.strategyPlan.create({
      data: {
        projectId: project.id,
        companyId: scenario.companyA.id,
        framework: "BSC",
        state: "MAP_GENERATION",
        status: "DRAFT",
      },
    });

    const res = await withAuthCookie(
      agent().delete(`/api/project/${project.id}`),
      scenario.memberA.accessToken,
    );

    await prisma.project.delete({ where: { id: project.id } });

    assert.equal(res.status, 409);
    assert.equal(res.body.data.reason, "STRATEGY_IN_PROGRESS");
  });

  it("5. MEMBER creator + Monitoring active → blocked", async () => {
    const project = await createBareProject({
      creatorId: scenario.memberA.user.id,
      companyId: scenario.companyA.id,
      titleSuffix: "monitoring member",
    });

    const plan = await prisma.strategyPlan.create({
      data: {
        projectId: project.id,
        companyId: scenario.companyA.id,
        framework: "BSC",
        state: "MONITORING",
        status: "ACTIVE",
      },
    });

    const res = await withAuthCookie(
      agent().delete(`/api/project/${project.id}`),
      scenario.memberA.accessToken,
    );

    await prisma.strategyPlan.delete({ where: { id: plan.id } });
    await prisma.project.delete({ where: { id: project.id } });

    assert.equal(res.status, 409);
    assert.equal(res.body.data.reason, "MONITORING_ACTIVE");
  });

  it("6. COMPANY same company non-creator → can delete plain project", async () => {
    const project = await createBareProject({
      creatorId: scenario.memberA.user.id,
      companyId: scenario.companyA.id,
      titleSuffix: "company delete",
    });

    const res = await withAuthCookie(
      agent().delete(`/api/project/${project.id}`),
      scenario.companyUserA.accessToken,
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.deleted, true);
  });

  it("7. COMPANY other company → 403", async () => {
    const project = await createBareProject({
      creatorId: scenario.memberA.user.id,
      companyId: scenario.companyA.id,
      titleSuffix: "company mismatch",
    });

    const companyB = await createTestUser({
      role: "COMPANY",
      companyId: scenario.companyB.id,
      usernameLabel: "companyB",
    });

    const res = await withAuthCookie(
      agent().delete(`/api/project/${project.id}`),
      companyB.accessToken,
    );

    await prisma.project.delete({ where: { id: project.id } });
    await prisma.user.delete({ where: { id: companyB.user.id } });

    assert.equal(res.status, 403);
    assert.equal(res.body.data.reason, "COMPANY_MISMATCH");
  });

  it("8. COMPANY can lock and unlock deletion", async () => {
    const project = await createBareProject({
      creatorId: scenario.memberA.user.id,
      companyId: scenario.companyA.id,
      titleSuffix: "lock api",
    });

    const lockRes = await withAuthCookie(
      agent()
        .post(`/api/project/${project.id}/deletion-lock`)
        .send({ reason: "QA lock" }),
      scenario.companyUserA.accessToken,
    );

    assert.equal(lockRes.status, 200);
    assert.ok(lockRes.body.deletionLockedAt);

    const locked = await prisma.project.findUnique({
      where: { id: project.id },
      select: { deletionLockedAt: true, deletionLockReason: true },
    });
    assert.ok(locked.deletionLockedAt);
    assert.equal(locked.deletionLockReason, "QA lock");

    const unlockRes = await withAuthCookie(
      agent().delete(`/api/project/${project.id}/deletion-lock`),
      scenario.companyUserA.accessToken,
    );

    assert.equal(unlockRes.status, 200);

    const unlocked = await prisma.project.findUnique({
      where: { id: project.id },
      select: { deletionLockedAt: true },
    });
    assert.equal(unlocked.deletionLockedAt, null);

    await prisma.project.delete({ where: { id: project.id } });
  });

  it("9. SUPER_ADMIN can delete project in another company", async () => {
    const project = await createBareProject({
      creatorId: scenario.memberA.user.id,
      companyId: scenario.companyA.id,
      titleSuffix: "super delete",
    });

    const res = await withAuthCookie(
      agent().delete(`/api/project/${project.id}`),
      superAdmin.accessToken,
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.deleted, true);
  });

  it("10. Monitoring active → normal DELETE archives (no cascade delete)", async () => {
    const project = await createBareProject({
      creatorId: scenario.memberA.user.id,
      companyId: scenario.companyA.id,
      titleSuffix: "archive company",
    });

    const plan = await prisma.strategyPlan.create({
      data: {
        projectId: project.id,
        companyId: scenario.companyA.id,
        framework: "BSC",
        state: "MONITORING",
        status: "ACTIVE",
      },
    });

    const res = await withAuthCookie(
      agent().delete(`/api/project/${project.id}`),
      scenario.companyUserA.accessToken,
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.archived, true);

    const stillThere = await prisma.project.findUnique({
      where: { id: project.id },
    });
    assert.ok(stillThere);
    assert.equal(stillThere.status, "ARCHIVED");

    const planStillThere = await prisma.strategyPlan.findUnique({
      where: { id: plan.id },
    });
    assert.ok(planStillThere);

    await prisma.strategyPlan.delete({ where: { id: plan.id } });
    await prisma.project.delete({ where: { id: project.id } });
  });

  it("10b. SUPER_ADMIN force delete removes project with monitoring", async () => {
    const project = await createBareProject({
      creatorId: scenario.memberA.user.id,
      companyId: scenario.companyA.id,
      titleSuffix: "force super",
    });

    await prisma.strategyPlan.create({
      data: {
        projectId: project.id,
        companyId: scenario.companyA.id,
        framework: "BSC",
        state: "MONITORING",
        status: "ACTIVE",
      },
    });

    const res = await withAuthCookie(
      agent().delete(`/api/project/${project.id}?force=true`),
      superAdmin.accessToken,
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.deleted, true);
    assert.equal(res.body.forced, true);

    const gone = await prisma.project.findUnique({ where: { id: project.id } });
    assert.equal(gone, null);
  });

  it("11. Plain project delete behavior unchanged for creator MEMBER", async () => {
    const project = await createBareProject({
      creatorId: scenario.memberB.user.id,
      companyId: scenario.companyB.id,
      titleSuffix: "member b plain",
    });

    const res = await withAuthCookie(
      agent().delete(`/api/project/${project.id}`),
      scenario.memberB.accessToken,
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.deleted, true);
  });

  it("12. IDOR: MEMBER company B cannot delete company A project", async () => {
    const project = await createBareProject({
      creatorId: scenario.memberA.user.id,
      companyId: scenario.companyA.id,
      titleSuffix: "idor delete",
    });

    const res = await withAuthCookie(
      agent().delete(`/api/project/${project.id}`),
      scenario.memberB.accessToken,
    );

    const stillExists = await prisma.project.findUnique({
      where: { id: project.id },
    });

    await prisma.project.delete({ where: { id: project.id } });

    assert.equal(res.status, 403);
    assert.ok(stillExists);
  });

  it("MEMBER cannot call deletion-lock API", async () => {
    const project = await createBareProject({
      creatorId: scenario.memberA.user.id,
      companyId: scenario.companyA.id,
      titleSuffix: "lock forbidden",
    });

    const res = await withAuthCookie(
      agent().post(`/api/project/${project.id}/deletion-lock`).send({}),
      scenario.memberA.accessToken,
    );

    await prisma.project.delete({ where: { id: project.id } });

    assert.equal(res.status, 403);
  });
});
