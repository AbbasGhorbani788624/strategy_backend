const {
  findCompanyByName,
  createCompany,
  createUser,
} = require("../repositories/companyRepository");
const { findUserByUsername } = require("../repositories/userRepository");
const { createBadRequestError } = require("../utils");
const { hashPassword } = require("../utils/auth");
//سرویس  ایجاد شرکت و ادمین ان

const createCompanyService = async (
  name,
  industry,
  userLimit,
  username,
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
    userLimit,
  });

  // ساخت User اصلی شرکت
  const adminUser = await createUser({
    username,
    password: hashedPassword,
    role: "COMPANY",
    companyId: company.id,
  });

  const safeAdminUser = { ...adminUser };
  delete safeAdminUser.password;
  return { company, adminUser: safeAdminUser };
};

module.exports = { createCompanyService };
