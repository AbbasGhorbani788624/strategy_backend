const userRepo = require("../repositories/userRepository");
const prisma = require("../prismaClient");
const { createBadRequestError } = require("../utils");

// ایجاد کاربر برای شرکت توسط ادمین شرکت
const createCompanyUserService = async (creatorId, username, password) => {
  // پیدا کردن کاربر Company که درخواست ساخت داده
  const creator = await prisma.user.findUnique({
    where: { id: creatorId },
    select: { id: true, role: true, companyId: true },
  });

  if (!creator || creator.role !== "COMPANY") {
    createBadRequestError("دسترسی غیرمجاز", 401);
  }

  const companyId = creator.companyId;

  if (!companyId) {
    createBadRequestError("کاربر مربوط به هیچ شرکتی نیست", 404);
  }

  // پیدا کردن محدودیت شرکت
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { userLimit: true },
  });

  if (!company) {
    createBadRequestError("شرکت پیدا نشد", 404);
  }

  // تعداد کاربران موجود
  const currentUsersCount = await userRepo.countUsersByCompany(companyId);

  if (currentUsersCount >= company.userLimit) {
    const err = new Error(
      `تعداد کاربران شرکت به حداکثر ${company.userLimit} رسیده است`,
    );
    err.statusCode = 400;
    throw err;
  }

  const existingUser = await userRepo.findUserByUsername(username);
  if (existingUser) {
    createBadRequestError("این یوزرنیم قبلاً ثبت شده است");
  }

  // ایجاد کاربر
  const newUser = await userRepo.createUser({
    username,
    password,
    role: "MEMBER",
    companyId,
  });

  const safeNewUser = { ...newUser };
  delete safeNewUser.password;
  return { newUser: safeNewUser };
};

module.exports = { createCompanyUserService };
