const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../../src/prismaClient");
const { agent, withAuthCookie } = require("../helpers/testApp");
const {
  createTwoCompanyScenario,
  cleanupQaData,
  QA_PREFIX,
} = require("../helpers/testFixtures");
const { STRATEGY_PLANNING_CATEGORY_TITLE } = require("../../src/utils/buildStrategyProjectQuery");
const {
  ensureCompanyTierConfigs,
} = require("../../src/services/companyAnalysisTierService");

describe("GET /api/project/strategy-flow", { concurrency: false }, () => {
  let scenario;
  let strategyCategoryId;
  let strategyMultiFormId;
  let otherMultiFormId;
  let bscProjectId;
  let okrOnlyMultiProjectId;
  let okrSingleProjectId;
  let okrTier4SecondProjectId;

  before(async () => {
    scenario = await createTwoCompanyScenario();

    let strategyCategory = await prisma.analysisCategory.findFirst({
      where: { title: STRATEGY_PLANNING_CATEGORY_TITLE },
      select: { id: true },
    });

    if (!strategyCategory) {
      strategyCategory = await prisma.analysisCategory.create({
        data: { title: STRATEGY_PLANNING_CATEGORY_TITLE },
        select: { id: true },
      });
    }
    strategyCategoryId = strategyCategory.id;

    const strategyMultiForm = await prisma.multiAnalysisForm.create({
      data: {
        title: `${QA_PREFIX}strategy_multi`,
        categoryId: strategyCategoryId,
      },
      select: { id: true },
    });
    strategyMultiFormId = strategyMultiForm.id;

    const otherMultiForm = await prisma.multiAnalysisForm.create({
      data: {
        title: `${QA_PREFIX}other_multi`,
        categoryId: null,
      },
      select: { id: true },
    });
    otherMultiFormId = otherMultiForm.id;

    const companyId = scenario.companyA.id;
    const creatorId = scenario.companyUserA.user.id;

    await ensureCompanyTierConfigs(companyId);
    const tier4Config = await prisma.companyAnalysisTierConfig.findUnique({
      where: {
        companyId_tier: { companyId, tier: "TIER_4" },
      },
      select: { id: true },
    });
    await prisma.companyAnalysisTierItem.upsert({
      where: {
        companyId_multiAnalysisFormId: {
          companyId,
          multiAnalysisFormId: strategyMultiFormId,
        },
      },
      create: {
        companyId,
        configId: tier4Config.id,
        multiAnalysisFormId: strategyMultiFormId,
        sortOrder: 0,
      },
      update: {
        configId: tier4Config.id,
      },
    });

    const bscProject = await prisma.project.create({
      data: {
        title: `${QA_PREFIX}bsc_flow`,
        creatorId,
        companyId,
        mode: "MULTI",
        multiAnalysisFormId: strategyMultiFormId,
        status: "FINAL_ANALYSIS",
      },
      select: { id: true },
    });
    bscProjectId = bscProject.id;

    const okrOnlyMulti = await prisma.project.create({
      data: {
        title: `${QA_PREFIX}okr_multi_other_cat`,
        creatorId,
        companyId,
        mode: "MULTI",
        multiAnalysisFormId: otherMultiFormId,
        status: "FINAL_ANALYSIS",
      },
      select: { id: true },
    });
    okrOnlyMultiProjectId = okrOnlyMulti.id;

    const okrSingle = await prisma.project.create({
      data: {
        title: `${QA_PREFIX}okr_single`,
        creatorId,
        companyId,
        mode: "SINGLE",
        status: "FINAL_ANALYSIS",
      },
      select: { id: true },
    });
    okrSingleProjectId = okrSingle.id;

    const okrTier4Second = await prisma.project.create({
      data: {
        title: `${QA_PREFIX}okr_tier4_second`,
        creatorId,
        companyId,
        mode: "MULTI",
        multiAnalysisFormId: strategyMultiFormId,
        status: "FINAL_ANALYSIS",
      },
      select: { id: true },
    });
    okrTier4SecondProjectId = okrTier4Second.id;
  });

  after(async () => {
    await prisma.multiAnalysisForm.deleteMany({
      where: {
        id: { in: [strategyMultiFormId, otherMultiFormId].filter(Boolean) },
      },
    });
    await cleanupQaData();
  });

  const companyGet = (path) =>
    withAuthCookie(agent().get(path), scenario.companyUserA.accessToken);

  it("returns 400 when framework is missing", async () => {
    const res = await companyGet("/api/project/strategy-flow?page=1&limit=6");
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it("returns 400 when page or limit is missing", async () => {
    const res = await companyGet(
      "/api/project/strategy-flow?framework=OKR&limit=6",
    );
    assert.equal(res.status, 400);
  });

  it("framework=OKR lists tier-4 analysis projects only; BSC is MULTI + strategy category", async () => {
    const okrRes = await companyGet(
      "/api/project/strategy-flow?framework=OKR&page=1&limit=50",
    );
    assert.equal(okrRes.status, 200);
    assert.equal(okrRes.body.success, true);

    const okrIds = okrRes.body.data.projects.map((p) => p.id);
    assert.ok(okrIds.includes(bscProjectId));
    assert.ok(okrIds.includes(okrTier4SecondProjectId));
    assert.ok(!okrIds.includes(okrOnlyMultiProjectId));
    assert.ok(!okrIds.includes(okrSingleProjectId));

    const bscRes = await companyGet(
      "/api/project/strategy-flow?framework=BSC&page=1&limit=50",
    );
    assert.equal(bscRes.status, 200);
    const bscIds = bscRes.body.data.projects.map((p) => p.id);
    assert.ok(bscIds.includes(bscProjectId));
    assert.ok(bscIds.includes(okrTier4SecondProjectId));
    assert.ok(!bscIds.includes(okrOnlyMultiProjectId));
    assert.ok(!bscIds.includes(okrSingleProjectId));

    assert.ok(
      okrRes.body.data.pagination.totalItems >=
        bscRes.body.data.pagination.totalItems,
    );
  });

  it("targetUserId filters to projects created by that member", async () => {
    const memberProject = await prisma.project.create({
      data: {
        title: `${QA_PREFIX}member_project`,
        creatorId: scenario.memberA.user.id,
        companyId: scenario.companyA.id,
        mode: "MULTI",
        multiAnalysisFormId: strategyMultiFormId,
        status: "FINAL_ANALYSIS",
      },
      select: { id: true },
    });

    const res = await companyGet(
      `/api/project/strategy-flow?framework=OKR&page=1&limit=50&targetUserId=${scenario.memberA.user.id}`,
    );

    assert.equal(res.status, 200);
    const ids = res.body.data.projects.map((p) => p.id);
    assert.ok(ids.includes(memberProject.id));
    assert.ok(!ids.includes(bscProjectId));
  });

  it("member from another company does not see company A projects", async () => {
    const res = await withAuthCookie(
      agent().get(
        "/api/project/strategy-flow?framework=OKR&page=1&limit=50",
      ),
      scenario.memberB.accessToken,
    );

    assert.equal(res.status, 200);
    const ids = res.body.data.projects.map((p) => p.id);
    assert.ok(!ids.includes(bscProjectId));
  });

  it("pagination applies within filtered set", async () => {
    const page1 = await companyGet(
      "/api/project/strategy-flow?framework=OKR&page=1&limit=1&sortBy=createdAt&sortOrder=desc",
    );
    const page2 = await companyGet(
      "/api/project/strategy-flow?framework=OKR&page=2&limit=1&sortBy=createdAt&sortOrder=desc",
    );

    assert.equal(page1.status, 200);
    assert.equal(page2.status, 200);
    assert.equal(page1.body.data.projects.length, 1);
    assert.equal(page2.body.data.projects.length, 1);
    assert.notEqual(
      page1.body.data.projects[0].id,
      page2.body.data.projects[0].id,
    );
  });
});
