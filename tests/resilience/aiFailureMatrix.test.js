const { describe, it, mock, afterEach } = require("node:test");
const assert = require("node:assert/strict");

describe("AI failure matrix (mocked)", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("marks project FAILED on final analysis failure", async () => {
    const { markProjectAnalysisFailed, buildAnalysisStatusPayload } = require("../../src/utils/analysisFailure");

    const payload = buildAnalysisStatusPayload({
      status: "FAILED",
      errorMessage: "AI service unavailable",
    });

    assert.equal(payload.status, "FAILED");
    assert.ok(payload.error);
  });

  it("conversation enqueue deduplicates active jobs", async () => {
    const conversationQueue = require("../../src/queues/conversation.queue");
    const prisma = require("../../src/prismaClient");
    const { enqueueConversationStep } = require("../../src/services/conversation.queue.service");

    const jobs = [];
    const originalAdd = conversationQueue.add;
    const originalGetJobs = conversationQueue.getJobs;
    const originalFindFirst = prisma.project.findFirst;
    const originalUpdate = prisma.project.update;

    conversationQueue.getJobs = async () => jobs;
    conversationQueue.add = async (name, data, opts) => {
      const job = { id: "1", name, data, opts, attemptsMade: 0 };
      jobs.push(job);
      return job;
    };
    prisma.project.findFirst = async () => ({ status: "ANALYSIS_PENDING" });
    prisma.project.update = async ({ data }) => ({ id: "p1", ...data });

    const first = await enqueueConversationStep({
      projectId: "p1",
      userId: "u1",
      userInput: "hello",
    });
    const second = await enqueueConversationStep({
      projectId: "p1",
      userId: "u1",
      userInput: "hello again",
    });

    conversationQueue.add = originalAdd;
    conversationQueue.getJobs = originalGetJobs;
    prisma.project.findFirst = originalFindFirst;
    prisma.project.update = originalUpdate;

    assert.equal(first.deduplicated, false);
    assert.equal(second.deduplicated, true);
    assert.equal(jobs.length, 1);
  });

  it("strategy AI mock path is enabled in test env", () => {
    const { isStrategyAiMockEnabled } = require("../../src/mocks/strategyAiMock");
    assert.equal(isStrategyAiMockEnabled(), true);
  });
});
