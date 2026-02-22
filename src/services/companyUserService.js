const userRepo = require("../repositories/userRepository");
const prisma = require("../prismaClient");

// ایجاد کاربر برای شرکت توسط ادمین شرکت
const createCompanyUserService = async (creatorId, username, password) => {
  // پیدا کردن کاربر Company که درخواست ساخت داده
  const creator = await prisma.user.findUnique({
    where: { id: creatorId },
    select: { id: true, role: true, companyId: true },
  });

  if (!creator || creator.role !== "COMPANY") {
    const err = new Error("دسترسی غیرمجاز");
    err.statusCode = 401;
    throw err;
  }

  const companyId = creator.companyId;

  if (!companyId) {
    const err = new Error("کاربر مربوط به هیچ شرکتی نیست");
    err.statusCode = 404;
    throw err;
  }

  // پیدا کردن محدودیت شرکت
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { userLimit: true },
  });

  if (!company) {
    const err = new Error("شرکت پیدا نشد");
    err.statusCode = 404;
    throw err;
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
    const err = new Error("این یوزرنیم قبلاً ثبت شده است");
    err.statusCode = 400;
    throw err;
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
