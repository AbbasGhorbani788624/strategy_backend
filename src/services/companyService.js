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
const fs = require("fs");
const path = require("path");

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
    userLimit: parseInt(userLimit),
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

const updateCompanyService = async (
  id,
  name,
  industry,
  userLimit,
  userRole,
) => {
  const existingCompany = await findCompanyById(id);
  if (!existingCompany) {
    createBadRequestError("شرکت مورد نظر یافت نشد");
  }

  if (name && name !== existingCompany.name) {
    const companyWithSameName = await findCompanyByName(name);
    if (companyWithSameName) {
      createBadRequestError("این اسم شرکت قبلاً ثبت شده است");
    }
  }

  const companyUpdateData = {};

  if (name) companyUpdateData.name = name;
  if (industry) companyUpdateData.industry = industry;

  if (
    userRole === "SUPER_ADMIN" &&
    userLimit !== undefined &&
    userLimit !== null
  ) {
    const limitToSet = parseInt(userLimit);

    const currentUsersCount = await countUsersByCompany(id);

    if (currentUsersCount > limitToSet) {
      createBadRequestError(
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
            avatar: true,
            role: true,
            createdAt: true,
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
    createBadRequestError("شرکتی با این ایدی وجود ندارد", 404);
  }
  await prisma.company.delete({ where: { id } });
};

const getCompanyService = async (id) => {
  const company = await findCompanyById(id);
  if (!company) {
    createBadRequestError("شرکتی با این ایدی وجود ندارد", 404);
  }
  return company;
};

const getAllFeedbackRequestsService = async (query) => {
  const { page = 1, limit = 10, search } = query;

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const take = parseInt(limit, 10);

  const whereClause = {};

  if (search) {
    whereClause.OR = [
      {
        project: {
          title: {
            contains: search,
          },
        },
      },
      {
        user: {
          fullname: {
            contains: search,
          },
        },
      },
    ];
  }

  const feedbackRequests = await prisma.projectFeedbackRequest.findMany({
    where: whereClause,
    skip: skip,
    take: take,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      project: {
        select: {
          id: true,
          title: true,
        },
      },
      user: {
        select: {
          id: true,
          username: true,
          fullname: true,
        },
      },
    },
  });

  const totalItems = await prisma.projectFeedbackRequest.count({
    where: whereClause,
  });

  return {
    feedbackRequests,
    pagination: {
      totalItems,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalItems / take),
      limit: take,
    },
  };
};

const respondToFeedbackRequestService = async (
  requestId,
  adminId,
  responseText,
) => {
  const feedbackRequest = await prisma.projectFeedbackRequest.findUnique({
    where: { id: requestId },
    include: {
      project: {
        select: {
          id: true,
          title: true,
        },
      },
      user: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  if (!feedbackRequest) {
    throw createBadRequestError("درخواست بازخورد یافت نشد.", 404);
  }

  if (feedbackRequest.status === "REVIEWED") {
    throw createBadRequestError("این درخواست قبلاً پاسخ داده شده است.", 400);
  }

  await prisma.notification.create({
    data: {
      userId: feedbackRequest.userId,
      type: "ADMIN_FEEDBACK",
      title: "پاسخ بازخورد پروژه",
      message: `پاسخ ادمین برای پروژه "${feedbackRequest.project.title}" آماده شد.`,
      referenceId: feedbackRequest.project.id,
      referenceType: "PROJECT",
      isRead: false,
    },
  });
};

const getProfileCompanyService = async (companyId) => {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      profile: true,
    },
  });

  if (!company) {
    createBadRequestError("شرکت یافت نشد", 404);
  }

  return company;
};

const deleteFileIfExists = (filePath) => {
  if (!filePath) return;
  let fullPath = filePath;
  if (filePath.startsWith("/uploads/")) {
    fullPath = path.join(__dirname, "..", "..", filePath);
  }
  try {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`File deleted: ${fullPath}`);
    }
  } catch (error) {
    console.error(`Error deleting file ${fullPath}:`, error);
  }
};

const setNestedValue = (obj, path, value) => {
  const keys = path.split(".");
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== "object") {
      current[key] = {};
    }
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
};

const patchProfileCompanyService = async (companyId, dataPath, newData) => {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { profile: true },
  });

  if (!company) {
    throw new Error("شرکت مورد نظر یافت نشد.");
  }

  const currentProfile = JSON.parse(JSON.stringify(company.profile || {}));
  const keys = dataPath.split(".");

  let targetObj = currentProfile;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!targetObj[keys[i]]) targetObj[keys[i]] = {};
    targetObj = targetObj[keys[i]];
  }
  const finalKey = keys[keys.length - 1];

  let oldDataInPath = targetObj[finalKey];

  let processedNewData = JSON.parse(JSON.stringify(newData));

  // اگر داده‌ها آرایه‌ای هستند
  if (Array.isArray(processedNewData) && Array.isArray(oldDataInPath)) {
    processedNewData = processedNewData.map((newItem, index) => {
      const oldItem = oldDataInPath[index];

      const newItemWithFile = { ...newItem };

      FILE_FIELDS.forEach((field) => {
        const newFilePath = newItemWithFile[field];
        const oldFilePath = oldItem ? oldItem[field] : null;

        if (newFilePath && typeof newFilePath === "object" && newFilePath.url) {
          if (oldFilePath && typeof oldFilePath === "string") {
            deleteFileIfExists(oldFilePath);
          }
          newItemWithFile[field] = newFilePath.url;
        } else if (newFilePath && typeof newFilePath === "string") {
          if (oldFilePath && typeof oldFilePath === "string") {
            deleteFileIfExists(oldFilePath);
          }
          newItemWithFile[field] = newFilePath;
        } else {
          if (oldFilePath) {
            newItemWithFile[field] = oldFilePath;
          }
        }
      });

      return newItemWithFile;
    });
  } else {
    FILE_FIELDS.forEach((field) => {
      const newFilePath = processedNewData[field];
      const oldFilePath = oldDataInPath ? oldDataInPath[field] : null;

      if (newFilePath && typeof newFilePath === "object" && newFilePath.url) {
        if (oldFilePath && typeof oldFilePath === "string") {
          deleteFileIfExists(oldFilePath);
        }
        processedNewData[field] = newFilePath.url;
      } else if (newFilePath && typeof newFilePath === "string") {
        if (oldFilePath && typeof oldFilePath === "string") {
          deleteFileIfExists(oldFilePath);
        }
        processedNewData[field] = newFilePath;
      } else {
        if (oldFilePath) {
          processedNewData[field] = oldFilePath;
        }
      }
    });
  }

  setNestedValue(currentProfile, dataPath, processedNewData);

  await prisma.company.update({
    where: { id: companyId },
    data: {
      profile: currentProfile,
    },
  });
};

module.exports = {
  createCompanyService,
  updateCompanyService,
  getCompaniesService,
  deleteCompanyService,
  getCompanyService,
  getCompanyMembersService,
  getAllFeedbackRequestsService,
  respondToFeedbackRequestService,
  patchProfileCompanyService,
};
