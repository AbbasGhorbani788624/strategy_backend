const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { agent, withAuthCookie } = require("../helpers/testApp");
const {
  createTestUser,
  createTestCompany,
  cleanupQaData,
} = require("../helpers/testFixtures");

describe("authentication", { concurrency: false }, () => {
  let testUser;

  before(async () => {
    const company = await createTestCompany("auth");
    testUser = await createTestUser({
      role: "MEMBER",
      companyId: company.id,
      usernameLabel: "auth_member",
    });
  });

  after(async () => {
    await cleanupQaData();
  });

  it("POST /api/auth/login rejects missing credentials with 400", async () => {
    const res = await agent().post("/api/auth/login").send({});
    assert.equal(res.status, 400);
    assert.ok(Array.isArray(res.body.errors));
  });

  it("POST /api/auth/login rejects invalid credentials", async () => {
    const res = await agent()
      .post("/api/auth/login")
      .send({ username: testUser.user.username, password: "wrong-password" });
    assert.ok([403, 404].includes(res.status));
    assert.equal(res.body.success, false);
  });

  it("POST /api/auth/login succeeds with valid credentials and sets cookies", async () => {
    const res = await agent()
      .post("/api/auth/login")
      .send({ username: testUser.user.username, password: testUser.password });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data?.user?.id);
    assert.ok(res.headers["set-cookie"]?.some((c) => c.startsWith("access_token=")));
    assert.ok(res.headers["set-cookie"]?.some((c) => c.startsWith("refresh_token=")));
  });

  it("GET /api/auth/me returns 401 without token", async () => {
    const res = await agent().get("/api/auth/me");
    assert.equal(res.status, 401);
    assert.match(res.body.error, /توکن/);
  });

  it("GET /api/auth/me returns 401 with malformed token", async () => {
    const res = await withAuthCookie(agent().get("/api/auth/me"), "not.a.jwt");
    assert.equal(res.status, 401);
  });

  it("GET /api/auth/me returns 401 with token signed by wrong secret", async () => {
    const badToken = jwt.sign(
      { userId: testUser.user.id, role: "MEMBER" },
      "wrong-secret-key-for-test",
      { expiresIn: "1h" },
    );
    const res = await withAuthCookie(agent().get("/api/auth/me"), badToken);
    assert.equal(res.status, 401);
  });

  it("GET /api/auth/me returns 401 for deleted user token", async () => {
    const company = await createTestCompany("ephemeral_auth");
    const ephemeral = await createTestUser({
      role: "MEMBER",
      companyId: company.id,
      usernameLabel: "ephemeral",
    });

    const resWhileAlive = await withAuthCookie(
      agent().get("/api/auth/me"),
      ephemeral.accessToken,
    );
    assert.equal(resWhileAlive.status, 200);

    await require("../../src/prismaClient").user.delete({
      where: { id: ephemeral.user.id },
    });

    const resAfterDelete = await withAuthCookie(
      agent().get("/api/auth/me"),
      ephemeral.accessToken,
    );
    assert.equal(resAfterDelete.status, 401);
  });

  it("GET /api/auth/me succeeds with valid token", async () => {
    const res = await withAuthCookie(
      agent().get("/api/auth/me"),
      testUser.accessToken,
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, testUser.user.id);
    assert.ok(!res.body.data.password);
  });

  it("POST /api/auth/refresh returns 401 without refresh cookie", async () => {
    const res = await agent().post("/api/auth/refresh");
    assert.equal(res.status, 401);
  });

  it("POST /api/auth/logout clears cookies without requiring auth", async () => {
    const login = await agent()
      .post("/api/auth/login")
      .send({ username: testUser.user.username, password: testUser.password });

    assert.equal(login.status, 200, "login must succeed before logout test");
    const cookies = login.headers["set-cookie"];
    assert.ok(cookies?.length, "login must set cookies");
    const res = await agent()
      .post("/api/auth/logout")
      .set("Cookie", cookies);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  it("error responses do not leak stack traces", async () => {
    const res = await withAuthCookie(agent().get("/api/auth/me"), "bad.token.value");
    assert.equal(res.status, 401);
    assert.ok(!res.body.stack);
    assert.ok(!String(res.body.message || "").includes("node_modules"));
  });
});
