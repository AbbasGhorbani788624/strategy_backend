require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const DEFAULT_FORM_ID = "802e3605-2aba-4788-9cd5-398f4450ebcb";

async function main() {
  const analysisFormId = process.argv[2] || DEFAULT_FORM_ID;

  const analysisForm = await prisma.analysisForm.findUnique({
    where: { id: analysisFormId },
    select: { id: true, title: true },
  });

  const multiAnalysisForm = analysisForm
    ? null
    : await prisma.multiAnalysisForm.findUnique({
        where: { id: analysisFormId },
        select: { id: true, title: true },
      });

  const form = analysisForm ?? multiAnalysisForm;

  if (!form) {
    throw new Error(
      `AnalysisForm / MultiAnalysisForm not found: ${analysisFormId}`,
    );
  }

  console.log(`Form: ${form.title} (${form.id})`);

  const questions = await prisma.formQuestion.findMany({
    where: {
      category: analysisForm
        ? { analysisFormId }
        : { multiAnalysisFormId: analysisFormId },
    },
    include: {
      options: { orderBy: { order: "asc" } },
    },
    orderBy: { order: "asc" },
  });

  let updatedOptions = 0;
  let updatedQuestions = 0;

  for (const question of questions) {
    if (question.options.length === 0) {
      continue;
    }

    const sorted = [...question.options].sort((a, b) => a.order - b.order);

    for (let i = 0; i < sorted.length; i++) {
      const score = i + 1;
      const option = sorted[i];

      if (option.score === score) {
        continue;
      }

      await prisma.formQuestionOption.update({
        where: { id: option.id },
        data: { score },
      });
      updatedOptions += 1;
    }

    if (!question.isScored) {
      await prisma.formQuestion.update({
        where: { id: question.id },
        data: { isScored: true },
      });
      updatedQuestions += 1;
    }

    const scoreSummary = sorted.map((o, i) => `${i + 1}:${o.label.slice(0, 30)}`).join(" | ");
    console.log(`✅ ${question.label.slice(0, 60)}… → scores 1–${sorted.length} (${scoreSummary})`);
  }

  console.log(
    `Done. ${questions.length} questions scanned, ${updatedOptions} options updated, ${updatedQuestions} questions marked isScored.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
