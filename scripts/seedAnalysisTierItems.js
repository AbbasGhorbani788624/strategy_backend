/**
 * Assign analysis forms to company tier configs by AnalysisCategory title.
 * Default company: نوساز محاسب
 *
 * Run: node scripts/seedAnalysisTierItems.js
 * Optional: SEED_TIER_COMPANY_NAME="..." node scripts/seedAnalysisTierItems.js
 */
require("dotenv").config();
const prisma = require("../src/prismaClient");
const {
  ensureCompanyTierConfigs,
} = require("../src/services/companyAnalysisTierService");
const {
  STRATEGY_PLANNING_CATEGORY_TITLE,
} = require("../src/utils/buildStrategyProjectQuery");

const DEFAULT_COMPANY_NAME = "نوساز محاسب";

const CATEGORY_TITLES_BY_TIER = {
  TIER_1: [
    "مجموعه تحلیل‌های داخلی",
    "مجموعه تحلیل های محیطی",
  ],
  TIER_2: [
    "مجموعه تحلیل های مبتنی بر عدم قطعیت",
    "مجموعه تحلیل های مالی و اقتصادی",
  ],
  TIER_3: [
    "تحلیل استراتژی های عملیاتی",
    "تست و آزمون استراتژی ها",
    "رهبری استراتژیک و جاری سازی",
  ],
  TIER_4: [STRATEGY_PLANNING_CATEGORY_TITLE],
};

async function loadFormsByCategoryTitles(titles) {
  const categories = await prisma.analysisCategory.findMany({
    where: { title: { in: titles } },
    include: {
      forms: {
        where: { isActive: true },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        select: { id: true, title: true },
      },
      multiForms: {
        where: { isActive: true },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        select: { id: true, title: true },
      },
    },
  });

  const found = new Set(categories.map((category) => category.title));
  for (const title of titles) {
    if (!found.has(title)) {
      console.warn(`Category not found: "${title}"`);
    }
  }

  const singles = [];
  const multis = [];
  for (const category of categories) {
    singles.push(...category.forms);
    multis.push(...category.multiForms);
  }

  return { singles, multis, categoriesFound: categories.length };
}

async function assignTierItemsForCompany(companyId, configId, singles, multis) {
  let sortOrder = 0;

  for (const form of singles) {
    await prisma.companyAnalysisTierItem.upsert({
      where: {
        companyId_analysisFormId: {
          companyId,
          analysisFormId: form.id,
        },
      },
      create: {
        companyId,
        configId,
        analysisFormId: form.id,
        sortOrder: sortOrder++,
      },
      update: {
        configId,
        sortOrder: sortOrder++,
      },
    });
  }

  for (const form of multis) {
    await prisma.companyAnalysisTierItem.upsert({
      where: {
        companyId_multiAnalysisFormId: {
          companyId,
          multiAnalysisFormId: form.id,
        },
      },
      create: {
        companyId,
        configId,
        multiAnalysisFormId: form.id,
        sortOrder: sortOrder++,
      },
      update: {
        configId,
        sortOrder: sortOrder++,
      },
    });
  }

  return { singleCount: singles.length, multiCount: multis.length };
}

const resolveCompany = async (name) => {
  const exact = await prisma.company.findFirst({
    where: { name },
    select: { id: true, name: true },
  });
  if (exact) return exact;

  return prisma.company.findFirst({
    where: { name: { contains: name.trim() } },
    select: { id: true, name: true },
  });
};

const main = async () => {
  const companyName =
    process.env.SEED_TIER_COMPANY_NAME?.trim() || DEFAULT_COMPANY_NAME;

  const company = await resolveCompany(companyName);
  if (!company) {
    throw new Error(`Company not found: "${companyName}"`);
  }

  console.log(`Seeding tier items for: ${company.name} (${company.id})`);

  const tierForms = {};
  for (const [tier, titles] of Object.entries(CATEGORY_TITLES_BY_TIER)) {
    tierForms[tier] = await loadFormsByCategoryTitles(titles);
  }

  await ensureCompanyTierConfigs(company.id);

  const configs = await prisma.companyAnalysisTierConfig.findMany({
    where: { companyId: company.id },
  });
  const configByTier = Object.fromEntries(
    configs.map((config) => [config.tier, config]),
  );

  let totalSingles = 0;
  let totalMultis = 0;

  for (const tier of Object.keys(CATEGORY_TITLES_BY_TIER)) {
    const config = configByTier[tier];
    if (!config) {
      console.warn(`Missing tier config: ${tier}`);
      continue;
    }

    const { singles, multis } = tierForms[tier];
    const counts = await assignTierItemsForCompany(
      company.id,
      config.id,
      singles,
      multis,
    );
    totalSingles += counts.singleCount;
    totalMultis += counts.multiCount;
    console.log(
      `  ${tier}: ${counts.singleCount} single, ${counts.multiCount} multi`,
    );
  }

  console.log(
    `Done. Assigned ${totalSingles + totalMultis} analyses (${totalSingles} single, ${totalMultis} multi).`,
  );
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
