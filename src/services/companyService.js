const {
  findCompanyByName,
  createCompany,
  createUser,
  findCompanyById,
  isCompanyExists,
} = require("../repositories/companyRepository");
const {
  findUserByUsername,
  countUsersByCompany,
} = require("../repositories/userRepository");
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
  profileCompany,
  userRole,
) => {
  const existingCompany = await findCompanyById(id);
  if (!existingCompany) {
    throw createBadRequestError("شرکت مورد نظر یافت نشد");
  }

  if (name && name !== existingCompany.name) {
    const companyWithSameName = await findCompanyByName(name);
    if (companyWithSameName) {
      throw createBadRequestError("این اسم شرکت قبلاً ثبت شده است");
    }
  }

  const companyUpdateData = {};

  if (name) companyUpdateData.name = name;
  if (industry) companyUpdateData.industry = industry;
  if (profileCompany) companyUpdateData.profile = profileCompany;

  if (
    userRole === "SUPER_ADMIN" &&
    userLimit !== undefined &&
    userLimit !== null
  ) {
    const limitToSet = parseInt(userLimit);

    const currentUsersCount = await countUsersByCompany(id);

    if (currentUsersCount > limitToSet) {
      throw createBadRequestError(
        `تعداد کاربران فعلی شرکت (${currentUsersCount}) بیشتر از محدودیت جدید (${limitToSet}) است. لطفاً ابتدا تعداد کاربران را کاهش دهید.`,
      );
    }
    companyUpdateData.userLimit = limitToSet;
  }

  const updatedCompany = await prisma.company.update({
    where: { id },
    data: companyUpdateData,
  });

  return {
    company: updatedCompany,
  };
};

const getCompaniesService = async (query) => {
  const { page = 1, limit = 10, search } = query;

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const take = parseInt(limit, 10);

  const whereCondition = search
    ? {
        name: {
          contains: search,
        },
      }
    : {};

  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where: whereCondition,
      select: {
        id: true,
        name: true,
        industry: true,
        createdAt: true,
        updatedAt: true,
        userLimit: true,
      },
      skip: skip,
      take: take,
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.company.count({
      where: whereCondition,
    }),
  ]);

  return {
    companies,
    pagination: {
      total: total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
    },
  };
};

//لیست اعضای هر شرکت
const getCompanyMembersService = async (id, companyId, query) => {
  const company = await findCompanyById(id);
  if (!company) {
    throw new Error("شرکتی با این ایدی وجود ندارد");
  }
  if (companyId !== company.id) {
    throw new Error("شما فقط میتوانید اعضای شرکت خود را ببینید", 401);
  }

  const { page = 1, limit = 10, search } = query;
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const take = parseInt(limit, 10);

  const whereCondition = search
    ? {
        OR: [
          {
            fullname: {
              contains: search,
            },
          },
          {
            username: {
              contains: search,
            },
          },
        ],
      }
    : {};

  const [members, total] = await Promise.all([
    prisma.company.findUnique({
      where: { id: id },
      select: {
        members: {
          where: whereCondition,
          skip: skip,
          take: take,
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            username: true,
            fullname: true,
            email: true,
            phoneNumber: true,
            avatar: true,
            role: true,
            profileCompleted: true,
            createdAt: true,
            // profile: true,
          },
        },
      },
    }),
    prisma.user.count({
      where: {
        companyId: id,
        ...whereCondition,
      },
    }),
  ]);

  return {
    data: members?.members || [],
    pagination: {
      total: total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
    },
  };
};

const deleteCompanyService = async (id) => {
  const company = await isCompanyExists(id);
  if (!company) {
    throw createBadRequestError("شرکتی با این ایدی وجود ندارد", 404);
  }
  await prisma.company.delete({ where: { id } });
};

const getCompanyService = async (id) => {
  const company = await findCompanyById(id);
  if (!company) {
    throw createBadRequestError("شرکتی با این ایدی وجود ندارد", 404);
  }
  return company;
};

module.exports = {
  createCompanyService,
  updateCompanyService,
  getCompaniesService,
  deleteCompanyService,
  getCompanyService,
  getCompanyMembersService,
};
