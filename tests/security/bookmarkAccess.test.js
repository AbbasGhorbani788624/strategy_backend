const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../../src/prismaClient");
const { agent, withAuthCookie } = require("../helpers/testApp");
const {
  createTwoCompanyScenario,
  cleanupQaData,
} = require("../helpers/testFixtures");

describe("bookmark access control", { concurrency: false }, () => {
  let scenario;
  let projectA;

  before(async () => {
    scenario = await createTwoCompanyScenario();

    projectA = await prisma.project.create({
      data: {
        title: "__qa_test__ bookmark project",
        creatorId: scenario.memberA.user.id,
        companyId: scenario.companyA.id,
        mode: "SINGLE",
        status: "WAITING_FOR_FORM",
      },
    });
  });

  after(async () => {
    await cleanupQaData();
  });

  it("owner can bookmark own project", async () => {
    const res = await withAuthCookie(
      agent().post(`/api/bookmark/${projectA.id}`),
      scenario.memberA.accessToken,
    );

    assert.ok([200, 201].includes(res.status));
  });

  it("user without project access cannot bookmark", async () => {
    const res = await withAuthCookie(
      agent().post(`/api/bookmark/${projectA.id}`),
      scenario.memberB.accessToken,
    );

    assert.equal(res.status, 403);
  });

  it("user with granted access can bookmark", async () => {
    await prisma.projectAccess.create({
      data: {
        projectId: projectA.id,
        userId: scenario.memberA2.user.id,
      },
    });

    const res = await withAuthCookie(
      agent().post(`/api/bookmark/${projectA.id}`),
      scenario.memberA2.accessToken,
    );

    assert.ok([200, 201].includes(res.status));
  });
});
