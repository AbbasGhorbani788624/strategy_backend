const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { agent, withAuthCookie } = require("../helpers/testApp");
const {
  createTestUser,
  createTestCompany,
  cleanupQaData,
} = require("../helpers/testFixtures");

describe("input validation", { concurrency: false }, () => {
  let memberToken;
  let companyToken;

  before(async () => {
    const company = await createTestCompany("validation");
    const member = await createTestUser({
      role: "MEMBER",
      companyId: company.id,
      usernameLabel: "validation_member",
    });
    memberToken = member.accessToken;

    const companyUser = await createTestUser({
      role: "COMPANY",
      companyId: company.id,
      usernameLabel: "validation_company",
    });
    companyToken = companyUser.accessToken;
  });

  after(async () => {
    await cleanupQaData();
  });

  const authed = (method, path) =>
    withAuthCookie(agent()[method](path), memberToken);

  it("POST /api/auth/login rejects empty object", async () => {
    const res = await agent().post("/api/auth/login").send({});
    assert.equal(res.status, 400);
    assert.ok(res.body.errors?.length >= 2);
  });

  it("POST /api/auth/login rejects whitespace username (passes yup min(3), returns 404)", async () => {
    const res = await agent()
      .post("/api/auth/login")
      .send({ username: "   ", password: "abc" });
    // BUG: yup does not trim — whitespace username passes validation then returns 404
    assert.equal(res.status, 404);
  });

  it("POST /api/auth/login rejects array instead of object", async () => {
    const res = await agent()
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("[1,2,3]");
    assert.ok([400, 500].includes(res.status));
  });

  it("PUT /api/project/:id/access rejects missing colleagueIds", async () => {
    const res = await authed("put", "/api/project/00000000-0000-4000-8000-000000000001/access").send(
      {},
    );
    assert.equal(res.status, 400);
    assert.ok(Array.isArray(res.body.errors));
  });

  it("PUT /api/project/:id/access rejects invalid UUID in colleagueIds", async () => {
    const res = await authed("put", "/api/project/00000000-0000-4000-8000-000000000001/access").send(
      { colleagueIds: ["not-a-uuid"] },
    );
    assert.equal(res.status, 400);
  });

  it("PATCH /api/auth/change-credentials rejects missing userId", async () => {
    const res = await authed("patch", "/api/auth/change-credentials").send({
      newPassword: "newpass123",
      oldPassword: "oldpass123",
    });
    assert.equal(res.status, 400);
  });

  it("PATCH /api/auth/change-credentials rejects invalid userId UUID", async () => {
    const res = await authed("patch", "/api/auth/change-credentials").send({
      userId: "invalid",
      newPassword: "newpass123",
      oldPassword: "oldpass123",
    });
    assert.equal(res.status, 400);
  });

  it("GET /api/strategy-plans/active rejects invalid framework enum", async () => {
    const res = await authed("get", "/api/strategy-plans/active?framework=INVALID");
    assert.equal(res.status, 400);
  });

  it("GET /api/project-plans rejects negative page", async () => {
    const res = await withAuthCookie(
      agent().get("/api/project-plans?page=-1"),
      companyToken,
    );
    assert.equal(res.status, 400);
  });

  it("GET /api/project-plans rejects limit=0", async () => {
    const res = await withAuthCookie(
      agent().get("/api/project-plans?limit=0"),
      companyToken,
    );
    assert.equal(res.status, 400);
  });

  it("GET /api/project-plans rejects extremely large limit", async () => {
    const res = await withAuthCookie(
      agent().get("/api/project-plans?limit=999999"),
      companyToken,
    );
    assert.equal(res.status, 400);
  });

  it("malformed JSON returns error without crashing server", async () => {
    const res = await agent()
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{ broken json");

    assert.ok([400, 500].includes(res.status));
    assert.ok(!res.body.stack);
  });
});
