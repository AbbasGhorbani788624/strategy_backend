const { describe, it, beforeEach, afterEach, after, mock } = require("node:test");
const assert = require("node:assert/strict");

const prisma = require("../src/prismaClient");
const redis = require("../src/configs/redis");
const conversationQueue = require("../src/queues/conversation.queue");
const {
  enqueueConversationStep,
} = require("../src/services/conversation.queue.service");
const {
  buildAnalysisStatusPayload,
  markProjectAnalysisFailed,
  DEFAULT_ANALYSIS_ERROR_MESSAGE,
} = require("../src/utils/analysisFailure");

describe("conversation analysis production flow", () => {
  /** @type {Array<object>} */
  let addedJobs = [];
  let originalAdd;
  let originalGetJobs;
  let originalFindFirst;
  let originalUpdate;

  beforeEach(() => {
    addedJobs = [];
    originalAdd = conversationQueue.add;
    originalGetJobs = conversationQueue.getJobs;
    originalFindFirst = prisma.project.findFirst;
    originalUpdate = prisma.project.update;

    prisma.project.findFirst = mock.fn(async () => ({
      status: "ANALYSIS_PENDING",
    }));
    prisma.project.update = mock.fn(async ({ data }) => ({
      id: "project-1",
      ...data,
    }));

    conversationQueue.getJobs = mock.fn(async () => addedJobs);
    conversationQueue.add = mock.fn(async (name, data, opts) => {
      const job = {
        id: String(addedJobs.length + 1),
        name,
        data,
        opts,
        attemptsMade: 0,
      };
      addedJobs.push(job);
      return job;
    });
  });

  afterEach(() => {
    conversationQueue.add = originalAdd;
    conversationQueue.getJobs = originalGetJobs;
    prisma.project.findFirst = originalFindFirst;
    prisma.project.update = originalUpdate;
  });

  after(async () => {
    await conversationQueue.close().catch(() => {});
    if (typeof redis.disconnect === "function") {
      redis.disconnect();
    }
    await prisma.$disconnect().catch(() => {});
  });

  it("Case 1: successful analysis status payload includes analysis (FINAL_ANALYSIS)", () => {
    const payload = buildAnalysisStatusPayload({
      status: "FINAL_ANALYSIS",
      initialAnalysis: "init",
      finalAnalysis: "final text",
      summaryAnalysis: "summary",
      riskPercentage: 0.8,
    });

    assert.equal(payload.status, "FINAL_ANALYSIS");
    assert.ok(payload.analysis);
    assert.equal(payload.analysis.finalAnalysis, "final text");
    assert.equal(payload.analysis.summaryAnalysis, "summary");
    assert.equal(payload.analysis.riskPercentage, 0.8);
  });

  it("Case 2: failed analysis marks project FAILED and status payload exposes error", async () => {
    await markProjectAnalysisFailed("project-fail-1");

    assert.equal(prisma.project.update.mock.callCount(), 1);
    const updateArg = prisma.project.update.mock.calls[0].arguments[0];
    assert.equal(updateArg.data.status, "FAILED");

    const payload = buildAnalysisStatusPayload({
      status: "FAILED",
    });

    assert.equal(payload.status, "FAILED");
    assert.equal(payload.error, DEFAULT_ANALYSIS_ERROR_MESSAGE);
    assert.equal(payload.errorMessage, DEFAULT_ANALYSIS_ERROR_MESSAGE);
  });

  it("Case 3: duplicate enqueue for same projectId creates only one active job", async () => {
    const projectId = "project-dup-1";
    const userId = "user-dup-1";

    const first = await enqueueConversationStep({
      projectId,
      userId,
      userInput: "",
      understood: false,
      source: "test.case3.first",
    });

    const second = await enqueueConversationStep({
      projectId,
      userId,
      userInput: "",
      understood: false,
      source: "test.case3.second",
    });

    assert.equal(addedJobs.length, 1);
    assert.equal(conversationQueue.add.mock.callCount(), 1);
    assert.equal(first.jobId, second.jobId);
    assert.equal(second.deduplicated, true);
    assert.equal(first.status, "AI_PROCESSING");
    assert.equal(second.status, "AI_PROCESSING");
  });

  it("maps ANALYSIS_PENDING poll to AI_PROCESSING for clients", () => {
    const payload = buildAnalysisStatusPayload({
      status: "ANALYSIS_PENDING",
    });
    assert.equal(payload.status, "AI_PROCESSING");
  });

  it("uses attempts=3 with exponential backoff on newly enqueued jobs", async () => {
    await enqueueConversationStep({
      projectId: "project-retry-opts",
      userId: "user-retry-opts",
      userInput: "",
      understood: false,
      source: "test.retry-opts",
    });

    const opts = addedJobs[0].opts;
    assert.equal(opts.attempts, 3);
    assert.equal(opts.backoff.type, "exponential");
    assert.equal(opts.backoff.delay, 5000);
  });
});
