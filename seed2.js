require("dotenv").config();
const { PrismaClient, QuestionType } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const form = await prisma.analysisForm.create({
    data: {
      title: "فرم ارزیابی بلوغ سازمان",
    },
  });

  const leadership = await prisma.formQuestionCategory.create({
    data: {
      title: "رهبری",
      order: 1,
      formId: form.id,
    },
  });

  const hr = await prisma.formQuestionCategory.create({
    data: {
      title: "منابع انسانی",
      order: 2,
      formId: form.id,
    },
  });

  const technology = await prisma.formQuestionCategory.create({
    data: {
      title: "فناوری",
      order: 3,
      formId: form.id,
    },
  });

  const finance = await prisma.formQuestionCategory.create({
    data: {
      title: "مالی",
      order: 4,
      formId: form.id,
    },
  });

  const marketing = await prisma.formQuestionCategory.create({
    data: {
      title: "بازاریابی",
      order: 5,
      formId: form.id,
    },
  });

  const vision = await prisma.formQuestionCategory.create({
    data: {
      title: "چشم انداز",
      order: 1,
      formId: form.id,
      parentId: leadership.id,
    },
  });

  const decision = await prisma.formQuestionCategory.create({
    data: {
      title: "تصمیم گیری",
      order: 2,
      formId: form.id,
      parentId: leadership.id,
    },
  });

  const culture = await prisma.formQuestionCategory.create({
    data: {
      title: "فرهنگ سازمانی",
      order: 3,
      formId: form.id,
      parentId: leadership.id,
    },
  });

  const hiring = await prisma.formQuestionCategory.create({
    data: {
      title: "جذب",
      order: 1,
      formId: form.id,
      parentId: hr.id,
    },
  });

  const training = await prisma.formQuestionCategory.create({
    data: {
      title: "آموزش",
      order: 2,
      formId: form.id,
      parentId: hr.id,
    },
  });

  const performance = await prisma.formQuestionCategory.create({
    data: {
      title: "ارزیابی عملکرد",
      order: 3,
      formId: form.id,
      parentId: hr.id,
    },
  });

  const software = await prisma.formQuestionCategory.create({
    data: {
      title: "نرم افزارها",
      order: 1,
      formId: form.id,
      parentId: technology.id,
    },
  });

  const security = await prisma.formQuestionCategory.create({
    data: {
      title: "امنیت اطلاعات",
      order: 2,
      formId: form.id,
      parentId: technology.id,
    },
  });

  const leadershipGroup = await prisma.formCategoryGroup.create({
    data: {
      title: "گروه رهبری",
      order: 1,
      formId: form.id,
    },
  });

  const hrGroup = await prisma.formCategoryGroup.create({
    data: {
      title: "گروه منابع انسانی",
      order: 2,
      formId: form.id,
    },
  });

  const organizationGroup = await prisma.formCategoryGroup.create({
    data: {
      title: "گروه بلوغ سازمان",
      order: 3,
      formId: form.id,
    },
  });

  ///////

  // ========================================
  // Questions
  // ========================================

  // -----------------------------
  // Vision (100)
  // -----------------------------
  const visionQ1 = await prisma.formQuestion.create({
    data: {
      formId: form.id,
      categoryId: vision.id,
      label: "چشم‌انداز سازمان تا چه حد برای کارکنان شفاف است؟",
      type: QuestionType.RADIO,
      weight: 40,
      isScored: true,
      required: true,
      order: 1,
    },
  });

  const visionQ2 = await prisma.formQuestion.create({
    data: {
      formId: form.id,
      categoryId: vision.id,
      label: "مدیران تا چه حد چشم‌انداز سازمان را دنبال می‌کنند؟",
      type: QuestionType.RADIO,
      weight: 60,
      isScored: true,
      required: true,
      order: 2,
    },
  });

  // -----------------------------
  // Decision (100)
  // -----------------------------
  const decisionQ1 = await prisma.formQuestion.create({
    data: {
      formId: form.id,
      categoryId: decision.id,
      label: "تصمیم‌ها بر اساس داده اتخاذ می‌شوند؟",
      type: QuestionType.RADIO,
      weight: 50,
      isScored: true,
      required: true,
      order: 1,
    },
  });

  const decisionQ2 = await prisma.formQuestion.create({
    data: {
      formId: form.id,
      categoryId: decision.id,
      label: "کارکنان در تصمیم‌گیری مشارکت دارند؟",
      type: QuestionType.RADIO,
      weight: 50,
      isScored: true,
      required: true,
      order: 2,
    },
  });

  // -----------------------------
  // Culture (Normal)
  // -----------------------------
  const cultureQ1 = await prisma.formQuestion.create({
    data: {
      formId: form.id,
      categoryId: culture.id,
      label: "آیا سازمان برنامه‌های فرهنگی برگزار می‌کند؟",
      type: QuestionType.CHECKBOX,
      weight: null,
      isScored: false,
      required: false,
      order: 1,
    },
  });

  const cultureQ2 = await prisma.formQuestion.create({
    data: {
      formId: form.id,
      categoryId: culture.id,
      label: "کارکنان از چه مزایایی برخوردار هستند؟",
      type: QuestionType.CHECKBOX,
      weight: null,
      isScored: false,
      required: false,
      order: 2,
    },
  });

  // -----------------------------
  // Hiring (100)
  // -----------------------------
  const hiringQ1 = await prisma.formQuestion.create({
    data: {
      formId: form.id,
      categoryId: hiring.id,
      label: "فرآیند جذب استاندارد است؟",
      type: QuestionType.RADIO,
      weight: 50,
      isScored: true,
      required: true,
      order: 1,
    },
  });

  const hiringQ2 = await prisma.formQuestion.create({
    data: {
      formId: form.id,
      categoryId: hiring.id,
      label: "مصاحبه‌ها ساختارمند برگزار می‌شوند؟",
      type: QuestionType.RADIO,
      weight: 50,
      isScored: true,
      required: true,
      order: 2,
    },
  });

  // -----------------------------
  // Training (100)
  // -----------------------------
  const trainingQ1 = await prisma.formQuestion.create({
    data: {
      formId: form.id,
      categoryId: training.id,
      label: "برنامه آموزشی سالانه وجود دارد؟",
      type: QuestionType.RADIO,
      weight: 20,
      isScored: true,
      required: true,
      order: 1,
    },
  });

  const trainingQ2 = await prisma.formQuestion.create({
    data: {
      formId: form.id,
      categoryId: training.id,
      label: "بودجه آموزش کافی است؟",
      type: QuestionType.RADIO,
      weight: 30,
      isScored: true,
      required: true,
      order: 2,
    },
  });

  const trainingQ3 = await prisma.formQuestion.create({
    data: {
      formId: form.id,
      categoryId: training.id,
      label: "اثربخشی آموزش ارزیابی می‌شود؟",
      type: QuestionType.RADIO,
      weight: 50,
      isScored: true,
      required: true,
      order: 3,
    },
  });

  // -----------------------------
  // Performance (Normal)
  // -----------------------------
  const performanceQ1 = await prisma.formQuestion.create({
    data: {
      formId: form.id,
      categoryId: performance.id,
      label: "آیا ارزیابی عملکرد به صورت دوره‌ای انجام می‌شود؟",
      type: QuestionType.CHECKBOX,
      weight: null,
      isScored: false,
      required: false,
      order: 1,
    },
  });

  const performanceQ2 = await prisma.formQuestion.create({
    data: {
      formId: form.id,
      categoryId: performance.id,
      label: "کارکنان بازخورد عملکرد دریافت می‌کنند؟",
      type: QuestionType.CHECKBOX,
      weight: null,
      isScored: false,
      required: false,
      order: 2,
    },
  });

  // -----------------------------
  // Software (100)
  // -----------------------------
  const softwareQ1 = await prisma.formQuestion.create({
    data: {
      formId: form.id,
      categoryId: software.id,
      label: "نرم‌افزارهای سازمان به‌روز هستند؟",
      type: QuestionType.RADIO,
      weight: 40,
      isScored: true,
      required: true,
      order: 1,
    },
  });

  const softwareQ2 = await prisma.formQuestion.create({
    data: {
      formId: form.id,
      categoryId: software.id,
      label: "یکپارچگی نرم‌افزارهای سازمان مناسب است؟",
      type: QuestionType.RADIO,
      weight: 60,
      isScored: true,
      required: true,
      order: 2,
    },
  });

  // -----------------------------
  // Security (Normal)
  // -----------------------------
  const securityQ1 = await prisma.formQuestion.create({
    data: {
      formId: form.id,
      categoryId: security.id,
      label: "چه راهکارهای امنیتی استفاده می‌شود؟",
      type: QuestionType.CHECKBOX,
      weight: null,
      isScored: false,
      required: false,
      order: 1,
    },
  });

  // -----------------------------
  // Finance (Normal)
  // -----------------------------
  const financeQ1 = await prisma.formQuestion.create({
    data: {
      formId: form.id,
      categoryId: finance.id,
      label: "بودجه سالانه تدوین می‌شود؟",
      type: QuestionType.CHECKBOX,
      weight: null,
      isScored: false,
      required: false,
      order: 1,
    },
  });

  const financeQ2 = await prisma.formQuestion.create({
    data: {
      formId: form.id,
      categoryId: finance.id,
      label: "گزارش‌های مالی ماهانه تهیه می‌شوند؟",
      type: QuestionType.CHECKBOX,
      weight: null,
      isScored: false,
      required: false,
      order: 2,
    },
  });

  // -----------------------------
  // Marketing (100)
  // -----------------------------
  const marketingQ1 = await prisma.formQuestion.create({
    data: {
      formId: form.id,
      categoryId: marketing.id,
      label: "تحقیقات بازار انجام می‌شود؟",
      type: QuestionType.RADIO,
      weight: 25,
      isScored: true,
      required: true,
      order: 1,
    },
  });

  const marketingQ2 = await prisma.formQuestion.create({
    data: {
      formId: form.id,
      categoryId: marketing.id,
      label: "استراتژی برند مشخص است؟",
      type: QuestionType.RADIO,
      weight: 25,
      isScored: true,
      required: true,
      order: 2,
    },
  });

  const marketingQ3 = await prisma.formQuestion.create({
    data: {
      formId: form.id,
      categoryId: marketing.id,
      label: "کمپین‌های تبلیغاتی ارزیابی می‌شوند؟",
      type: QuestionType.RADIO,
      weight: 25,
      isScored: true,
      required: true,
      order: 3,
    },
  });

  const marketingQ4 = await prisma.formQuestion.create({
    data: {
      formId: form.id,
      categoryId: marketing.id,
      label: "رضایت مشتری به صورت مستمر اندازه‌گیری می‌شود؟",
      type: QuestionType.RADIO,
      weight: 25,
      isScored: true,
      required: true,
      order: 4,
    },
  });

  async function createRadioOptions(questionId) {
    return prisma.formQuestionOption.createMany({
      data: [
        {
          questionId,
          label: "خیلی ضعیف",
          value: "VERY_LOW",
          score: 1,
          order: 1,
        },
        {
          questionId,
          label: "ضعیف",
          value: "LOW",
          score: 2,
          order: 2,
        },
        {
          questionId,
          label: "متوسط",
          value: "MEDIUM",
          score: 3,
          order: 3,
        },
        {
          questionId,
          label: "خوب",
          value: "GOOD",
          score: 4,
          order: 4,
        },
        {
          questionId,
          label: "عالی",
          value: "EXCELLENT",
          score: 5,
          order: 5,
        },
      ],
    });
  }

  await createRadioOptions(visionQ1.id);
  await createRadioOptions(visionQ2.id);

  await createRadioOptions(decisionQ1.id);
  await createRadioOptions(decisionQ2.id);

  await createRadioOptions(hiringQ1.id);
  await createRadioOptions(hiringQ2.id);

  await createRadioOptions(trainingQ1.id);
  await createRadioOptions(trainingQ2.id);
  await createRadioOptions(trainingQ3.id);

  await createRadioOptions(softwareQ1.id);
  await createRadioOptions(softwareQ2.id);

  await createRadioOptions(marketingQ1.id);
  await createRadioOptions(marketingQ2.id);
  await createRadioOptions(marketingQ3.id);
  await createRadioOptions(marketingQ4.id);

  await prisma.formQuestionOption.createMany({
    data: [
      {
        questionId: cultureQ2.id,
        label: "بیمه",
        value: "insurance",
        order: 1,
      },
      {
        questionId: cultureQ2.id,
        label: "پاداش",
        value: "bonus",
        order: 2,
      },
      {
        questionId: cultureQ2.id,
        label: "سرویس",
        value: "service",
        order: 3,
      },
      {
        questionId: cultureQ2.id,
        label: "ناهار",
        value: "lunch",
        order: 4,
      },
    ],
  });

  await prisma.formQuestionOption.createMany({
    data: [
      {
        questionId: securityQ1.id,
        label: "Firewall",
        value: "firewall",
        order: 1,
      },
      {
        questionId: securityQ1.id,
        label: "Antivirus",
        value: "antivirus",
        order: 2,
      },
      {
        questionId: securityQ1.id,
        label: "Backup",
        value: "backup",
        order: 3,
      },
      {
        questionId: securityQ1.id,
        label: "VPN",
        value: "vpn",
        order: 4,
      },
    ],
  });

  await prisma.formCategoryGroupItem.createMany({
    data: [
      {
        groupId: leadershipGroup.id,
        categoryId: leadership.id,
      },
    ],
  });

  await prisma.formCategoryGroupItem.createMany({
    data: [
      {
        groupId: hrGroup.id,
        categoryId: hr.id,
      },
    ],
  });

  await prisma.formCategoryGroupItem.createMany({
    data: [
      {
        groupId: organizationGroup.id,
        categoryId: leadership.id,
      },
      {
        groupId: organizationGroup.id,
        categoryId: hr.id,
      },
      {
        groupId: organizationGroup.id,
        categoryId: technology.id,
      },
      {
        groupId: organizationGroup.id,
        categoryId: marketing.id,
      },
    ],
  });
}

main()
  .then(() => {
    console.log("🌱 Seed completed successfully.");
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
