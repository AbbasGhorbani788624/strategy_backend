const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { agent } = require("../helpers/testApp");

const PROTECTED_ROUTES = [
  { method: "get", path: "/api/auth/me" },
  { method: "get", path: "/api/analysis/modes" },
  { method: "get", path: "/api/companyuser/members" },
  { method: "get", path: "/api/companyuser/company-profile" },
  { method: "post", path: "/api/profile/user-info" },
  { method: "get", path: "/api/project/" },
  { method: "get", path: "/api/project/myproject" },
  { method: "get", path: "/api/project/tabs" },
  { method: "get", path: "/api/config/" },
  { method: "get", path: "/api/config/revenue-centers" },
  { method: "get", path: "/api/config/product-services" },
  { method: "get", path: "/api/follow-up/" },
  { method: "get", path: "/api/follow-up/forms/active" },
  {
    method: "get",
    path: "/api/follow-up/follow-ups/00000000-0000-4000-8000-000000000001",
  },
  { method: "get", path: "/api/notification/" },
  { method: "get", path: "/api/comment/" },
  { method: "get", path: "/api/insight/" },
  { method: "get", path: "/api/industryinsight/" },
  { method: "get", path: "/api/featuredanalysis/" },
  { method: "get", path: "/api/analysis-categories/" },
  { method: "get", path: "/api/bookmark/" },
  { method: "get", path: "/api/chat/" },
  { method: "get", path: "/api/strategy-plans/active?framework=BSC" },
  { method: "get", path: "/api/strategy/measures/0/monitoring?framework=BSC" },
  { method: "get", path: "/api/project-plans/" },
  { method: "get", path: "/api/dashboard/?framework=BSC" },
  { method: "get", path: "/api/dashboard/company-insight" },
];

describe("protected routes require authentication", () => {
  for (const { method, path } of PROTECTED_ROUTES) {
    it(`${method.toUpperCase()} ${path} returns 401 without token`, async () => {
      const res = await agent()[method](path);
      assert.equal(
        res.status,
        401,
        `Expected 401 for ${path}, got ${res.status}: ${JSON.stringify(res.body)}`,
      );
      assert.equal(res.body.success, false);
    });
  }
});

describe("public routes", () => {
  it("GET /test is accessible without auth", async () => {
    const res = await agent().get("/test");
    assert.equal(res.status, 200);
    assert.equal(res.text, "OK");
  });

  it("POST /api/auth/login is accessible without auth", async () => {
    const res = await agent()
      .post("/api/auth/login")
      .send({ username: "x", password: "y" });
    assert.notEqual(res.status, 401);
  });

  it("unknown route returns 404 JSON", async () => {
    const res = await agent().get("/api/does-not-exist-route");
    assert.equal(res.status, 404);
    assert.match(res.body.message, /404/);
  });
});
