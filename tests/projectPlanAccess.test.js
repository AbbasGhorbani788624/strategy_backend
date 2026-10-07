const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { PLAN_PERMISSION } = require("../src/services/projectPlanAccessService");

describe("project plan access constants", () => {
  it("defines VIEW and EDIT permissions", () => {
    assert.equal(PLAN_PERMISSION.VIEW, "VIEW");
    assert.equal(PLAN_PERMISSION.EDIT, "EDIT");
  });
});
