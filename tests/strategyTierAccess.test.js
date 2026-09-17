const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../src/prismaClient");
const {
  isMonitoringUnlocked,
} = require("../src/services/companyAnalysisTierService");
const { createTestCompany, createTestUser } = require("./helpers/testFixtures");

describe("current Tier 4 Strategy access", { concurrency: false }, () => {
  let company;
  let user;
  let analysisForm;
  let tier4;
  let project;

  before(async () => {
    company = await createTestCompany("strategy-tier");
    user = await createTestUser({
      role: "COMPANY",
      companyId: company.id,
      usernameLabel: "strategyTierCompany",
    });
    analysisForm = await prisma.analysisForm.create({
      data: {
        title: "__qa_test__ Tier 4 strategy form",
      },
    });
    tier4 = await prisma.companyAnalysisTierConfig.create({
      data: {
        companyId: company.id,
        tier: "TIER_4",
        isEnabled: false,
        items: {
          create: {
            companyId: company.id,
            analysisFormId: analysisForm.id,
          },
        },
      },
    });
  });

  after(async () => {
    if (project) {
      await prisma.project.delete({ where: { id: project.id } });
    }
    await prisma.company.delete({ where: { id: company.id } });
    await prisma.analysisForm.delete({ where: { id: analysisForm.id } });
  });

  it("locks Strategy when Tier 4 does not exist", async () => {
    await prisma.companyAnalysisTierConfig.delete({ where: { id: tier4.id } });
    await prisma.company.update({
      where: { id: company.id },
      data: { monitoringUnlockedAt: new Date() },
    });

    assert.equal(await isMonitoringUnlocked(company.id), false);

    tier4 = await prisma.companyAnalysisTierConfig.create({
      data: {
        companyId: company.id,
        tier: "TIER_4",
        isEnabled: false,
        items: {
          create: {
            companyId: company.id,
            analysisFormId: analysisForm.id,
          },
        },
      },
    });
  });

  it("locks Strategy when Tier 4 is disabled, even with a finalized analysis", async () => {
    project = await prisma.project.create({
      data: {
        title: "__qa_test__ finalized tier 4 project",
        creatorId: user.user.id,
        companyId: company.id,
        formId: analysisForm.id,
        status: "FINAL_ANALYSIS",
      },
    });

    await prisma.company.update({
      where: { id: company.id },
      data: { monitoringUnlockedAt: new Date() },
    });

    assert.equal(await isMonitoringUnlocked(company.id), false);
  });

  it("locks Strategy when enabled Tier 4 has no finalized analysis", async () => {
    await prisma.companyAnalysisTierConfig.update({
      where: { id: tier4.id },
      data: { isEnabled: true },
    });
    await prisma.project.update({
      where: { id: project.id },
      data: { status: "WAITING_FOR_FORM" },
    });

    assert.equal(await isMonitoringUnlocked(company.id), false);
  });

  it("unlocks Strategy when enabled Tier 4 has a finalized analysis", async () => {
    await prisma.project.update({
      where: { id: project.id },
      data: { status: "FINAL_ANALYSIS" },
    });

    assert.equal(await isMonitoringUnlocked(company.id), true);
  });

  it("locks again when Tier 4 is disabled and unlocks again when re-enabled", async () => {
    await prisma.companyAnalysisTierConfig.update({
      where: { id: tier4.id },
      data: { isEnabled: false },
    });
    assert.equal(await isMonitoringUnlocked(company.id), false);

    await prisma.companyAnalysisTierConfig.update({
      where: { id: tier4.id },
      data: { isEnabled: true },
    });
    assert.equal(await isMonitoringUnlocked(company.id), true);
  });
});
