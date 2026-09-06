const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { agent, withAuthCookie } = require("../helpers/testApp");
const {
  createTestUser,
  createTestCompany,
  cleanupQaData,
} = require("../helpers/testFixtures");

describe("follow-up route wiring", { concurrency: false }, () => {
  let memberToken;

  before(async () => {
    const company = await createTestCompany("routes");
    const member = await createTestUser({
      role: "MEMBER",
      companyId: company.id,
      usernameLabel: "routes_member",
    });
    memberToken = member.accessToken;
  });

  after(async () => {
    await cleanupQaData();
  });

  it("GET /api/follow-up/follow-ups/:id is wired to handler (404 for missing record)", async () => {
    const res = await withAuthCookie(
      agent().get(
        "/api/follow-up/follow-ups/00000000-0000-4000-8000-000000000001",
      ),
      memberToken,
    );

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });
});

describe("security headers and CORS", () => {
  it("GET /test includes helmet security headers", async () => {
    const res = await agent().get("/test");
    assert.ok(res.headers["x-content-type-options"]);
  });

  it("rejects disallowed CORS origin without 500", async () => {
    const res = await agent()
      .get("/test")
      .set("Origin", "https://evil-attacker.example.com");

    assert.notEqual(res.status, 500);
    assert.ok(!res.body?.stack);
  });
});
