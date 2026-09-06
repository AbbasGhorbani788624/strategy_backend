const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("crypto");
const prisma = require("../../src/prismaClient");
const { agent, withAuthCookie } = require("../helpers/testApp");
const {
  createTestUser,
  createTwoCompanyScenario,
  cleanupQaData,
} = require("../helpers/testFixtures");

describe("change-credentials authorization", { concurrency: false }, () => {
  let scenario;

  before(async () => {
    scenario = await createTwoCompanyScenario();
  });

  after(async () => {
    await cleanupQaData();
  });

  const patchCredentials = (token, body) =>
    withAuthCookie(agent().patch("/api/auth/change-credentials"), token).send(
      body,
    );

  it("TEST A: MEMBER can change own credentials", async () => {
    const newUsername = `__qa_test__self_${Date.now()}`;
    const res = await patchCredentials(scenario.memberA.accessToken, {
      userId: scenario.memberA.user.id,
      username: newUsername,
      oldPassword: scenario.memberA.password,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const updated = await prisma.user.findUnique({
      where: { id: scenario.memberA.user.id },
      select: { username: true },
    });
    assert.equal(updated.username, newUsername);
  });

  it("TEST B: MEMBER cannot change another MEMBER credentials (cross-company)", async () => {
    const res = await patchCredentials(scenario.memberA.accessToken, {
      userId: scenario.memberB.user.id,
      username: `__qa_test__blocked_${Date.now()}`,
      oldPassword: scenario.memberB.password,
    });

    assert.equal(res.status, 403);
  });

  it("TEST C: MEMBER cannot change another MEMBER credentials (same company)", async () => {
    const originalUsername = scenario.memberA2.user.username;
    const blockedUsername = `__qa_test__blocked_same_co_${Date.now()}`;

    const res = await patchCredentials(scenario.memberA.accessToken, {
      userId: scenario.memberA2.user.id,
      username: blockedUsername,
      oldPassword: scenario.memberA2.password,
    });

    assert.equal(res.status, 403);

    const unchanged = await prisma.user.findUnique({
      where: { id: scenario.memberA2.user.id },
      select: { username: true },
    });
    assert.equal(unchanged.username, originalUsername);
  });

  it("TEST D: MEMBER cannot change COMPANY user credentials", async () => {
    const res = await patchCredentials(scenario.memberA.accessToken, {
      userId: scenario.companyUserA.user.id,
      username: `__qa_test__blocked_company_${Date.now()}`,
      oldPassword: scenario.companyUserA.password,
    });

    assert.equal(res.status, 403);
  });

  it("TEST D2: MEMBER cannot bypass authorization with extra body fields", async () => {
    const res = await patchCredentials(scenario.memberA.accessToken, {
      userId: scenario.memberB.user.id,
      username: `__qa_test__mass_${Date.now()}`,
      oldPassword: scenario.memberA.password,
      role: "SUPER_ADMIN",
      companyId: scenario.companyA.id,
      isAdmin: true,
    });

    assert.equal(res.status, 403);

    const target = await prisma.user.findUnique({
      where: { id: scenario.memberB.user.id },
      select: { role: true, companyId: true },
    });
    assert.equal(target.role, "MEMBER");
    assert.equal(target.companyId, scenario.companyB.id);
  });

  it("TEST E: COMPANY can change credentials of member in same company", async () => {
    const newUsername = `__qa_test__company_ok_${Date.now()}`;
    const res = await patchCredentials(scenario.companyUserA.accessToken, {
      userId: scenario.memberA2.user.id,
      username: newUsername,
      oldPassword: scenario.memberA2.password,
    });

    assert.equal(res.status, 200);

    const updated = await prisma.user.findUnique({
      where: { id: scenario.memberA2.user.id },
      select: { username: true },
    });
    assert.equal(updated.username, newUsername);
  });

  it("TEST E2: COMPANY cannot change credentials of member in another company", async () => {
    const res = await patchCredentials(scenario.companyUserA.accessToken, {
      userId: scenario.memberB.user.id,
      username: `__qa_test__cross_co_${Date.now()}`,
      oldPassword: scenario.memberB.password,
    });

    assert.equal(res.status, 403);
  });

  it("TEST F: SUPER_ADMIN can change credentials of another user", async () => {
    const superAdmin = await createTestUser({
      role: "SUPER_ADMIN",
      companyId: null,
      usernameLabel: "super_admin",
    });

    const newUsername = `__qa_test__admin_change_${Date.now()}`;
    const res = await patchCredentials(superAdmin.accessToken, {
      userId: scenario.memberB.user.id,
      username: newUsername,
      oldPassword: scenario.memberB.password,
    });

    assert.equal(res.status, 200);

    const updated = await prisma.user.findUnique({
      where: { id: scenario.memberB.user.id },
      select: { username: true },
    });
    assert.equal(updated.username, newUsername);
  });

  it("rejects invalid userId UUID", async () => {
    const res = await patchCredentials(scenario.memberA.accessToken, {
      userId: "not-a-uuid",
      username: "whatever",
      oldPassword: scenario.memberA.password,
    });

    assert.equal(res.status, 400);
  });

  it("returns 404 for nonexistent userId", async () => {
    const res = await patchCredentials(scenario.memberA.accessToken, {
      userId: randomUUID(),
      username: "whatever",
      oldPassword: scenario.memberA.password,
    });

    assert.ok([403, 404].includes(res.status));
  });
});
