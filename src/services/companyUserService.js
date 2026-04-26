const {
  countUsersByCompany,
  findUserByUsername,
  createUser,
  findById,
  deleteUser,
} = require("../repositories/userRepository");
const prisma = require("../prismaClient");
const { createBadRequestError, findUserAndDeleteImage } = require("../utils");

// ایجاد کاربر برای شرکت توسط ادمین شرکت
const createCompanyUserService = async (creatorId, username, password) => {
  // پیدا کردن کاربر Company که درخواست ساخت داده
  const creator = await prisma.user.findUnique({
    where: { id: creatorId },
    select: { id: true, role: true, companyId: true },
  });

  const companyId = creator.companyId;

  if (!companyId) {
    createBadRequestError("کاربر مربوط به هیچ شرکتی نیست", 404);
  }

  // پیدا کردن  شرکت
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { userLimit: true },
  });

  if (!company) {
    createBadRequestError("شرکت پیدا نشد", 404);
  }

  // تعداد کاربران موجود
  const currentUsersCount = await countUsersByCompany(companyId);

  if (currentUsersCount >= company.userLimit) {
    const err = new Error(
      `تعداد کاربران شرکت به حداکثر ${company.userLimit} رسیده است`,
    );
    err.statusCode = 400;
    throw err;
  }

  const existingUser = await findUserByUsername(username);
  if (existingUser) {
    createBadRequestError("این یوزرنیم قبلاً ثبت شده است");
  }

  // ایجاد کاربر
  const newUser = await createUser({
    username,
    password,
    role: "MEMBER",
    companyId,
  });

  const safeNewUser = { ...newUser };
  delete safeNewUser.password;
  return { newUser: safeNewUser };
};

const deleteCompanyUserService = async (userId, creator) => {
  const user = await findById(userId);

  if (!user) {
    throw createBadRequestError("کاربر یافت نشد");
  }

  if (creator.role === "COMPANY") {
    if (user.companyId !== creator.companyId) {
      throw createBadRequestError(
        "شما فقط می‌توانید اعضای شرکت خود را حذف کنید",
        403,
      );
    }

    if (user.role === "COMPANY" && user.id === creator.id) {
      throw createBadRequestError("ادمین اصلی نمی‌تواند خودش را حذف کند");
    }
  }

  await deleteUser(userId);
  await findUserAndDeleteImage(userId);
};

module.exports = { createCompanyUserService, deleteCompanyUserService };
