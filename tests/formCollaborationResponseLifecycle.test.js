const test = require("node:test");
const assert = require("node:assert/strict");

const CREATOR_ID = "creator-user-id";
const PROJECT_ID = "project-id";
const COLLAB_ID = "collab-id";

const baseProject = {
  id: PROJECT_ID,
  title: "Test Project",
  creatorId: CREATOR_ID,
  companyId: "company-id",
  status: "WAITING_FOR_FORM",
  mode: "SINGLE",
  formId: "form-id",
  multiAnalysisFormId: null,
};

const openCollaboration = {
  id: COLLAB_ID,
  projectId: PROJECT_ID,
  status: "OPEN",
  responses: [],
  delegations: [],
};

const mockForm = {
  categories: [
    {
      id: "category-1",
      title: "Cat",
      questions: [{ id: "q1", label: "Q1", type: "TEXT", options: [] }],
      children: [],
    },
  ],
};

function installMocks(responseStore) {
  const prismaClientPath = require.resolve("../src/prismaClient");
  const tierServicePath = require.resolve(
    "../src/services/companyAnalysisTierService",
  );
  const formLoaderPath = require.resolve(
    "../src/services/formCollaborationFormLoader",
  );
  const servicePath = require.resolve(
    "../src/services/formCollaborationService",
  );

  require.cache[prismaClientPath] = {
    id: prismaClientPath,
    filename: prismaClientPath,
    loaded: true,
    exports: {
      project: {
        findUnique: async () => baseProject,
      },
      formCollaboration: {
        findFirst: async () => openCollaboration,
        findUnique: async () => null,
      },
      formCollaborationResponse: {
        findUnique: async () => responseStore.current,
        upsert: async ({ create, update }) => {
          responseStore.upsertCalls.push({ create, update });
          if (responseStore.current) {
            responseStore.current = {
              ...responseStore.current,
              ...update,
            };
          } else {
            responseStore.current = {
              id: "response-id",
              ...create,
            };
          }
          return responseStore.current;
        },
      },
      formCollaborationDelegation: {
        update: async () => ({}),
      },
      user: {
        findUnique: async () => ({ username: "creator" }),
      },
      notification: {
        create: async () => ({}),
      },
    },
  };

  require.cache[tierServicePath] = {
    id: tierServicePath,
    filename: tierServicePath,
    loaded: true,
    exports: {
      assertFormInEnabledTier: async () => {},
    },
  };

  require.cache[formLoaderPath] = {
    id: formLoaderPath,
    filename: formLoaderPath,
    loaded: true,
    exports: {
      getProjectForm: async () => mockForm,
    },
  };

  delete require.cache[servicePath];
}

const responseStore = { current: null, upsertCalls: [] };
installMocks(responseStore);

const {
  assertCanSubmitResponse,
  buildSubmissionPool,
  submitMyCollaborationResponseService,
} = require("../src/services/formCollaborationService");

test("assertCanSubmitResponse: creator with no response allows save", async () => {
  await assertCanSubmitResponse(
    { creatorId: CREATOR_ID },
    { status: "OPEN", delegations: [] },
    CREATOR_ID,
    null,
  );
});

test("assertCanSubmitResponse: creator with DRAFT allows save", async () => {
  await assertCanSubmitResponse(
    { creatorId: CREATOR_ID },
    { status: "OPEN", delegations: [] },
    CREATOR_ID,
    { id: "r1", status: "DRAFT" },
  );
});

test("assertCanSubmitResponse: creator with SUBMITTED rejects further edits", async () => {
  await assert.rejects(
    () =>
      assertCanSubmitResponse(
        { creatorId: CREATOR_ID },
        { status: "OPEN", delegations: [] },
        CREATOR_ID,
        { id: "r1", status: "SUBMITTED" },
      ),
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.equal(
        err.message,
        "پاسخ فرم قبلاً ثبت نهایی شده و قابل ویرایش نیست.",
      );
      return true;
    },
  );
});

