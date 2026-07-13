require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 شروع seed فرم تحلیل BAV...");

  // ========================================
  // ایجاد AnalysisForm
  // ========================================
  const bavForm = await prisma.analysisForm.create({
    data: {
      title: "تحلیل Strategic Brand Asset Valuator (BAV)",
      info: "ارزیابی جامع ارزش برند با استفاده از مدل BAV",
      isActive: true,
      order: 1,
      temperature: 0.3,
      checklistTitle: "چک‌لیست ارزیابی BAV",
    },
  });

  console.log(`✅ AnalysisForm ایجاد شد: ${bavForm.id}`);

  // ========================================
  // دسته‌بندی‌ها
  // ========================================
  const catProfile = await prisma.formQuestionCategory.create({
    data: { title: "پروفایل سازمانی", order: 1, analysisFormId: bavForm.id },
  });

  const catDifferentiation = await prisma.formQuestionCategory.create({
    data: {
      title: "تمایز (Differentiation)",
      order: 2,
      analysisFormId: bavForm.id,
    },
  });

  const catRelevance = await prisma.formQuestionCategory.create({
    data: {
      title: "مرتبط بودن (Relevance)",
      order: 3,
      analysisFormId: bavForm.id,
    },
  });

  const catEsteem = await prisma.formQuestionCategory.create({
    data: { title: "احترام (Esteem)", order: 4, analysisFormId: bavForm.id },
  });

  const catKnowledge = await prisma.formQuestionCategory.create({
    data: { title: "شناخت (Knowledge)", order: 5, analysisFormId: bavForm.id },
  });

  const catEvidence = await prisma.formQuestionCategory.create({
    data: { title: "شواهد و اعتبارسنجی", order: 6, analysisFormId: bavForm.id },
  });

  // ========================================
  // سوالات پروفایل سازمانی (با TEXT)
  // ========================================
  await prisma.formQuestion.create({
    data: {
      categoryId: catProfile.id,
      label: "نام سازمان و صنعت فعالیت چیست؟",
      type: "TEXT",
      required: true,
      order: 1,
    },
  });

  await prisma.formQuestion.create({
    data: {
      categoryId: catProfile.id,
      label: "محصولات و خدمات اصلی سازمان چیست؟",
      type: "TEXT",
      required: true,
      order: 2,
    },
  });

  await prisma.formQuestion.create({
    data: {
      categoryId: catProfile.id,
      label: "مشتریان هدف سازمان کدام هستند؟",
      type: "TEXT",
      required: true,
      order: 3,
    },
  });

  await prisma.formQuestion.create({
    data: {
      categoryId: catProfile.id,
      label: "رقبای اصلی و موقعیت رقابتی فعلی را توصیف کنید.",
      type: "TEXT",
      required: true,
      order: 4,
    },
  });

  // ========================================
  // سوالات BAV (RADIO)
  // ========================================
  const bavQuestionsData = [
    {
      cat: catDifferentiation.id,
      label: "برند ما تا چه حد از رقبا متمایز است؟",
      weight: 20,
      order: 1,
    },
    {
      cat: catDifferentiation.id,
      label: "ارزش پیشنهادی ما چقدر منحصربه‌فرد است؟",
      weight: 20,
      order: 2,
    },
    {
      cat: catDifferentiation.id,
      label: "برند ما چه ویژگی‌هایی دارد که رقبا ندارند؟",
      weight: 20,
      order: 3,
    },
    {
      cat: catRelevance.id,
      label: "برند ما چقدر با نیازهای مشتریان هدف همخوانی دارد؟",
      weight: 20,
      order: 1,
    },
    {
      cat: catRelevance.id,
      label: "مشتریان هدف تا چه حد خود را با برند ما مرتبط می‌دانند؟",
      weight: 20,
      order: 2,
    },
    {
      cat: catEsteem.id,
      label: "مشتریان تا چه حد به برند ما احترام می‌گذارند؟",
      weight: 20,
      order: 1,
    },
    {
      cat: catEsteem.id,
      label: "برند ما تا چه حد قابل اعتماد و معتبر است؟",
      weight: 20,
      order: 2,
    },
    {
      cat: catKnowledge.id,
      label: "میزان شناخت و آگاهی مشتریان از برند ما چقدر است؟",
      weight: 20,
      order: 1,
    },
    {
      cat: catKnowledge.id,
      label: "برند ما تا چه حد در ذهن مشتریان حضور دارد؟",
      weight: 20,
      order: 2,
    },
  ];

  for (const q of bavQuestionsData) {
    const created = await prisma.formQuestion.create({
      data: {
        categoryId: q.cat,
        label: q.label,
        type: "RADIO",
        isScored: true,
        weight: q.weight,
        required: true,
        order: q.order,
      },
    });

    await prisma.formQuestionOption.createMany({
      data: [
        {
          questionId: created.id,
          label: "خیلی ضعیف",
          value: "1",
          score: 1,
          order: 1,
        },
        {
          questionId: created.id,
          label: "ضعیف",
          value: "2",
          score: 2,
          order: 2,
        },
        {
          questionId: created.id,
          label: "متوسط",
          value: "3",
          score: 3,
          order: 3,
        },
        {
          questionId: created.id,
          label: "خوب",
          value: "4",
          score: 4,
          order: 4,
        },
        {
          questionId: created.id,
          label: "عالی",
          value: "5",
          score: 5,
          order: 5,
        },
      ],
    });
  }

  // ========================================
  // سوال شواهد
  // ========================================
  await prisma.formQuestion.create({
    data: {
      categoryId: catEvidence.id,
      label:
        "لطفاً شواهد، داده‌ها یا مثال‌هایی برای پشتیبانی از پاسخ‌های خود ارائه دهید.",
      type: "TEXT",
      required: false,
      order: 1,
    },
  });

  console.log(`✅ فرم BAV با موفقیت ایجاد شد!`);
  console.log(`AnalysisForm ID: ${bavForm.id}`);
}

main()
  .then(() => console.log("🌱 Seed با موفقیت تمام شد."))
  .catch((e) => {
    console.error("❌ خطا:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
