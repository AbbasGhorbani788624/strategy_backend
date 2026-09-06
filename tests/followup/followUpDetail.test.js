const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("crypto");
const prisma = require("../../src/prismaClient");
const { agent, withAuthCookie } = require("../helpers/testApp");
const {
  createTwoCompanyScenario,
  cleanupQaData,
} = require("../helpers/testFixtures");

describe("GET /api/follow-up/follow-ups/:id", { concurrency: false }, () => {
  let scenario;
  let followUpA;
  let projectA;

  before(async () => {
    scenario = await createTwoCompanyScenario();

    projectA = await prisma.project.create({
      data: {
        title: "__qa_test__ followup project",
        creatorId: scenario.memberA.user.id,
        companyId: scenario.companyA.id,
        mode: "SINGLE",
        status: "WAITING_FOR_FORM",
      },
    });

    followUpA = await prisma.followUpRequest.create({
      data: {
        title: "__qa_test__ follow-up detail",
        projectId: projectA.id,
        userId: scenario.memberA.user.id,
        responses: { q1: "answer" },
        status: "PENDING",
      },
    });
  });

  after(async () => {
    await cleanupQaData();
  });

  it("returns 401 without token", async () => {
    const res = await agent().get(`/api/follow-up/follow-ups/${followUpA.id}`);
    assert.equal(res.status, 401);
  });

  it("returns 401 with invalid token", async () => {
    const res = await withAuthCookie(
      agent().get(`/api/follow-up/follow-ups/${followUpA.id}`),
      "invalid.token.value",
    );
    assert.equal(res.status, 401);
  });

  it("returns follow-up detail for owner", async () => {
    const res = await withAuthCookie(
      agent().get(`/api/follow-up/follow-ups/${followUpA.id}`),
      scenario.memberA.accessToken,
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, followUpA.id);
    assert.equal(res.body.data.title, followUpA.title);
    assert.ok(res.body.data.project);
    assert.ok(!("userId" in res.body.data));
  });

  it("returns 404 for nonexistent follow-up ID", async () => {
    const res = await withAuthCookie(
      agent().get(
        `/api/follow-up/follow-ups/00000000-0000-4000-8000-000000000099`,
      ),
      scenario.memberA.accessToken,
    );

    assert.equal(res.status, 404);
  });

  it("returns 400 for invalid follow-up ID format", async () => {
    const res = await withAuthCookie(
      agent().get("/api/follow-up/follow-ups/not-a-uuid"),
      scenario.memberA.accessToken,
    );

    assert.equal(res.status, 400);
  });

  it("returns 403 when another user accesses the follow-up", async () => {
    const res = await withAuthCookie(
      agent().get(`/api/follow-up/follow-ups/${followUpA.id}`),
      scenario.memberB.accessToken,
    );

    assert.equal(res.status, 403);
  });

  it("returns 403 for cross-company member access", async () => {
    const res = await withAuthCookie(
      agent().get(`/api/follow-up/follow-ups/${followUpA.id}`),
      scenario.memberA2.accessToken,
    );

    assert.equal(res.status, 403);
  });
});
