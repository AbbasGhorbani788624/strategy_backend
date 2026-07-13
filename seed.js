// require("dotenv").config();
// const { PrismaClient } = require("@prisma/client");
// const bcrypt = require("bcrypt");

// const prisma = new PrismaClient();

// async function main() {
//   const adminUsername = process.env.ADMIN_USERNAME;
//   const adminPassword = process.env.ADMIN_PASSWORD;

//   if (!adminUsername || !adminPassword) {
//     throw new Error("ADMIN_USERNAME or ADMIN_PASSWORD not set in .env");
//   }

//   const existingAdmin = await prisma.user.findFirst({
//     where: { role: "SUPER_ADMIN" },
//   });

//   if (!existingAdmin) {
//     const hashed = await bcrypt.hash(adminPassword, 10);
//     await prisma.user.create({
//       data: {
//         username: adminUsername,
//         password: hashed,
//         role: "SUPER_ADMIN",
//         profileCompleted: true,
//       },
//     });
//     console.log("Admin account created ✅");
//   } else {
//     console.log("Admin already exists");
//   }
// }

// main()
//   .catch((e) => console.error(e))
//   .finally(async () => {
//     await prisma.$disconnect();
//   });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const DEFAULT_OPTIONS = [
  { label: "وجود ندارد", value: "1" },
  { label: "سلیقه ای / پراکنده", value: "2" },
  { label: "تعریف شده و اغلب اجرا میشود", value: "3" },
  { label: "کاملا اجرا و مدیریت میشود", value: "4" },
  { label: "اندازه گیری میشود و مرتبا بهبود می یابد", value: "5" },
];

async function seedAnalysisOptions(analysisFormId) {
  const questions = await prisma.formQuestion.findMany({
    where: {
      category: {
        analysisFormId,
      },
    },
  });

  console.log(`Found ${questions.length} questions`);

  for (const question of questions) {
    // حذف تمام Optionهای قبلی
    await prisma.formQuestionOption.deleteMany({
      where: {
        questionId: question.id,
      },
    });

    // ساخت ۵ Option جدید
    await prisma.formQuestionOption.createMany({
      data: DEFAULT_OPTIONS.map((option, index) => ({
        questionId: question.id,
        label: option.label,
        value: option.value,
        order: index + 1,
      })),
    });

    console.log(`✅ ${question.label}`);
  }

  console.log("Done.");
}

async function main() {
  // آیدی فرم تحلیل را اینجا قرار بده
  await seedAnalysisOptions("7a15a944-639e-4fe2-9f0d-de7cd1601d4c");
}

main()
  .catch((err) => {
    console.error(err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
