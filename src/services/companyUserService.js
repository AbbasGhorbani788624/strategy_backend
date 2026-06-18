const {
  countUsersByCompany,
  findUserByUsername,
  createUser,
  findById,
  deleteUser,
} = require("../repositories/userRepository");
const prisma = require("../prismaClient");
const { createBadRequestError } = require("../utils");

const createCompanyUserService = async (creatorId, username, password) => {
  const creator = await prisma.user.findUnique({
    where: { id: creatorId },
    select: { id: true, role: true, companyId: true },
  });

  const companyId = creator.companyId;

  if (!companyId) {
    createBadRequestError("کاربر مربوط به هیچ شرکتی نیست", 404);
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { userLimit: true },
  });

  if (!company) {
    createBadRequestError("شرکت پیدا نشد", 404);
  }

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
    createBadRequestError("کاربر یافت نشد");
  }

  if (user.companyId !== creator.companyId) {
    createBadRequestError("شما فقط می‌توانید اعضای شرکت خود را حذف کنید", 403);
  }

  if (user.role === "COMPANY" && user.id === creator.id) {
    createBadRequestError("ادمین اصلی نمی‌تواند خودش را حذف کند");
  }

  await deleteUser(userId);
};

const getColleaguesService = async (userId, projectId) => {
  if (!projectId) {
    createBadRequestError("شناسه پروژه الزامی است.", 400);
  }

  const userWithCompany = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      username: true,
      company: {
        select: {
          id: true,
          name: true,
          members: {
            where: {
              id: {
                not: userId,
              },
            },
            select: {
              id: true,
              username: true,
              role: true,
            },
            take: 100,
          },
        },
      },
    },
  });

  if (!userWithCompany) {
    throw createBadRequestError("کاربر مورد نظر یافت نشد.", 404);
  }

  if (!userWithCompany.company) {
    throw createBadRequestError("این کاربر به هیچ شرکتی متصل نیست.", 400);
  }

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      id: true,
      companyId: true,
      creatorId: true,
      accesses: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!project) {
    throw createBadRequestError("پروژه یافت نشد.", 404);
  }

  if (project.companyId !== userWithCompany.company.id) {
    throw createBadRequestError("این پروژه متعلق به شرکت شما نیست.", 403);
  }

  const accessUserIds = new Set(
    project.accesses.map((access) => access.userId),
  );

  return {
    company: {
      id: userWithCompany.company.id,
      name: userWithCompany.company.name,
    },
    colleagues: userWithCompany.company.members.map((member) => ({
      ...member,
      hasAccess: accessUserIds.has(member.id),
    })),
  };
};

module.exports = {
  createCompanyUserService,
  deleteCompanyUserService,
  getColleaguesService,
};
