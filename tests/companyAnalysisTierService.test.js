const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../src/prismaClient");
const {
  getCompanyAnalysisTiersService,
  bootstrapCompanyTierConfigs,
} = require("../src/services/companyAnalysisTierService");
const {
  createTestCompany,
  createTestUser,
  cleanupQaData,
} = require("./helpers/testFixtures");

describe("getCompanyAnalysisTiersService projectCount", { concurrency: false }, () => {
  let company;
  let member;
  let form;
  let tier1Config;

  before(async () => {
    company = await createTestCompany("tier-count");
    member = await createTestUser({
      role: "MEMBER",
      companyId: company.id,
      usernameLabel: "tierCountMember",
    });

    form = await prisma.analysisForm.create({
      data: {
        title: "__qa_test__ tier count form",
        titleFa: "فرم تست",
        isActive: true,
      },
    });

    await bootstrapCompanyTierConfigs(company.id);
    tier1Config = await prisma.companyAnalysisTierConfig.findUnique({
      where: {
        companyId_tier: { companyId: company.id, tier: "TIER_1" },
      },
    });

    await prisma.companyAnalysisTierItem.create({
      data: {
        companyId: company.id,
        configId: tier1Config.id,
        analysisFormId: form.id,
        sortOrder: 0,
      },
    });

    await prisma.project.createMany({
      data: [
        {
          title: "__qa_test__ tier p1",
          creatorId: member.user.id,
          companyId: company.id,
          mode: "SINGLE",
          status: "FINAL_ANALYSIS",
          formId: form.id,
        },
        {
          title: "__qa_test__ tier p2",
          creatorId: member.user.id,
          companyId: company.id,
          mode: "SINGLE",
          status: "FINAL_ANALYSIS",
          formId: form.id,
        },
      ],
    });
  });

  after(async () => {
    await prisma.project.deleteMany({ where: { companyId: company.id } });
    await prisma.companyAnalysisTierItem.deleteMany({
      where: { companyId: company.id },
    });
    await prisma.companyAnalysisTierConfig.deleteMany({
      where: { companyId: company.id },
    });
    await prisma.analysisForm.delete({ where: { id: form.id } });
    await cleanupQaData();
  });

  it("returns projectCount per analysis and completedCount by distinct analyses", async () => {
    const result = await getCompanyAnalysisTiersService(company.id);
    const tier1 = result.tiers.find((t) => t.tier === "TIER_1");

    assert.ok(tier1);
    assert.equal(tier1.analyses.length, 1);
    assert.equal(tier1.analyses[0].id, form.id);
    assert.equal(tier1.analyses[0].projectCount, 2);
    assert.equal(tier1.completedCount, 1);
    assert.equal(tier1.totalCount, 1);
  });
});
