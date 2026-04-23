const {
  findCompanyByName,
  createCompany,
  createUser,
  findCompanyById,
} = require("../repositories/companyRepository");
const { findUserByUsername } = require("../repositories/userRepository");
const { createBadRequestError } = require("../utils");
const { hashPassword } = require("../utils/auth");
const prisma = require("../prismaClient");

//سرویس  ایجاد شرکت و ادمین ان
const createCompanyService = async (
  name,
  industry,
  userLimit,
  username,
  profileCompany,
  profileUser,
  password,
) => {
  // بررسی وجود داشتن اسم شرکت
  const existingCompany = await findCompanyByName(name);
  if (existingCompany) {
    createBadRequestError("این اسم شرکت قبلاً ثبت شده است");
  }

  //بررسی وجود داشتن کاربر بررسی یوزرنیم
  const existingUser = await findUserByUsername(username);
  if (existingUser) {
    createBadRequestError("این یوزرنیم قبلاً ثبت شده است");
  }

  // هش کردن پسورد
  const hashedPassword = await hashPassword(password);

  // ساخت شرکت
  const company = await createCompany({
    name,
    industry,
    userLimit: parseInt(userLimit),
    profile: profileCompany,
  });

  // ساخت User اصلی شرکت
  const adminUser = await createUser({
    username,
    password: hashedPassword,
    role: "COMPANY",
    companyId: company.id,
    profile: profileUser,
  });

  const safeAdminUser = { ...adminUser };
  delete safeAdminUser.password;
  return { company, adminUser: safeAdminUser };
};

const updateCompanyService = async (
  id,
  name,
  industry,
  userLimit,
  username,
  profileCompany,
  profileUser,
  password,
) => {
  const existingCompany = await findCompanyById(id);
  console.log("existingCompany =>", existingCompany);
  if (!existingCompany) {
    throw createBadRequestError("شرکت مورد نظر یافت نشد");
  }

  const adminUser = existingCompany.members[0];

  if (!adminUser) {
    throw createBadRequestError("ادمین این شرکت یافت نشد");
  }

  if (name && name !== existingCompany.name) {
    const companyWithSameName = await findCompanyByName(name);
    if (companyWithSameName) {
      throw createBadRequestError("این اسم شرکت قبلاً ثبت شده است");
    }
  }

  if (username && username !== adminUser.username) {
    const userWithSameUsername = await findUserByUsername(username);
    if (userWithSameUsername) {
      throw createBadRequestError("این یوزرنیم قبلاً ثبت شده است");
    }
  }

  const companyUpdateData = {};
  if (name) companyUpdateData.name = name;
  if (industry) companyUpdateData.industry = industry;
  if (userLimit) companyUpdateData.userLimit = parseInt(userLimit);
  if (profileCompany) companyUpdateData.profile = profileCompany;

  const adminUpdateData = {};
  if (username) adminUpdateData.username = username;

  if (password) {
    adminUpdateData.password = await hashPassword(password);
  }

  if (profileUser) adminUpdateData.profile = profileUser;

  const result = await prisma.$transaction(async (tx) => {
    const updatedCompany = await tx.company.update({
      where: { id },
      data: companyUpdateData,
    });

    const updatedAdmin = await tx.user.update({
      where: { id: adminUser.id },
      data: adminUpdateData,
      select: {
        id: true,
        username: true,
        role: true,
        companyId: true,
        profile: true,
        profileCompleted: true,
        createdAt: true,
        updatedAt: true,
        avatar: true,
      },
    });

    return {
      company: updatedCompany,
      adminUser: updatedAdmin,
    };
  });

  return result;
};

module.exports = { createCompanyService, updateCompanyService };
