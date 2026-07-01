const {
  createUser,
  findCompanyById,
  isCompanyExists,
} = require("../repositories/companyRepository");
const {
  findUserByUsername,
  countUsersByCompany,
} = require("../repositories/userRepository");
const {
  createBadRequestError,
  deletePhysicalFile,
  isEmpty,
  isUuid,
} = require("../utils");
const { hashPassword } = require("../utils/auth");
const prisma = require("../prismaClient");
const fs = require("fs");
const path = require("path");
const {
  validateProductServices,
  normalizeProductService,
  serializeProductService,
} = require("../utils/productservice");

const isTempId = (id) => typeof id === "string" && id.startsWith("temp_");

const parseNullableBoolean = (value) => {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return null;
};

const normalizeNullableString = (value) => {
  if (isEmpty(value)) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
};

const parseNullableDate = (value) => {
  if (isEmpty(value)) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date;
};

const normalizeBoolean = (value) => {
  if (value === true || value === false) return value;

  if (value === "true") return true;
  if (value === "false") return false;

  if (value === 1 || value === "1") return true;
  if (value === 0 || value === "0") return false;

  return null;
};

const normalizeDate = (value) => {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date;
};

const normalizeString = (value) => {
  if (value === undefined || value === null) return null;

  const trimmed = String(value).trim();

  return trimmed === "" ? null : trimmed;
};

const normalizeRequiredString = (value) => {
  if (value === undefined || value === null) return "";

  return String(value).trim();
};

const normalizeNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;

  const parsed = Number(value);

  if (Number.isNaN(parsed)) return null;

  return parsed;
};

const normalizeInt = (value) => {
  if (value === undefined || value === null || value === "") return null;

  const parsed = Number(value);

  if (Number.isNaN(parsed)) return null;

  return Math.trunc(parsed);
};

const normalizeDecimal = (value) => {
  if (value === undefined || value === null || value === "") return null;

  const parsed = Number(value);

  if (Number.isNaN(parsed)) return null;

  return Number(parsed.toFixed(2));
};

const normalizeNullableNumber = (value) => {
  if (isEmpty(value)) return null;
  return Number(value);
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

const getCompanyMembersService = async (companyId, query) => {
  const company = await findCompanyById(companyId);

  if (!company) {
    throw new Error("شرکتی با این ایدی وجود ندارد");
  }

  const { search } = query;

  const whereCondition = search
    ? {
        OR: [{ username: { contains: search } }],
      }
    : {};

  const members = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      members: {
        where: whereCondition,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          username: true,
          role: true,
          createdAt: true,
          profile: true,

          // تعداد کل پروژه‌ها
          _count: {
            select: {
              createdProjects: true,
              followUpRequests: true,
              projectAccesses: true,
            },
          },

          // میانگین نمرات از طریق پروژه‌ها
          createdProjects: {
            select: {
              averageRating: true,
              hasRating: true,
            },
          },
        },
      },
    },
  });

  // محاسبه میانگین کل نمرات
  const result = members?.members?.map((member) => {
    const ratedProjects = member.createdProjects.filter((p) => p.hasRating);
    const avgRating =
      ratedProjects.length > 0
        ? ratedProjects.reduce((sum, p) => sum + p.averageRating, 0) /
          ratedProjects.length
        : 0;

    const basicInfo = member.profile?.basicInfoRecords?.[0];
    const fullName =
      basicInfo?.firstName && basicInfo?.lastName
        ? `${basicInfo.firstName} ${basicInfo.lastName}`
        : null;

    return {
      id: member.id,
      username: member.username,
      role: member.role,
      createdAt: member.createdAt,
      totalProjects: member._count.createdProjects,
      totalFollowUpRequests: member._count.followUpRequests,
      totalProjectAccesses: member._count.projectAccesses,
      averageRating: Math.round(avgRating * 10) / 10,
      fullName,
    };
  });

  return result || [];
};

