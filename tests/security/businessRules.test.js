const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { changeCredentialsService } = require("../../src/services/authService");

describe("authService business rules", () => {
  it("changeCredentialsService enforces MEMBER self-only authorization", () => {
    const source = changeCredentialsService.toString();
    assert.match(source, /currentUser\.role === "MEMBER"/);
    assert.doesNotMatch(source, /currentUser\.role === "USER"/);
  });
});

describe("error response format consistency", () => {
  it("auth middleware uses error field", () => {
    const { errorResponse } = require("../../src/utils/responses");
    const mockRes = {
      statusCode: 0,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };

    errorResponse(mockRes, 401, "test message");
    assert.equal(mockRes.body.error, "test message");
    assert.equal(mockRes.body.success, false);
  });

  it("global error handler uses message field (inconsistent with errorResponse)", () => {
    const errorHandler = require("../../src/middleware/errorHandler");
    const mockRes = {
      statusCode: 0,
      body: null,
      headersSent: false,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };

    errorHandler(
      Object.assign(new Error("validation failed"), { statusCode: 400 }),
      {},
      mockRes,
      () => {},
    );
    assert.equal(mockRes.body.message, "validation failed");
    assert.equal(mockRes.body.success, false);
    assert.equal(mockRes.body.error, undefined);
  });
});
