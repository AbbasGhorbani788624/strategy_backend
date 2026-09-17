/**
 * Create empty 4-tier configs for companies that don't have them yet.
 * Does not assign analyses — admin assigns items manually in AdminJS.
 * Run after migration: node scripts/bootstrapAnalysisTiers.js
 */
const prisma = require("../src/prismaClient");
const {
  bootstrapCompanyTierConfigs,
  ensureCompanyTierConfigs,
} = require("../src/services/companyAnalysisTierService");

const main = async () => {
  const companies = await prisma.company.findMany({
    select: { id: true, name: true },
  });

  for (const company of companies) {
    const existing = await prisma.companyAnalysisTierConfig.count({
      where: { companyId: company.id },
    });

    if (existing === 0) {
      await bootstrapCompanyTierConfigs(company.id);
      console.log(`Bootstrapped tiers for: ${company.name} (${company.id})`);
    } else {
      await ensureCompanyTierConfigs(company.id);
      console.log(`Already configured: ${company.name} (${company.id})`);
    }
  }

  const companiesWithPlans = await prisma.company.findMany({
    where: {
      monitoringUnlockedAt: null,
      strategyPlans: { some: {} },
    },
    select: { id: true },
  });

  if (companiesWithPlans.length > 0) {
    await prisma.company.updateMany({
      where: {
        id: { in: companiesWithPlans.map((company) => company.id) },
      },
      data: {
        monitoringUnlockedAt: new Date(),
      },
    });
  }

  console.log(
    `Monitoring unlocked for ${companiesWithPlans.length} companies with existing strategy plans.`,
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
