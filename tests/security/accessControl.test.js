const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../../src/prismaClient");
const { agent, withAuthCookie } = require("../helpers/testApp");
const {
  createTwoCompanyScenario,
  cleanupQaData,
} = require("../helpers/testFixtures");

describe("RBAC and IDOR", { concurrency: false }, () => {
  let scenario;

  before(async () => {
    scenario = await createTwoCompanyScenario();
  });

  after(async () => {
    await cleanupQaData();
  });

  it("MEMBER cannot access GET /api/companyuser/members (COMPANY/SUPER_ADMIN only)", async () => {
    const res = await withAuthCookie(
      agent().get("/api/companyuser/members"),
      scenario.memberA.accessToken,
    );
    assert.equal(res.status, 403);
  });

  it("MEMBER cannot access GET /api/project-plans (COMPANY/SUPER_ADMIN only)", async () => {
    const res = await withAuthCookie(
      agent().get("/api/project-plans"),
      scenario.memberA.accessToken,
    );
    assert.equal(res.status, 403);
  });

  it("MEMBER from company B cannot read notification of company A user", async () => {
    const notification = await prisma.notification.create({
      data: {
        userId: scenario.memberA.user.id,
        type: "PROJECT_ACCESS_GRANTED",
        title: "QA test notification",
        message: "test",
      },
    });

    const res = await withAuthCookie(
      agent().patch(`/api/notification/${notification.id}/read`),
      scenario.memberB.accessToken,
    );

    await prisma.notification.delete({ where: { id: notification.id } });

    assert.ok([403, 404].includes(res.status));
  });

  it("User B cannot GET project owned by User A without access grant", async () => {
    const project = await prisma.project.create({
      data: {
        title: "__qa_test__ project idor",
        creatorId: scenario.memberA.user.id,
        companyId: scenario.companyA.id,
        mode: "SINGLE",
        status: "WAITING_FOR_FORM",
      },
    });

    const res = await withAuthCookie(
      agent().get(`/api/project/${project.id}`),
      scenario.memberB.accessToken,
    );

    await prisma.project.delete({ where: { id: project.id } });

    assert.equal(res.status, 403);
  });

  it("User B cannot DELETE project owned by User A", async () => {
    const project = await prisma.project.create({
      data: {
        title: "__qa_test__ delete idor",
        creatorId: scenario.memberA.user.id,
        companyId: scenario.companyA.id,
        mode: "SINGLE",
        status: "WAITING_FOR_FORM",
      },
    });

    const res = await withAuthCookie(
      agent().delete(`/api/project/${project.id}`),
      scenario.memberB.accessToken,
    );

    const stillExists = await prisma.project.findUnique({
      where: { id: project.id },
    });

    await prisma.project.delete({ where: { id: project.id } });

    assert.ok([403, 404].includes(res.status));
    assert.ok(stillExists, "Project should not be deleted by unauthorized user");
  });

  it("MEMBER cannot change another user credentials", async () => {
    const res = await withAuthCookie(
      agent().patch("/api/auth/change-credentials"),
      scenario.memberA.accessToken,
    ).send({
      userId: scenario.memberB.user.id,
      username: `__qa_test__blocked_${Date.now()}`,
      oldPassword: scenario.memberB.password,
    });

    assert.equal(res.status, 403, "MEMBER must not change another user's credentials");
  });

  it("SQL injection payload in project search query does not crash", async () => {
    const payload = encodeURIComponent("' OR 1=1 --");
    const res = await withAuthCookie(
      agent().get(`/api/project/search?q=${payload}`),
      scenario.memberA.accessToken,
    );

    assert.ok([200, 400, 404, 500].includes(res.status));
    assert.ok(!res.body.stack);
    assert.ok(!String(JSON.stringify(res.body)).includes("SELECT"));
  });
});
