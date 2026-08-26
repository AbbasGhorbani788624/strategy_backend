require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const isBlank = (value) =>
  value === null || value === undefined || String(value).trim() === "";

async function findIncompleteProjects() {
  const projects = await prisma.project.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      mode: true,
      initialAnalysis: true,
      finalAnalysis: true,
      createdAt: true,
      _count: {
        select: {
          strategyPlans: true,
          usedInMultiProjects: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return projects.filter(
    (project) =>
      isBlank(project.initialAnalysis) || isBlank(project.finalAnalysis),
  );
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const force = process.argv.includes("--force");

  const targets = await findIncompleteProjects();

  console.log(`پروژه‌های قابل حذف: ${targets.length}`);

  for (const project of targets) {
    console.log(
      `- ${project.id} | ${project.title} | status=${project.status} | initial=${isBlank(project.initialAnalysis) ? "خالی" : "پر"} | final=${isBlank(project.finalAnalysis) ? "خالی" : "پر"} | strategyPlans=${project._count.strategyPlans} | usedAsSource=${project._count.usedInMultiProjects}`,
    );
  }

  if (targets.length === 0) {
    console.log("چیزی برای حذف نیست.");
    return;
  }

  if (dryRun) {
    console.log("\nDry-run — حذفی انجام نشد. برای حذف واقعی: --force");
    return;
  }

  if (!force) {
    console.log(
      "\nبرای حذف واقعی:\nnode seedDeleteIncompleteProjects.js --force",
    );
    return;
  }

  const ids = targets.map((project) => project.id);

  const result = await prisma.project.deleteMany({
    where: { id: { in: ids } },
  });

  console.log(`\n✅ ${result.count} پروژه حذف شد.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
