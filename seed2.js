require("dotenv").config();
const { PrismaClient, QuestionType } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // ========================================
  // Multi Analysis Form (چند مرحله‌ای)
  // ========================================

  const multiForm = await prisma.multiAnalysisForm.create({
    data: {
      title: "ارزیابی بلوغ سازمان - چند مرحله‌ای",
      description: "ارزیابی جامع بلوغ سازمان در چندین مرحله و حوزه",
      isActive: true,
      order: 1,
    },
  });

  // ========================================
  // دسته‌بندی‌ها
  // ========================================

  const mLeadership = await prisma.formQuestionCategory.create({
    data: { title: "رهبری", order: 1, multiAnalysisFormId: multiForm.id },
  });

  const mHr = await prisma.formQuestionCategory.create({
    data: {
      title: "منابع انسانی",
      order: 2,
      multiAnalysisFormId: multiForm.id,
    },
  });

  const mTechnology = await prisma.formQuestionCategory.create({
    data: { title: "فناوری", order: 3, multiAnalysisFormId: multiForm.id },
  });

  const mFinance = await prisma.formQuestionCategory.create({
    data: { title: "مالی", order: 4, multiAnalysisFormId: multiForm.id },
  });

  const mMarketing = await prisma.formQuestionCategory.create({
    data: { title: "بازاریابی", order: 5, multiAnalysisFormId: multiForm.id },
  });

  // زیر دسته‌ها
  const mVision = await prisma.formQuestionCategory.create({
    data: {
      title: "چشم انداز",
      order: 1,
      multiAnalysisFormId: multiForm.id,
      parentId: mLeadership.id,
    },
  });

  const mDecision = await prisma.formQuestionCategory.create({
    data: {
      title: "تصمیم گیری",
      order: 2,
      multiAnalysisFormId: multiForm.id,
      parentId: mLeadership.id,
    },
  });

  const mCulture = await prisma.formQuestionCategory.create({
    data: {
      title: "فرهنگ سازمانی",
      order: 3,
      multiAnalysisFormId: multiForm.id,
      parentId: mLeadership.id,
    },
  });

  const mHiring = await prisma.formQuestionCategory.create({
    data: {
      title: "جذب",
      order: 1,
      multiAnalysisFormId: multiForm.id,
      parentId: mHr.id,
    },
  });

  const mTraining = await prisma.formQuestionCategory.create({
    data: {
      title: "آموزش",
      order: 2,
      multiAnalysisFormId: multiForm.id,
      parentId: mHr.id,
    },
  });

  const mPerformance = await prisma.formQuestionCategory.create({
    data: {
      title: "ارزیابی عملکرد",
      order: 3,
      multiAnalysisFormId: multiForm.id,
      parentId: mHr.id,
    },
  });

  const mSoftware = await prisma.formQuestionCategory.create({
    data: {
      title: "نرم افزارها",
      order: 1,
      multiAnalysisFormId: multiForm.id,
      parentId: mTechnology.id,
    },
  });

  const mSecurity = await prisma.formQuestionCategory.create({
    data: {
      title: "امنیت اطلاعات",
      order: 2,
      multiAnalysisFormId: multiForm.id,
      parentId: mTechnology.id,
    },
  });

  // ========================================
  // سوالات Multi Form
  // ========================================

  // Vision
  const mv1 = await prisma.formQuestion.create({
    data: {
      categoryId: mVision.id,
      label: "چشم‌انداز سازمان تا چه حد برای کارکنان شفاف است؟",
      type: QuestionType.RADIO,
      weight: 40,
      isScored: true,
      required: true,
      order: 1,
    },
  });

  const mv2 = await prisma.formQuestion.create({
    data: {
      categoryId: mVision.id,
      label: "مدیران تا چه حد چشم‌انداز سازمان را دنبال می‌کنند؟",
      type: QuestionType.RADIO,
      weight: 60,
      isScored: true,
      required: true,
      order: 2,
    },
  });

  // Decision
  const md1 = await prisma.formQuestion.create({
    data: {
      categoryId: mDecision.id,
      label: "تصمیم‌ها بر اساس داده اتخاذ می‌شوند؟",
      type: QuestionType.RADIO,
      weight: 50,
      isScored: true,
      required: true,
      order: 1,
    },
  });

  // Culture
  const mc1 = await prisma.formQuestion.create({
    data: {
      categoryId: mCulture.id,
      label: "آیا سازمان برنامه‌های فرهنگی برگزار می‌کند؟",
      type: QuestionType.CHECKBOX,
      isScored: false,
      required: false,
      order: 1,
    },
  });

  // Hiring, Training, Software, Marketing و ... (برای brevity فقط چندتا گذاشتم، بقیه رو مثل قبل اضافه کن)

  const mt1 = await prisma.formQuestion.create({
    data: {
      categoryId: mTraining.id,
      label: "برنامه آموزشی سالانه وجود دارد؟",
      type: QuestionType.RADIO,
      weight: 20,
      isScored: true,
      required: true,
      order: 1,
    },
  });

  // ... بقیه سوالات رو می‌تونی کپی کنی از seed قبلی

  // ========================================
  // گزینه‌ها (Options)
  // ========================================

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
        { questionId, label: "ضعیف", value: "LOW", score: 2, order: 2 },
        { questionId, label: "متوسط", value: "MEDIUM", score: 3, order: 3 },
        { questionId, label: "خوب", value: "GOOD", score: 4, order: 4 },
        { questionId, label: "عالی", value: "EXCELLENT", score: 5, order: 5 },
      ],
    });
  }

  // اعمال گزینه‌ها برای سوالات
  await createRadioOptions(mv1.id);
  await createRadioOptions(mv2.id);
  await createRadioOptions(md1.id);
  await createRadioOptions(mt1.id);
  // بقیه سوالات RADIO رو هم صدا بزن

  // ========================================
  // اتصال فرم تک‌مرحله‌ای به Multi Form
  // ========================================

  await prisma.multiAnalysisRequiredForm.create({
    data: {
      multiAnalysisFormId: multiForm.id,
      formId: "aaf28e3d-ba13-4fa2-838e-b6edbc1e5453", // فرم تک‌مرحله‌ای که قبلاً ساختی
      order: 1,
    },
  });

  // ========================================
  // گروه‌ها
  // ========================================

  const mgLeadership = await prisma.formCategoryGroup.create({
    data: { title: "گروه رهبری", order: 1, multiAnalysisFormId: multiForm.id },
  });

  const mgOrganization = await prisma.formCategoryGroup.create({
    data: {
      title: "گروه بلوغ سازمان",
      order: 2,
      multiAnalysisFormId: multiForm.id,
    },
  });

  await prisma.formCategoryGroupItem.createMany({
    data: [
      { groupId: mgLeadership.id, categoryId: mLeadership.id },
      { groupId: mgOrganization.id, categoryId: mLeadership.id },
      { groupId: mgOrganization.id, categoryId: mHr.id },
      { groupId: mgOrganization.id, categoryId: mTechnology.id },
      { groupId: mgOrganization.id, categoryId: mMarketing.id },
    ],
  });

  console.log("✅ Multi Analysis Form created successfully");
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