test("Test 1 & 2: creator can save DRAFT repeatedly", async () => {
  responseStore.current = null;
  responseStore.upsertCalls = [];

  const answers1 = { q1: "first draft" };
  const r1 = await submitMyCollaborationResponseService(
    PROJECT_ID,
    CREATOR_ID,
    answers1,
    { submit: false },
  );
  assert.equal(r1.response.status, "DRAFT");
  assert.equal(r1.response.submittedAt, null);

  const answers2 = { q1: "second draft" };
  const r2 = await submitMyCollaborationResponseService(
    PROJECT_ID,
    CREATOR_ID,
    answers2,
    { submit: false },
  );
  assert.equal(r2.response.status, "DRAFT");
  assert.deepEqual(r2.response.rawAnswers, answers2);
  assert.equal(responseStore.upsertCalls.length, 2);
});

test("Test 3: creator DRAFT then SUBMITTED", async () => {
  responseStore.current = null;
  responseStore.upsertCalls = [];

  await submitMyCollaborationResponseService(
    PROJECT_ID,
    CREATOR_ID,
    { q1: "draft" },
    { submit: false },
  );

  const finalResult = await submitMyCollaborationResponseService(
    PROJECT_ID,
    CREATOR_ID,
    { q1: "final" },
    { submit: true },
  );

  assert.equal(finalResult.response.status, "SUBMITTED");
  assert.ok(finalResult.response.submittedAt instanceof Date);
  assert.deepEqual(finalResult.response.rawAnswers, { q1: "final" });
});

test("Test 4: creator SUBMITTED then draft save is rejected", async () => {
  responseStore.current = {
    id: "response-id",
    status: "SUBMITTED",
    rawAnswers: { q1: "locked" },
    submittedAt: new Date(),
  };
  responseStore.upsertCalls = [];

  await assert.rejects(
    () =>
      submitMyCollaborationResponseService(
        PROJECT_ID,
        CREATOR_ID,
        { q1: "try draft" },
        { submit: false },
      ),
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.equal(
        err.message,
        "پاسخ فرم قبلاً ثبت نهایی شده و قابل ویرایش نیست.",
      );
      return true;
    },
  );
  assert.equal(responseStore.upsertCalls.length, 0);
});

test("Test 5: creator SUBMITTED then submit again is rejected", async () => {
  responseStore.current = {
    id: "response-id",
    status: "SUBMITTED",
    rawAnswers: { q1: "locked" },
    submittedAt: new Date(),
  };
  responseStore.upsertCalls = [];

  await assert.rejects(
    () =>
      submitMyCollaborationResponseService(
        PROJECT_ID,
        CREATOR_ID,
        { q1: "new final" },
        { submit: true },
      ),
    (err) => err.statusCode === 400,
  );
  assert.equal(responseStore.upsertCalls.length, 0);
  assert.deepEqual(responseStore.current.rawAnswers, { q1: "locked" });
});

test("Test 6: buildSubmissionPool excludes DRAFT", () => {
  const pool = buildSubmissionPool({
    responses: [
      {
        status: "DRAFT",
        respondentId: "u1",
        rawAnswers: {},
        formattedResponses: {},
        submittedAt: null,
        respondent: { username: "u1" },
      },
      {
        status: "SUBMITTED",
        respondentId: "u2",
        rawAnswers: { q1: "x" },
        formattedResponses: {},
        submittedAt: new Date(),
        respondent: { username: "u2" },
      },
    ],
  });

  assert.equal(pool.length, 1);
  assert.equal(pool[0].respondentId, "u2");
});

test("Test 7: buildSubmissionPool includes all SUBMITTED responses", () => {
  const pool = buildSubmissionPool({
    responses: [
      {
        status: "SUBMITTED",
        respondentId: CREATOR_ID,
        rawAnswers: { q1: "a" },
        formattedResponses: {},
        submittedAt: new Date(),
        respondent: { username: "creator" },
      },
      {
        status: "SUBMITTED",
        respondentId: "assignee",
        rawAnswers: { q1: "b" },
        formattedResponses: {},
        submittedAt: new Date(),
        respondent: { username: "assignee" },
      },
    ],
  });

  assert.equal(pool.length, 2);
});
