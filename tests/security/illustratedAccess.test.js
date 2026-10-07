const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../../src/prismaClient");
const { agent, withAuthCookie } = require("../helpers/testApp");
const {
  createTwoCompanyScenario,
  cleanupQaData,
} = require("../helpers/testFixtures");

describe("illustrated access control", { concurrency: false }, () => {
  let scenario;
  let projectA;

  before(async () => {
    scenario = await createTwoCompanyScenario();

    projectA = await prisma.project.create({
      data: {
        title: "__qa_test__ illustrated project",
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

  it("unauthenticated user cannot create illustrated", async () => {
    const res = await agent().post(`/api/illustrated/${projectA.id}`);
    assert.equal(res.status, 401);
  });

  it("unauthenticated user cannot delete illustrated", async () => {
    const res = await agent().delete(`/api/illustrated/${projectA.id}`);
    assert.equal(res.status, 401);
  });

  it("unauthenticated user cannot list illustrated", async () => {
    const res = await agent().get("/api/illustrated/");
    assert.equal(res.status, 401);
  });

  it("owner can mark project as illustrated", async () => {
    const res = await withAuthCookie(
      agent().post(`/api/illustrated/${projectA.id}`),
      scenario.memberA.accessToken,
    );

    assert.ok([200, 201].includes(res.status));

    const count = await prisma.projectIllustrated.count({
      where: {
        userId: scenario.memberA.user.id,
        projectId: projectA.id,
      },
    });
    assert.equal(count, 1);
  });

  it("duplicate illustrated creation does not create duplicate records", async () => {
    const res = await withAuthCookie(
      agent().post(`/api/illustrated/${projectA.id}`),
      scenario.memberA.accessToken,
    );

    assert.ok([200, 201].includes(res.status));

    const count = await prisma.projectIllustrated.count({
      where: {
        userId: scenario.memberA.user.id,
        projectId: projectA.id,
      },
    });
    assert.equal(count, 1);
  });

  it("user without project access cannot mark illustrated", async () => {
    const res = await withAuthCookie(
      agent().post(`/api/illustrated/${projectA.id}`),
      scenario.memberB.accessToken,
    );

    assert.equal(res.status, 403);
  });

  it("user with granted access can mark illustrated", async () => {
    await prisma.projectAccess.create({
      data: {
        projectId: projectA.id,
        userId: scenario.memberA2.user.id,
        canView: true,
        canVisualize: true,
        grantedByUserId: scenario.memberA.user.id,
      },
    });

    const res = await withAuthCookie(
      agent().post(`/api/illustrated/${projectA.id}`),
      scenario.memberA2.accessToken,
    );

    assert.ok([200, 201].includes(res.status));
  });

  it("owner sees isIllustrated when collaborator marked illustrated", async () => {
    await prisma.projectIllustrated.deleteMany({
      where: { projectId: projectA.id },
    });

    await prisma.projectAccess.upsert({
      where: {
        projectId_userId: {
          projectId: projectA.id,
          userId: scenario.memberA2.user.id,
        },
      },
      create: {
        projectId: projectA.id,
        userId: scenario.memberA2.user.id,
        canView: true,
        canVisualize: true,
        grantedByUserId: scenario.memberA.user.id,
      },
      update: {
        canVisualize: true,
        canView: true,
      },
    });

    const markRes = await withAuthCookie(
      agent().post(`/api/illustrated/${projectA.id}`),
      scenario.memberA2.accessToken,
    );
    assert.ok([200, 201].includes(markRes.status));

    const ownerProject = await withAuthCookie(
      agent().get(`/api/project/${projectA.id}`),
      scenario.memberA.accessToken,
    );
    assert.equal(ownerProject.status, 200);
    assert.equal(ownerProject.body.data.isIllustrated, true);
    assert.equal(ownerProject.body.data.isIllustratedByMe, false);

    const collabProject = await withAuthCookie(
      agent().get(`/api/project/${projectA.id}`),
      scenario.memberA2.accessToken,
    );
    assert.equal(collabProject.status, 200);
    assert.equal(collabProject.body.data.isIllustrated, true);
    assert.equal(collabProject.body.data.isIllustratedByMe, true);
  });

  it("authenticated user can remove their illustrated relationship", async () => {
    await prisma.projectIllustrated.upsert({
      where: {
        userId_projectId: {
          userId: scenario.memberA.user.id,
          projectId: projectA.id,
        },
      },
      update: {},
      create: {
        userId: scenario.memberA.user.id,
        projectId: projectA.id,
      },
    });

    const res = await withAuthCookie(
      agent().delete(`/api/illustrated/${projectA.id}`),
      scenario.memberA.accessToken,
    );

    assert.equal(res.status, 200);

    const count = await prisma.projectIllustrated.count({
      where: {
        userId: scenario.memberA.user.id,
        projectId: projectA.id,
      },
    });
    assert.equal(count, 0);
  });

  it("removing illustrated does not remove bookmark", async () => {
    await prisma.projectBookmark.deleteMany({
      where: { projectId: projectA.id },
    });
    await prisma.projectIllustrated.deleteMany({
      where: { projectId: projectA.id },
    });

    await prisma.projectBookmark.create({
      data: {
        userId: scenario.memberA.user.id,
        projectId: projectA.id,
      },
    });
    await prisma.projectIllustrated.create({
      data: {
        userId: scenario.memberA.user.id,
        projectId: projectA.id,
      },
    });

    const res = await withAuthCookie(
      agent().delete(`/api/illustrated/${projectA.id}`),
      scenario.memberA.accessToken,
    );

    assert.equal(res.status, 200);

    const bookmarkCount = await prisma.projectBookmark.count({
      where: {
        userId: scenario.memberA.user.id,
        projectId: projectA.id,
      },
    });
    const illustratedCount = await prisma.projectIllustrated.count({
      where: {
        userId: scenario.memberA.user.id,
        projectId: projectA.id,
      },
    });

    assert.equal(bookmarkCount, 1);
    assert.equal(illustratedCount, 0);
  });

  it("removing bookmark does not remove illustrated", async () => {
    await prisma.projectBookmark.deleteMany({
      where: { projectId: projectA.id },
    });
    await prisma.projectIllustrated.deleteMany({
      where: { projectId: projectA.id },
    });

    await prisma.projectBookmark.create({
      data: {
        userId: scenario.memberA.user.id,
        projectId: projectA.id,
      },
    });
    await prisma.projectIllustrated.create({
      data: {
        userId: scenario.memberA.user.id,
        projectId: projectA.id,
      },
    });

    const res = await withAuthCookie(
      agent().delete(`/api/bookmark/${projectA.id}`),
      scenario.memberA.accessToken,
    );

    assert.equal(res.status, 200);

    const bookmarkCount = await prisma.projectBookmark.count({
      where: {
        userId: scenario.memberA.user.id,
        projectId: projectA.id,
      },
    });
    const illustratedCount = await prisma.projectIllustrated.count({
      where: {
        userId: scenario.memberA.user.id,
        projectId: projectA.id,
      },
    });

    assert.equal(bookmarkCount, 0);
    assert.equal(illustratedCount, 1);
  });

  it("user B does not see user A illustrated on shared project", async () => {
    await prisma.projectIllustrated.deleteMany({
      where: { projectId: projectA.id },
    });

    await prisma.projectIllustrated.create({
      data: {
        userId: scenario.memberA.user.id,
        projectId: projectA.id,
      },
    });

    const listRes = await withAuthCookie(
      agent().get("/api/illustrated/"),
      scenario.memberB.accessToken,
    );

    assert.equal(listRes.status, 200);
    const ids = (listRes.body.data?.projects ?? []).map((p) => p.id);
    assert.ok(!ids.includes(projectA.id));

    const bIllustrated = await prisma.projectIllustrated.count({
      where: {
        userId: scenario.memberB.user.id,
        projectId: projectA.id,
      },
    });
    assert.equal(bIllustrated, 0);
  });

  it("list returns only authenticated user illustrated projects with pagination", async () => {
    await prisma.projectIllustrated.deleteMany({
      where: { userId: scenario.memberA.user.id },
    });

    const projectB = await prisma.project.create({
      data: {
        title: "__qa_test__ illustrated project B",
        creatorId: scenario.memberA.user.id,
        companyId: scenario.companyA.id,
        mode: "SINGLE",
        status: "WAITING_FOR_FORM",
      },
    });

    await prisma.projectIllustrated.createMany({
      data: [
        { userId: scenario.memberA.user.id, projectId: projectA.id },
        { userId: scenario.memberA.user.id, projectId: projectB.id },
      ],
    });

    const page1 = await withAuthCookie(
      agent().get("/api/illustrated/?page=1&limit=1"),
      scenario.memberA.accessToken,
    );

    assert.equal(page1.status, 200);
    assert.equal(page1.body.data.projects.length, 1);
    assert.equal(page1.body.data.pagination.totalItems, 2);
    assert.equal(page1.body.data.pagination.limit, 1);

    const searchRes = await withAuthCookie(
      agent().get("/api/illustrated/?search=illustrated project B"),
      scenario.memberA.accessToken,
    );

    assert.equal(searchRes.status, 200);
    assert.equal(searchRes.body.data.projects.length, 1);
    assert.equal(searchRes.body.data.projects[0].id, projectB.id);
    assert.equal(searchRes.body.data.projects[0].isIllustrated, true);
  });
});
