const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../src/prismaClient");
const { listSharedWithMeService } = require("../src/services/strategyPlanCollaboratorsService");
const {
  createTestCompany,
  createTestUser,
  cleanupQaData,
} = require("./helpers/testFixtures");

describe("strategy plan shared-with-me search", { concurrency: false }, () => {
  let company;
  let member;
  let granter;
  let planIds = [];

  before(async () => {
    company = await createTestCompany("shared-search");
    member = await createTestUser({
      role: "MEMBER",
      companyId: company.id,
      usernameLabel: "sharedSearchMember",
    });
    granter = await createTestUser({
      role: "COMPANY",
      companyId: company.id,
      usernameLabel: "sharedSearchCompany",
    });

    for (const title of ["__qa_test__ aaaa shared 1", "__qa_test__ aaaa shared 2"]) {
      const project = await prisma.project.create({
        data: {
          title,
          creatorId: granter.user.id,
          companyId: company.id,
          mode: "SINGLE",
          status: "WAITING_FOR_FORM",
        },
      });

      const plan = await prisma.strategyPlan.create({
        data: {
          projectId: project.id,
          companyId: company.id,
          framework: "OKR",
          status: "DRAFT",
          state: "MAP_GENERATION",
        },
      });

      planIds.push(plan.id);

      await prisma.strategyPlanAccess.create({
        data: {
          companyId: company.id,
          planId: plan.id,
          userId: member.user.id,
          permission: "VIEW",
          grantedByUserId: granter.user.id,
        },
      });
    }
  });

  after(async () => {
    await prisma.strategyPlanAccess.deleteMany({
      where: { planId: { in: planIds } },
    });
    await prisma.strategyPlan.deleteMany({ where: { id: { in: planIds } } });
    await prisma.project.deleteMany({ where: { companyId: company.id } });
    await cleanupQaData();
  });

  const memberUser = () => ({
    id: member.user.id,
    role: "MEMBER",
    companyId: company.id,
  });

  it("without search returns all shared plans", async () => {
    const result = await listSharedWithMeService(memberUser(), {});
    assert.equal(result.items.length, 2);
    assert.equal(result.pagination.totalItems, 2);
  });

  it("search=aaaa matches both by project title", async () => {
    const result = await listSharedWithMeService(memberUser(), { search: "aaaa" });
    assert.equal(result.items.length, 2);
    assert.equal(result.pagination.totalItems, 2);
  });

  it("search with no match returns empty list and zero total", async () => {
    const result = await listSharedWithMeService(memberUser(), {
      search: "للبطا",
    });
    assert.deepEqual(result.items, []);
    assert.equal(result.pagination.totalItems, 0);
    assert.equal(result.pagination.totalPages, 0);
  });

  it("search=zzz returns empty", async () => {
    const result = await listSharedWithMeService(memberUser(), { search: "zzz" });
    assert.equal(result.items.length, 0);
    assert.equal(result.pagination.totalItems, 0);
  });

  it("trims search whitespace", async () => {
    const result = await listSharedWithMeService(memberUser(), {
      search: "  aaaa  ",
    });
    assert.equal(result.items.length, 2);
  });
});
