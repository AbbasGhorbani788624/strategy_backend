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
        canView: true,
        grantedByUserId: scenario.memberA.user.id,
      },
    });

    const res = await withAuthCookie(
      agent().post(`/api/bookmark/${projectA.id}`),
      scenario.memberA2.accessToken,
    );

    assert.ok([200, 201].includes(res.status));
  });

  it("GET bookmark supports targetUserId (projects created by that member)", async () => {
    await prisma.projectAccess.create({
      data: {
        projectId: projectA.id,
        userId: scenario.companyUserA.user.id,
        canView: true,
        grantedByUserId: scenario.memberA.user.id,
      },
    });

    const memberA2Project = await prisma.project.create({
      data: {
        title: "__qa_test__ bookmark member a2",
        creatorId: scenario.memberA2.user.id,
        companyId: scenario.companyA.id,
        mode: "SINGLE",
        status: "WAITING_FOR_FORM",
      },
    });

    await prisma.projectAccess.create({
      data: {
        projectId: memberA2Project.id,
        userId: scenario.companyUserA.user.id,
        canView: true,
        grantedByUserId: scenario.memberA2.user.id,
      },
    });

    await withAuthCookie(
      agent().post(`/api/bookmark/${projectA.id}`),
      scenario.companyUserA.accessToken,
    );
    await withAuthCookie(
      agent().post(`/api/bookmark/${memberA2Project.id}`),
      scenario.companyUserA.accessToken,
    );

    const filtered = await withAuthCookie(
      agent().get(
        `/api/bookmark?page=1&limit=50&targetUserId=${scenario.memberA.user.id}`,
      ),
      scenario.companyUserA.accessToken,
    );

    assert.equal(filtered.status, 200);
    const ids = filtered.body.data.projects.map((p) => p.id);
    assert.ok(ids.includes(projectA.id));
    assert.ok(!ids.includes(memberA2Project.id));
  });

  it("GET bookmark search matches project title or member username", async () => {
    await prisma.projectAccess.upsert({
      where: {
        projectId_userId: {
          projectId: projectA.id,
          userId: scenario.companyUserA.user.id,
        },
      },
      create: {
        projectId: projectA.id,
        userId: scenario.companyUserA.user.id,
        canView: true,
        grantedByUserId: scenario.memberA.user.id,
      },
      update: {},
    });

    await withAuthCookie(
      agent().post(`/api/bookmark/${projectA.id}`),
      scenario.companyUserA.accessToken,
    );

    const byTitle = await withAuthCookie(
      agent().get("/api/bookmark?page=1&limit=50&search=bookmark%20project"),
      scenario.companyUserA.accessToken,
    );
    assert.equal(byTitle.status, 200);
    assert.ok(
      byTitle.body.data.projects.some((p) => p.id === projectA.id),
    );

    const byCreator = await withAuthCookie(
      agent().get(
        `/api/bookmark?page=1&limit=50&search=${encodeURIComponent(scenario.memberA.user.username)}`,
      ),
      scenario.companyUserA.accessToken,
    );
    assert.equal(byCreator.status, 200);
    assert.ok(
      byCreator.body.data.projects.some((p) => p.id === projectA.id),
    );
  });
});
