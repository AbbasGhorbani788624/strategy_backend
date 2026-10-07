require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function scoreQuestionsForForm(formLabel, categoryWhere) {
  const questions = await prisma.formQuestion.findMany({
    where: { category: categoryWhere },
    include: {
      options: { orderBy: { order: "asc" } },
    },
    orderBy: { order: "asc" },
  });

  let updatedOptions = 0;
  let updatedQuestionsScored = 0;
  let updatedQuestionsWeight = 0;

  for (const question of questions) {
    const questionData = {};

    if (question.weight == null) {
      questionData.weight = 1;
      updatedQuestionsWeight += 1;
    }

    if (question.options.length > 0) {
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
        questionData.isScored = true;
        updatedQuestionsScored += 1;
      }

      const scoreSummary = sorted
        .map((o, i) => `${i + 1}:${o.label.slice(0, 30)}`)
        .join(" | ");
      const weightNote =
        question.weight == null ? ", weight→1" : "";
      console.log(
        `  ✅ ${question.label.slice(0, 60)}… → scores 1–${sorted.length}${weightNote} (${scoreSummary})`,
      );
    } else if (question.weight == null) {
      console.log(
        `  ✅ ${question.label.slice(0, 60)}… → weight 1 (no options)`,
      );
    }

    if (Object.keys(questionData).length > 0) {
      await prisma.formQuestion.update({
        where: { id: question.id },
        data: questionData,
      });
    }
  }

  console.log(
    `  — ${formLabel}: ${questions.length} questions, ${updatedOptions} options updated, ${updatedQuestionsScored} marked isScored, ${updatedQuestionsWeight} weight set to 1.`,
  );

  return {
    questionsScanned: questions.length,
    updatedOptions,
    updatedQuestionsScored,
    updatedQuestionsWeight,
  };
}

async function scoreSingleForm(analysisFormId) {
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

  return scoreQuestionsForForm(
    form.title,
    analysisForm
      ? { analysisFormId }
      : { multiAnalysisFormId: analysisFormId },
  );
}

async function scoreAllForms() {
  const [analysisForms, multiAnalysisForms] = await Promise.all([
    prisma.analysisForm.findMany({
      select: { id: true, title: true },
      orderBy: { order: "asc" },
    }),
    prisma.multiAnalysisForm.findMany({
      select: { id: true, title: true },
      orderBy: { order: "asc" },
    }),
  ]);

  console.log(
    `Scoring all forms: ${analysisForms.length} AnalysisForm, ${multiAnalysisForms.length} MultiAnalysisForm\n`,
  );

  const totals = {
    forms: 0,
    questionsScanned: 0,
    updatedOptions: 0,
    updatedQuestionsScored: 0,
    updatedQuestionsWeight: 0,
  };

  for (const form of analysisForms) {
    console.log(`\n[AnalysisForm] ${form.title} (${form.id})`);
    const stats = await scoreQuestionsForForm(form.title, {
      analysisFormId: form.id,
    });
    totals.forms += 1;
    totals.questionsScanned += stats.questionsScanned;
    totals.updatedOptions += stats.updatedOptions;
    totals.updatedQuestionsScored += stats.updatedQuestionsScored;
    totals.updatedQuestionsWeight += stats.updatedQuestionsWeight;
  }

  for (const form of multiAnalysisForms) {
    console.log(`\n[MultiAnalysisForm] ${form.title} (${form.id})`);
    const stats = await scoreQuestionsForForm(form.title, {
      multiAnalysisFormId: form.id,
    });
    totals.forms += 1;
    totals.questionsScanned += stats.questionsScanned;
    totals.updatedOptions += stats.updatedOptions;
    totals.updatedQuestionsScored += stats.updatedQuestionsScored;
    totals.updatedQuestionsWeight += stats.updatedQuestionsWeight;
  }

  return totals;
}

async function main() {
  const formIdArg = process.argv[2];

  if (formIdArg && formIdArg !== "--all") {
    const stats = await scoreSingleForm(formIdArg);
    console.log(
      `\nDone. ${stats.questionsScanned} questions scanned, ${stats.updatedOptions} options updated, ${stats.updatedQuestionsScored} marked isScored, ${stats.updatedQuestionsWeight} weight set to 1.`,
    );
    return;
  }

  const totals = await scoreAllForms();
  console.log(
    `\nDone (all forms). ${totals.forms} forms, ${totals.questionsScanned} questions scanned, ${totals.updatedOptions} options updated, ${totals.updatedQuestionsScored} marked isScored, ${totals.updatedQuestionsWeight} weight set to 1.`,
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
