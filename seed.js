require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

/**
 * سوالات با label یکسان را در هر فرم تحلیل ادغام می‌کند.
 * اولین سوال (بر اساس order و createdAt) نگه داشته می‌شود؛
 * بقیه حذف می‌شوند و گزینه‌هایشان هم با cascade پاک می‌شود.
 */
async function deduplicateFormQuestionsByLabel() {
  const questions = await prisma.formQuestion.findMany({
    include: {
      category: {
        select: {
          id: true,
          analysisFormId: true,
          multiAnalysisFormId: true,
        },
      },
      _count: { select: { options: true } },
    },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  const groups = new Map();

  for (const question of questions) {
    const { category } = question;
    const formScope =
      category.analysisFormId ??
      category.multiAnalysisFormId ??
      category.id;
    const groupKey = `${formScope}::${question.label}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey).push(question);
  }

  let deletedQuestions = 0;
  let deletedOptions = 0;

  for (const group of groups.values()) {
    if (group.length <= 1) continue;

    const [keep, ...duplicates] = group;
    const duplicateIds = duplicates.map((q) => q.id);

    deletedOptions += duplicates.reduce(
      (sum, q) => sum + q._count.options,
      0
    );

    await prisma.formQuestion.deleteMany({
      where: { id: { in: duplicateIds } },
    });

    deletedQuestions += duplicates.length;

    console.log(
      `🧹 "${keep.label}" → نگه‌داشته شد (${keep.id})، ${duplicates.length} تکراری حذف شد`
    );
  }

  if (deletedQuestions === 0) {
    console.log("✅ سوال تکراری با label یکسان پیدا نشد");
  } else {
    console.log(
      `✅ پاکسازی سوالات: ${deletedQuestions} سوال و ${deletedOptions} گزینه حذف شد`
    );
  }
}

/**
 * گزینه‌های تکراری هر سوال را بر اساس label + value ادغام می‌کند.
 * اولین گزینه (بر اساس order و createdAt) نگه داشته می‌شود.
 */
async function deduplicateFormQuestionOptionsByLabelAndValue() {
  const options = await prisma.formQuestionOption.findMany({
    include: {
      question: { select: { label: true } },
    },
    orderBy: [{ questionId: "asc" }, { order: "asc" }, { createdAt: "asc" }],
  });

  const groups = new Map();

  for (const option of options) {
    const groupKey = `${option.questionId}::${option.label}::${option.value}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey).push(option);
  }

  let deletedOptions = 0;

  for (const group of groups.values()) {
    if (group.length <= 1) continue;

    const [keep, ...duplicates] = group;
    const duplicateIds = duplicates.map((o) => o.id);

    await prisma.formQuestionOption.deleteMany({
      where: { id: { in: duplicateIds } },
    });

    deletedOptions += duplicates.length;

    console.log(
      `🧹 گزینه "${keep.label}" (value: ${keep.value}) در سوال "${keep.question.label}" → ${duplicates.length} تکراری حذف شد`
    );
  }

  if (deletedOptions === 0) {
    console.log("✅ گزینه تکراری با label و value یکسان پیدا نشد");
  } else {
    console.log(`✅ پاکسازی گزینه‌ها: ${deletedOptions} گزینه تکراری حذف شد`);
  }
}

async function main() {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    throw new Error("ADMIN_USERNAME or ADMIN_PASSWORD not set in .env");
  }

  const existingAdmin = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN" },
  });

  if (!existingAdmin) {
    const hashed = await bcrypt.hash(adminPassword, 10);
    await prisma.user.create({
      data: {
        username: adminUsername,
        password: hashed,
        role: "SUPER_ADMIN",
        profileCompleted: true,
      },
    });
    console.log("Admin account created ✅");
  } else {
    console.log("Admin already exists");
  }

  await deduplicateFormQuestionsByLabel();
  await deduplicateFormQuestionOptionsByLabelAndValue();
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });

// const { PrismaClient } = require("@prisma/client");
// const prisma = new PrismaClient();

// const DEFAULT_OPTIONS = [
//   { label: "وجود ندارد", value: "1" },
//   { label: "سلیقه ای / پراکنده", value: "2" },
//   { label: "تعریف شده و اغلب اجرا میشود", value: "3" },
//   { label: "کاملا اجرا و مدیریت میشود", value: "4" },
//   { label: "اندازه گیری میشود و مرتبا بهبود می یابد", value: "5" },
// ];

// async function seedAnalysisOptions(analysisFormId) {
//   const questions = await prisma.formQuestion.findMany({
//     where: {
//       category: {
//         analysisFormId,
//       },
//     },
//   });

//   console.log(`Found ${questions.length} questions`);

//   for (const question of questions) {
//     // حذف تمام Optionهای قبلی
//     await prisma.formQuestionOption.deleteMany({
//       where: {
//         questionId: question.id,
//       },
//     });

//     // ساخت ۵ Option جدید
//     await prisma.formQuestionOption.createMany({
//       data: DEFAULT_OPTIONS.map((option, index) => ({
//         questionId: question.id,
//         label: option.label,
//         value: option.value,
//         order: index + 1,
//       })),
//     });

//     console.log(`✅ ${question.label}`);
//   }

//   console.log("Done.");
// }

// async function main() {
//   // آیدی فرم تحلیل را اینجا قرار بده
//   await seedAnalysisOptions("7a15a944-639e-4fe2-9f0d-de7cd1601d4c");
// }

// main()
//   .catch((err) => {
//     console.error(err);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
