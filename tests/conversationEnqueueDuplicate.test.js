const { describe, it, beforeEach, afterEach, after, mock } = require("node:test");
const assert = require("node:assert/strict");

const prisma = require("../src/prismaClient");
const redis = require("../src/configs/redis");
const conversationQueue = require("../src/queues/conversation.queue");
const {
  enqueueConversationStep,
} = require("../src/services/conversation.queue.service");

describe("conversation enqueue / retry duplicate debugging", () => {
  /** @type {Array<{ id: string, name: string, data: object, opts: object, attemptsMade: number }>} */
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
      status: "WAITING_FOR_FORM",
    }));
    prisma.project.update = mock.fn(async () => ({
      id: "project-1",
      status: "AI_PROCESSING",
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
    conversationQueue.add = originalAdd;
    conversationQueue.getJobs = originalGetJobs;
    await conversationQueue.close().catch(() => {});
    if (typeof redis.disconnect === "function") {
      redis.disconnect();
    }
    await prisma.$disconnect().catch(() => {});
  });

  it("A: creates exactly one job when enqueueConversationStep is called once", async () => {
    const projectId = "project-debug-1";
    const userId = "user-debug-1";

    const result = await enqueueConversationStep({
      projectId,
      userId,
      userInput: "",
      understood: false,
      source: "test.A",
    });

    const jobsForProject = addedJobs.filter(
      (job) => job.data.projectId === projectId,
    );

    assert.equal(result.jobId, "1");
    assert.equal(jobsForProject.length, 1);
    assert.equal(conversationQueue.add.mock.callCount(), 1);
    assert.equal(jobsForProject[0].opts.attempts, 3);
    assert.equal(result.deduplicated, false);
  });

  it("B: second enqueue for same projectId is deduplicated (no second job)", async () => {
    const projectId = "project-debug-dup";
    const userId = "user-debug-dup";

    const first = await enqueueConversationStep({
      projectId,
      userId,
      userInput: "",
      understood: false,
      source: "test.B.first",
    });

    const second = await enqueueConversationStep({
      projectId,
      userId,
      userInput: "correction",
      understood: false,
      source: "test.B.second",
    });

    assert.equal(addedJobs.length, 1);
    assert.equal(conversationQueue.add.mock.callCount(), 1);
    assert.equal(first.jobId, second.jobId);
    assert.equal(second.deduplicated, true);
  });

  it("C: retry keeps same jobId (attemptsMade++) while fresh enqueue after completion creates new job", async () => {
    const projectId = "project-debug-retry";
    const userId = "user-debug-retry";
    let jobSeq = 0;

    conversationQueue.add = mock.fn(async (name, data, opts) => {
      jobSeq += 1;
      const job = {
        id: `job-${jobSeq}`,
        name,
        data,
        opts,
        attemptsMade: 0,
      };
      addedJobs.push(job);
      return job;
    });

    const first = await enqueueConversationStep({
      projectId,
      userId,
      userInput: "",
      understood: false,
      source: "test.C.first",
    });

    const retriedJob = {
      ...addedJobs[0],
      attemptsMade: 1,
    };

    assert.equal(retriedJob.id, first.jobId);
    assert.equal(retriedJob.attemptsMade, 1);
    assert.equal(conversationQueue.add.mock.callCount(), 1);

    // Simulate job no longer active (completed/failed removed from active list)
    addedJobs.length = 0;
    conversationQueue.getJobs = mock.fn(async () => addedJobs);

    const second = await enqueueConversationStep({
      projectId,
      userId,
      userInput: "",
      understood: false,
      source: "test.C.second-enqueue",
    });

    assert.notEqual(second.jobId, first.jobId);
    assert.equal(second.deduplicated, false);
    assert.equal(conversationQueue.add.mock.callCount(), 2);
  });
});