const upsertCompanyBasicInfo = async (data) => {
  const companyBasicInfo = await prisma.companyBasicInfo.upsert({
    where: {
      companyId: data.companyId,
    },
    update: {
      brandTitle: data.brandTitle,
      nationalId: data.nationalId,
      companyType: data.companyType,
      establishmentYear: data.establishmentYear,
      commercialActivityStartYear: data.commercialActivityStartYear,
      isListed: data.isListed,
      isHolding: data.isHolding,
      isHoldingSubsidiary: data.isHoldingSubsidiary,
      parentCompanyName: data.parentCompanyName,
      totalPersonnelCount: data.totalPersonnelCount,
      operationalPersonnelCount: data.operationalPersonnelCount,
      phoneNumber: data.phoneNumber,
      website: data.website,
    },
    create: {
      companyId: data.companyId,
      brandTitle: data.brandTitle,
      nationalId: data.nationalId,
      companyType: data.companyType,
      establishmentYear: data.establishmentYear,
      commercialActivityStartYear: data.commercialActivityStartYear,
      isListed: data.isListed,
      isHolding: data.isHolding,
      isHoldingSubsidiary: data.isHoldingSubsidiary,
      parentCompanyName: data.parentCompanyName,
      totalPersonnelCount: data.totalPersonnelCount,
      operationalPersonnelCount: data.operationalPersonnelCount,
      phoneNumber: data.phoneNumber,
      website: data.website,
    },
  });

  return companyBasicInfo;
};

const getCompanyProfile = async (companyId, userId) => {
  const userInfo = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      profile: true,
      companyId: true,
    },
  });

  const basicInfo = await prisma.companyBasicInfo.findUnique({
    where: { companyId },
  });

  const managers = await prisma.companyManager.findMany({
    where: { companyId },
    include: {
      resumeFile: true,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const revenueCenters = await prisma.revenueCenter.findMany({
    where: { companyId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const shareholders = await prisma.companyShareholder.findMany({
    where: { companyId },
    orderBy: [{ createdAt: "asc" }],
  });

  const organizationUnits = await prisma.organizationUnit.findMany({
    where: {
      companyId,
    },
    include: {
      structureFile: true,
    },
    orderBy: [
      {
        createdAt: "asc",
      },
    ],
  });

  const licenseCertificates = await prisma.companyLicenseCertificate.findMany({
    where: { companyId },
    include: {
      attachmentFile: true,
    },
    orderBy: [{ createdAt: "asc" }],
  });

  const memberships = await prisma.companyMembership.findMany({
    where: { companyId },
    orderBy: [{ createdAt: "asc" }],
  });

  const productServices = await prisma.companyProductService.findMany({
    where: { companyId },
    orderBy: [{ createdAt: "asc" }],
  });

  const markets = await prisma.companyMarket.findMany({
    where: { companyId },
    orderBy: [{ createdAt: "asc" }],
  });

  const keyCustomers = await prisma.keyCustomer.findMany({
    where: { companyId },
    orderBy: [{ createdAt: "asc" }],
  });

  const resourceCapabilities = await prisma.companyResourceCapability.findMany({
    where: { companyId },
    orderBy: [{ createdAt: "asc" }],
  });

  const balanceSheets = await prisma.companyBalanceSheet.findMany({
    where: { companyId },
    include: {
      balanceFile: true,
    },
    orderBy: [{ createdAt: "asc" }],
  });

  const incomeStatements = await prisma.companyIncomeStatement.findMany({
    where: { companyId },
    include: {
      incomeFile: true,
    },
    orderBy: [{ createdAt: "asc" }],
  });

  return {
    userInfo,
    basicInfo,
    managers,
    revenueCenters,
    shareholders,
    organizationUnits,
    licenseCertificates,
    memberships,
    productServices,
    markets,
    keyCustomers,
    resourceCapabilities,
    balanceSheets,
    incomeStatements,
  };
};

const normalizeNullableInteger = (value) => {
  if (isEmpty(value)) return null;
  return Number(value);
};

module.exports = {
  updateCompanyService,
  getCompanyMembersService,
  upsertCompanyBasicInfo,
  getCompanyProfile,
};
