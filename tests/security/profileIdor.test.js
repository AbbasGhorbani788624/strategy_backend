const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../../src/prismaClient");
const { agent, withAuthCookie } = require("../helpers/testApp");
const {
  createTwoCompanyScenario,
  cleanupQaData,
} = require("../helpers/testFixtures");

describe("profile IDOR and mass assignment", { concurrency: false }, () => {
  let scenario;
  let educationA;

  before(async () => {
    scenario = await createTwoCompanyScenario();

    educationA = await prisma.userEducation.create({
      data: {
        userId: scenario.memberA.user.id,
        degree: "BACHELOR_DEGREE",
        fieldOfStudy: "Computer Science",
        university: "QA University",
      },
    });
  });

  after(async () => {
    await cleanupQaData();
  });

  it("MEMBER can update own education record", async () => {
    const res = await withAuthCookie(
      agent().patch(`/api/profile/educations/${educationA.id}`),
      scenario.memberA.accessToken,
    ).send({ fieldOfStudy: "Updated Field" });

    assert.equal(res.status, 200);

    const updated = await prisma.userEducation.findUnique({
      where: { id: educationA.id },
    });
    assert.equal(updated.fieldOfStudy, "Updated Field");
  });

  it("MEMBER cannot update another user's education record", async () => {
    const res = await withAuthCookie(
      agent().patch(`/api/profile/educations/${educationA.id}`),
      scenario.memberB.accessToken,
    ).send({ fieldOfStudy: "Hacked Field" });

    assert.equal(res.status, 403);

    const unchanged = await prisma.userEducation.findUnique({
      where: { id: educationA.id },
    });
    assert.notEqual(unchanged.fieldOfStudy, "Hacked Field");
  });

  it("MEMBER cannot reassign education record via userId in body", async () => {
    const res = await withAuthCookie(
      agent().patch(`/api/profile/educations/${educationA.id}`),
      scenario.memberA.accessToken,
    ).send({
      userId: scenario.memberB.user.id,
      fieldOfStudy: "Stolen",
    });

    assert.equal(res.status, 200);

    const record = await prisma.userEducation.findUnique({
      where: { id: educationA.id },
    });
    assert.equal(record.userId, scenario.memberA.user.id);
    assert.equal(record.fieldOfStudy, "Stolen");
  });

  it("MEMBER cannot delete another user's education record", async () => {
    const temp = await prisma.userEducation.create({
      data: {
        userId: scenario.memberA.user.id,
        degree: "DIPLOMA",
        fieldOfStudy: "Temp",
      },
    });

    const res = await withAuthCookie(
      agent().delete(`/api/profile/educations/${temp.id}`),
      scenario.memberB.accessToken,
    );

    assert.equal(res.status, 403);

    const stillExists = await prisma.userEducation.findUnique({
      where: { id: temp.id },
    });
    assert.ok(stillExists);
  });

  it("MEMBER can delete own education record", async () => {
    const temp = await prisma.userEducation.create({
      data: {
        userId: scenario.memberA.user.id,
        degree: "DIPLOMA",
        fieldOfStudy: "To Delete",
      },
    });

    const res = await withAuthCookie(
      agent().delete(`/api/profile/educations/${temp.id}`),
      scenario.memberA.accessToken,
    );

    assert.equal(res.status, 204);
  });
});
