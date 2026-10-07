const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../src/prismaClient");
const { agent, withAuthCookie } = require("./helpers/testApp");
const {
  createTwoCompanyScenario,
  cleanupQaData,
  QA_PREFIX,
} = require("./helpers/testFixtures");

describe("GET /api/project MEMBER list access + targetUserId", {
  concurrency: false,
}, () => {
  let scenario;
  let aliceProjectId;
  let bobProjectId;

  before(async () => {
    scenario = await createTwoCompanyScenario();

    const aliceProject = await prisma.project.create({
      data: {
        title: `${QA_PREFIX}alice_project`,
        creatorId: scenario.memberA.user.id,
        companyId: scenario.companyA.id,
        mode: "SINGLE",
        status: "FINAL_ANALYSIS",
      },
      select: { id: true },
    });
    aliceProjectId = aliceProject.id;

    const bobProject = await prisma.project.create({
      data: {
        title: `${QA_PREFIX}bob_project`,
        creatorId: scenario.memberA2.user.id,
        companyId: scenario.companyA.id,
        mode: "SINGLE",
        status: "FINAL_ANALYSIS",
      },
      select: { id: true },
    });
    bobProjectId = bobProject.id;
  });

  after(async () => {
    await cleanupQaData();
  });

  const memberA2Get = (path) =>
    withAuthCookie(agent().get(path), scenario.memberA2.accessToken);

  const companyGet = (path) =>
    withAuthCookie(agent().get(path), scenario.companyUserA.accessToken);

  const listIds = (res) => res.body.data.projects.map((p) => p.id);

  it("MEMBER sees own project", async () => {
    const res = await memberA2Get("/api/project?page=1&limit=50");
    assert.equal(res.status, 200);
    assert.ok(listIds(res).includes(bobProjectId));
  });

  it("MEMBER sees another member project when canView=true", async () => {
    await prisma.projectAccess.create({
      data: {
        projectId: aliceProjectId,
        userId: scenario.memberA2.user.id,
        canView: true,
        grantedByUserId: scenario.memberA.user.id,
      },
    });

    const res = await memberA2Get("/api/project?page=1&limit=50");
    assert.equal(res.status, 200);
    assert.ok(listIds(res).includes(aliceProjectId));
  });

  it("MEMBER does not see another member project without access", async () => {
    await prisma.projectAccess.deleteMany({
      where: {
        projectId: aliceProjectId,
        userId: scenario.memberA2.user.id,
      },
    });

    const res = await memberA2Get("/api/project?page=1&limit=50");
    assert.equal(res.status, 200);
    assert.ok(!listIds(res).includes(aliceProjectId));
  });

  it("MEMBER with targetUserId=Alice sees Alice project when access granted", async () => {
    await prisma.projectAccess.upsert({
      where: {
        projectId_userId: {
          projectId: aliceProjectId,
          userId: scenario.memberA2.user.id,
        },
      },
      create: {
        projectId: aliceProjectId,
        userId: scenario.memberA2.user.id,
        canView: true,
        grantedByUserId: scenario.memberA.user.id,
      },
      update: { canView: true },
    });

    const res = await memberA2Get(
      `/api/project?page=1&limit=50&targetUserId=${scenario.memberA.user.id}`,
    );
    assert.equal(res.status, 200);
    assert.ok(listIds(res).includes(aliceProjectId));
  });

  it("MEMBER with targetUserId=Alice does NOT see Alice project without access", async () => {
    await prisma.projectAccess.deleteMany({
      where: {
        projectId: aliceProjectId,
        userId: scenario.memberA2.user.id,
      },
    });

    const res = await memberA2Get(
      `/api/project?page=1&limit=50&targetUserId=${scenario.memberA.user.id}`,
    );
    assert.equal(res.status, 200);
    assert.ok(!listIds(res).includes(aliceProjectId));
  });

  it("MEMBER with targetUserId=Alice does NOT see Bob's own project", async () => {
    const res = await memberA2Get(
      `/api/project?page=1&limit=50&targetUserId=${scenario.memberA.user.id}`,
    );
    assert.equal(res.status, 200);
    assert.ok(!listIds(res).includes(bobProjectId));
  });

  it("COMPANY without targetUserId sees all company projects", async () => {
    const res = await companyGet("/api/project?page=1&limit=50");
    assert.equal(res.status, 200);
    const ids = listIds(res);
    assert.ok(ids.includes(aliceProjectId));
    assert.ok(ids.includes(bobProjectId));
  });

  it("COMPANY with targetUserId=Alice sees Alice projects without ProjectAccess", async () => {
    const res = await companyGet(
      `/api/project?page=1&limit=50&targetUserId=${scenario.memberA.user.id}`,
    );
    assert.equal(res.status, 200);
    const ids = listIds(res);
    assert.ok(ids.includes(aliceProjectId));
    assert.ok(!ids.includes(bobProjectId));
  });
});
