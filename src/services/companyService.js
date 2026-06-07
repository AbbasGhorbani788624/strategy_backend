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

const getCompanyProfile = async (companyId) => {
  const userInfo = await prisma.user.findFirst({
    where: { companyId },
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

const syncCompanyManagers = async ({
  companyId,
  uploadedById,
  managers,
  files,
}) => {
  return prisma.$transaction(async (tx) => {
    const existingManagers = await tx.companyManager.findMany({
      where: { companyId },
      select: {
        id: true,
        resumeFileId: true,
      },
    });

    const existingManagerMap = new Map(
      existingManagers.map((manager) => [manager.id, manager]),
    );

    const existingManagerIds = existingManagers.map((manager) => manager.id);

    const fileIdsBefore = new Set(
      existingManagers.map((manager) => manager.resumeFileId).filter(Boolean),
    );

    const incomingIds = managers
      .map((item) => (!isEmpty(item.id) ? String(item.id) : null))
      .filter(Boolean);

    for (const [index, item] of managers.entries()) {
      if (isEmpty(item.id)) continue;

      const managerId = String(item.id);

      if (!existingManagerMap.has(managerId)) {
        const error = new Error(
          `managers[${index}].id برای این شرکت معتبر نیست`,
        );
        error.statusCode = 400;
        throw error;
      }
    }

    for (const [index, item] of managers.entries()) {
      if (isEmpty(item.resumeFileId)) continue;

      const resumeFileId = String(item.resumeFileId);

      const ownedFile = existingManagers.find(
        (manager) => manager.resumeFileId === resumeFileId,
      );

      if (!ownedFile) {
        const error = new Error(
          `managers[${index}].resumeFileId برای این شرکت معتبر نیست`,
        );
        error.statusCode = 400;
        throw error;
      }
    }

    const idsToDelete = existingManagerIds.filter(
      (id) => !incomingIds.includes(id),
    );

    if (idsToDelete.length > 0) {
      await tx.companyManager.deleteMany({
        where: {
          companyId,
          id: {
            in: idsToDelete,
          },
        },
      });
    }

    const savedManagers = [];

    for (const [index, item] of managers.entries()) {
      let resumeFileId = null;

      if (!isEmpty(item.resumeFileId)) {
        resumeFileId = String(item.resumeFileId);
      }

      const hasResumeFileIndex =
        item.resumeFileIndex !== undefined &&
        item.resumeFileIndex !== null &&
        item.resumeFileIndex !== "";

      if (hasResumeFileIndex) {
        const resumeFileIndex = Number(item.resumeFileIndex);
        const file = files[resumeFileIndex];

        if (!file) {
          const error = new Error(
            `managers[${index}].resumeFileIndex فایل معتبر ندارد`,
          );
          error.statusCode = 400;
          throw error;
        }

        const uploadKey = `file/${file.filename}`;

        const createdFile = await tx.fileAttachment.create({
          data: {
            originalName: file.originalname,
            fileName: file.filename,
            uploadKey,
            filePath: `uploads/${uploadKey}`,
            mimeType: file.mimetype,
            extension: path.extname(file.originalname),
            size: file.size,
            uploadedById,
          },
          select: {
            id: true,
          },
        });

        resumeFileId = createdFile.id;
      }

      const managerData = {
        companyId,

        fullName: String(item.fullName).trim(),

        positionTitle: normalizeNullableString(item.positionTitle),

        isBoardMember: parseNullableBoolean(item.isBoardMember),

        isStrategyTeamMember: parseNullableBoolean(item.isStrategyTeamMember),

        companyWorkExperience: normalizeNullableInteger(
          item.companyWorkExperience,
        ),

        totalWorkExperience: normalizeNullableInteger(item.totalWorkExperience),

        resumeFileId,

        sortOrder: normalizeNullableInteger(item.sortOrder),
      };

      const managerId = !isEmpty(item.id) ? String(item.id) : null;

      let manager;

      if (managerId && existingManagerMap.has(managerId)) {
        manager = await tx.companyManager.update({
          where: {
            id: managerId,
          },
          data: managerData,
          include: {
            resumeFile: true,
          },
        });
      } else {
        manager = await tx.companyManager.create({
          data: managerData,
          include: {
            resumeFile: true,
          },
        });
      }

      savedManagers.push(manager);
    }

    /**
     * گرفتن وضعیت نهایی بعد از sync
     */
    const finalManagers = await tx.companyManager.findMany({
      where: { companyId },
      include: {
        resumeFile: true,
      },
      orderBy: [
        {
          sortOrder: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
    });

    const fileIdsAfter = new Set(
      finalManagers.map((manager) => manager.resumeFileId).filter(Boolean),
    );

    const orphanFileIds = [...fileIdsBefore].filter(
      (fileId) => !fileIdsAfter.has(fileId),
    );

    let orphanFilePaths = [];

    if (orphanFileIds.length > 0) {
      const orphanFiles = await tx.fileAttachment.findMany({
        where: {
          id: {
            in: orphanFileIds,
          },
        },
        select: {
          filePath: true,
        },
      });

      orphanFilePaths = orphanFiles
        .map((file) => file.filePath)
        .filter(Boolean);

      await tx.fileAttachment.deleteMany({
        where: {
          id: {
            in: orphanFileIds,
          },
        },
      });
    }

    return {
      managers: finalManagers,
      orphanFilePaths,
    };
  });
};

const syncCompanyRevenueCenters = async ({ companyId, revenueCenters }) => {
  const result = await prisma.$transaction(async (tx) => {
    const existingRevenueCenters = await tx.revenueCenter.findMany({
      where: { companyId },
      select: {
        id: true,
      },
    });

    const existingRevenueCenterIds = new Set(
      existingRevenueCenters.map((item) => item.id),
    );

    const incomingIds = revenueCenters
      .map((item) =>
        item.id !== undefined && item.id !== null && item.id !== ""
          ? String(item.id)
          : null,
      )
      .filter((id) => id !== null);

    await tx.revenueCenter.deleteMany({
      where: {
        companyId,
        ...(incomingIds.length > 0
          ? {
              id: {
                notIn: incomingIds,
              },
            }
          : {}),
      },
    });

    const savedRevenueCenters = [];

    for (const item of revenueCenters) {
      const revenueCenterData = {
        companyId,

        title: item.title ? item.title.trim() : "",

        activityYearsCount:
          item.activityYearsCount !== undefined &&
          item.activityYearsCount !== null &&
          item.activityYearsCount !== ""
            ? Number(item.activityYearsCount)
            : null,

        totalRevenueSharePercent:
          item.totalRevenueSharePercent !== undefined &&
          item.totalRevenueSharePercent !== null &&
          item.totalRevenueSharePercent !== ""
            ? Number(item.totalRevenueSharePercent)
            : null,

        personnelCount:
          item.personnelCount !== undefined &&
          item.personnelCount !== null &&
          item.personnelCount !== ""
            ? Number(item.personnelCount)
            : null,

        sortOrder:
          item.sortOrder !== undefined &&
          item.sortOrder !== null &&
          item.sortOrder !== ""
            ? Number(item.sortOrder)
            : null,
      };

      const revenueCenterId =
        item.id !== undefined && item.id !== null && item.id !== ""
          ? String(item.id)
          : null;

      let revenueCenter;

      if (revenueCenterId && existingRevenueCenterIds.has(revenueCenterId)) {
        revenueCenter = await tx.revenueCenter.update({
          where: { id: revenueCenterId },
          data: revenueCenterData,
        });
      } else {
        revenueCenter = await tx.revenueCenter.create({
          data: revenueCenterData,
        });
      }

      savedRevenueCenters.push(revenueCenter);
    }

    return savedRevenueCenters;
  });

  return result;
};

const syncCompanyShareholders = async ({ companyId, shareholders }) => {
  const savedShareholders = await prisma.$transaction(async (tx) => {
    const existingShareholders = await tx.companyShareholder.findMany({
      where: { companyId },
      select: { id: true },
    });

    const existingShareholderIds = new Set(
      existingShareholders.map((item) => item.id),
    );

    const incomingIds = shareholders
      .map((item) => item.id)
      .filter((id) => typeof id === "string" && id.trim() !== "");

    await tx.companyShareholder.deleteMany({
      where: {
        companyId,
        id: {
          notIn: incomingIds,
        },
      },
    });

    const result = [];

    for (const item of shareholders) {
      const name = item.name?.trim();

      if (!name) {
        const error = new Error("Shareholder name is required");
        error.statusCode = 400;
        throw error;
      }

      const shareholderData = {
        companyId,
        name,
        shareholderType: item.shareholderType?.trim() || null,
        isBoardMember:
          item.isBoardMember === undefined || item.isBoardMember === null
            ? null
            : Boolean(item.isBoardMember),
        hasPreferredShare:
          item.hasPreferredShare === undefined ||
          item.hasPreferredShare === null
            ? null
            : Boolean(item.hasPreferredShare),
        sharePercent:
          item.sharePercent === undefined ||
          item.sharePercent === null ||
          item.sharePercent === ""
            ? null
            : item.sharePercent,
      };

      let savedItem;

      if (item.id && existingShareholderIds.has(item.id)) {
        savedItem = await tx.companyShareholder.update({
          where: { id: item.id },
          data: shareholderData,
        });
      } else {
        savedItem = await tx.companyShareholder.create({
          data: shareholderData,
        });
      }

      result.push(savedItem);
    }

    return result;
  });

  return savedShareholders;
};

const normalizeNullableInteger = (value) => {
  if (isEmpty(value)) return null;
  return Number(value);
};

const syncCompanyOrganizationUnits = async ({
  companyId,
  uploadedById,
  organizationUnits,
  files,
}) => {
  return prisma.$transaction(async (tx) => {
    const existingUnits = await tx.organizationUnit.findMany({
      where: { companyId },
      select: {
        id: true,
        structureFileId: true,
      },
    });

    const existingUnitMap = new Map(
      existingUnits.map((unit) => [unit.id, unit]),
    );

    const existingIds = existingUnits.map((unit) => unit.id);

    const incomingRealIds = organizationUnits
      .map((item) => {
        if (isEmpty(item.id)) return null;
        const id = String(item.id);
        return isTempId(id) ? null : id;
      })
      .filter(Boolean);

    const idsToDelete = existingIds.filter(
      (id) => !incomingRealIds.includes(id),
    );

    const fileIdsBefore = new Set(
      existingUnits.map((unit) => unit.structureFileId).filter(Boolean),
    );

    const tempIdToRealIdMap = new Map();

    for (const [index, item] of organizationUnits.entries()) {
      if (isEmpty(item.id)) continue;

      const id = String(item.id);

      if (!isTempId(id) && !existingUnitMap.has(id)) {
        const error = new Error(
          `organizationUnits[${index}].id برای این شرکت معتبر نیست`,
        );
        error.statusCode = 400;
        throw error;
      }
    }

    for (const [index, item] of organizationUnits.entries()) {
      let structureFileId = null;

      if (!isEmpty(item.structureFileId)) {
        structureFileId = String(item.structureFileId);

        const ownedFile = await tx.organizationUnit.findFirst({
          where: {
            companyId,
            structureFileId,
          },
          select: {
            id: true,
          },
        });

        if (!ownedFile) {
          const error = new Error(
            `organizationUnits[${index}].structureFileId برای این شرکت معتبر نیست`,
          );
          error.statusCode = 400;
          throw error;
        }
      }

      if (!isEmpty(item.structureFileIndex)) {
        const file = files[Number(item.structureFileIndex)];

        const uploadKey = `file/${file.filename}`;

        const createdFile = await tx.fileAttachment.create({
          data: {
            originalName: file.originalname,
            fileName: file.filename,
            uploadKey,
            filePath: `uploads/${uploadKey}`,
            mimeType: file.mimetype,
            extension: path.extname(file.originalname),
            size: file.size,
            uploadedById,
          },
          select: {
            id: true,
          },
        });

        structureFileId = createdFile.id;
      }

      const data = {
        companyId,
        unitName: String(item.unitName).trim(),
        structureLevel: normalizeNullableString(item.structureLevel),
        isRevenueCenter: parseNullableBoolean(item.isRevenueCenter),
        parentUnitName: normalizeNullableString(item.parentUnitName),
        managerName: normalizeNullableString(item.managerName),
        employeeCount: normalizeNullableInteger(item.employeeCount),
        structureFileId,
      };

      const rawId = isEmpty(item.id) ? null : String(item.id);
      let savedUnit;

      if (rawId && !isTempId(rawId)) {
        savedUnit = await tx.organizationUnit.update({
          where: { id: rawId },
          data,
          select: { id: true },
        });

        tempIdToRealIdMap.set(rawId, savedUnit.id);
      } else {
        savedUnit = await tx.organizationUnit.create({
          data,
          select: { id: true },
        });

        if (rawId && isTempId(rawId)) {
          tempIdToRealIdMap.set(rawId, savedUnit.id);
        }
      }
    }

    if (idsToDelete.length > 0) {
      await tx.organizationUnit.deleteMany({
        where: {
          companyId,
          id: { in: idsToDelete },
        },
      });
    }

    const finalUnits = await tx.organizationUnit.findMany({
      where: { companyId },
      include: {
        structureFile: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const fileIdsAfter = new Set(
      finalUnits.map((unit) => unit.structureFileId).filter(Boolean),
    );

    const orphanFileIds = [...fileIdsBefore].filter(
      (fileId) => !fileIdsAfter.has(fileId),
    );

    let orphanFilePaths = [];

    if (orphanFileIds.length > 0) {
      const orphanFiles = await tx.fileAttachment.findMany({
        where: {
          id: { in: orphanFileIds },
        },
        select: {
          filePath: true,
        },
      });

      orphanFilePaths = orphanFiles
        .map((file) => file.filePath)
        .filter(Boolean);

      await tx.fileAttachment.deleteMany({
        where: {
          id: { in: orphanFileIds },
        },
      });
    }

    return {
      units: finalUnits,
      orphanFilePaths,
    };
  });
};

const syncCompanyLicenseCertificates = async ({
  companyId,
  uploadedById,
  licenseCertificates,
  files,
}) => {
  return prisma.$transaction(async (tx) => {
    const existingCertificates = await tx.companyLicenseCertificate.findMany({
      where: { companyId },
      select: {
        id: true,
        attachmentFileId: true,
      },
    });

    const existingCertificateMap = new Map(
      existingCertificates.map((item) => [item.id, item]),
    );

    const existingIds = existingCertificates.map((item) => item.id);

    const incomingRealIds = licenseCertificates
      .map((item) => {
        if (isEmpty(item.id)) return null;
        const id = String(item.id);
        return isTempId(id) ? null : id;
      })
      .filter(Boolean);

    const idsToDelete = existingIds.filter(
      (id) => !incomingRealIds.includes(id),
    );

    const fileIdsBefore = new Set(
      existingCertificates.map((item) => item.attachmentFileId).filter(Boolean),
    );

    for (const [index, item] of licenseCertificates.entries()) {
      if (isEmpty(item.id)) continue;

      const id = String(item.id);

      if (!isTempId(id) && !existingCertificateMap.has(id)) {
        const error = new Error(
          `licenseCertificates[${index}].id برای این شرکت معتبر نیست`,
        );
        error.statusCode = 400;
        throw error;
      }
    }

    for (const [index, item] of licenseCertificates.entries()) {
      let attachmentFileId = null;

      if (!isEmpty(item.attachmentFileId)) {
        attachmentFileId = String(item.attachmentFileId);

        const ownedFile = await tx.companyLicenseCertificate.findFirst({
          where: {
            companyId,
            attachmentFileId,
          },
          select: {
            id: true,
          },
        });

        if (!ownedFile) {
          const error = new Error(
            `licenseCertificates[${index}].attachmentFileId برای این شرکت معتبر نیست`,
          );
          error.statusCode = 400;
          throw error;
        }
      }

      if (!isEmpty(item.attachmentFileIndex)) {
        const file = files[Number(item.attachmentFileIndex)];

        const uploadKey = `file/${file.filename}`;

        const createdFile = await tx.fileAttachment.create({
          data: {
            originalName: file.originalname,
            fileName: file.filename,
            uploadKey,
            filePath: `uploads/${uploadKey}`,
            mimeType: file.mimetype,
            extension: path.extname(file.originalname),
            size: file.size,
            uploadedById,
          },
          select: {
            id: true,
          },
        });

        attachmentFileId = createdFile.id;
      }

      const data = {
        companyId,
        title: String(item.title).trim(),
        issuerReference: normalizeNullableString(item.issuerReference),
        issueDate: parseNullableDate(item.issueDate),
        type: normalizeNullableString(item.type),
        attachmentFileId,
      };

      const rawId = isEmpty(item.id) ? null : String(item.id);

      if (rawId && !isTempId(rawId)) {
        await tx.companyLicenseCertificate.update({
          where: { id: rawId },
          data,
        });
      } else {
        await tx.companyLicenseCertificate.create({
          data,
        });
      }
    }

    if (idsToDelete.length > 0) {
      await tx.companyLicenseCertificate.deleteMany({
        where: {
          companyId,
          id: { in: idsToDelete },
        },
      });
    }

    const finalCertificates = await tx.companyLicenseCertificate.findMany({
      where: { companyId },
      include: {
        attachmentFile: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const fileIdsAfter = new Set(
      finalCertificates.map((item) => item.attachmentFileId).filter(Boolean),
    );

    const orphanFileIds = [...fileIdsBefore].filter(
      (fileId) => !fileIdsAfter.has(fileId),
    );

    let orphanFilePaths = [];

    if (orphanFileIds.length > 0) {
      const orphanFiles = await tx.fileAttachment.findMany({
        where: {
          id: { in: orphanFileIds },
        },
        select: {
          filePath: true,
        },
      });

      orphanFilePaths = orphanFiles
        .map((file) => file.filePath)
        .filter(Boolean);

      await tx.fileAttachment.deleteMany({
        where: {
          id: { in: orphanFileIds },
        },
      });
    }

    return {
      licenseCertificates: finalCertificates,
      orphanFilePaths,
    };
  });
};

const syncCompanyMemberships = async (companyId, memberships) => {
  if (!companyId) {
    const error = new Error("شناسه شرکت الزامی است.");
    error.statusCode = 400;
    throw error;
  }

  if (!Array.isArray(memberships)) {
    const error = new Error("فرمت اطلاعات عضویت‌ها نامعتبر است.");
    error.statusCode = 400;
    throw error;
  }

  const cleanedMemberships = memberships.map((item, index) => {
    const associationName = item.associationName?.trim();

    if (!associationName) {
      const error = new Error(
        `نام انجمن/تشکل در ردیف ${index + 1} الزامی است.`,
      );
      error.statusCode = 400;
      throw error;
    }

    return {
      id: item.id || null,
      associationName,
      membershipDate: normalizeDate(item.membershipDate),
      isBoardMember: normalizeBoolean(item.isBoardMember),
    };
  });

  const result = await prisma.$transaction(async (tx) => {
    const existingRecords = await tx.companyMembership.findMany({
      where: { companyId },
      select: { id: true },
    });

    const existingIds = new Set(existingRecords.map((item) => item.id));

    const incomingExistingIds = cleanedMemberships
      .map((item) => item.id)
      .filter((id) => isUuid(id) && existingIds.has(id));

    await tx.companyMembership.deleteMany({
      where: {
        companyId,
        ...(incomingExistingIds.length > 0
          ? {
              id: {
                notIn: incomingExistingIds,
              },
            }
          : {}),
      },
    });

    for (const item of cleanedMemberships) {
      const shouldUpdate = isUuid(item.id) && existingIds.has(item.id);

      if (shouldUpdate) {
        await tx.companyMembership.update({
          where: {
            id: item.id,
          },
          data: {
            associationName: item.associationName,
            membershipDate: item.membershipDate,
            isBoardMember: item.isBoardMember,
          },
        });
      } else {
        await tx.companyMembership.create({
          data: {
            companyId,
            associationName: item.associationName,
            membershipDate: item.membershipDate,
            isBoardMember: item.isBoardMember,
          },
        });
      }
    }

    return tx.companyMembership.findMany({
      where: { companyId },
      orderBy: [{ createdAt: "asc" }],
    });
  });

  return result;
};

const saveCompanyProductServicesService = async ({
  companyId,
  productServices,
}) => {
  const validationErrors = validateProductServices(productServices);

  if (validationErrors.length > 0) {
    const error = new Error("Validation failed");
    error.statusCode = 400;
    error.errors = validationErrors;
    throw error;
  }

  const normalizedRecords = productServices.map((item, index) =>
    normalizeProductService(item, index),
  );

  const existingRecords = await prisma.companyProductService.findMany({
    where: { companyId },
    select: { id: true },
  });

  const existingIds = existingRecords.map((item) => item.id);

  const incomingIds = normalizedRecords
    .map((item) => item.id)
    .filter((id) => typeof id === "string" && id.trim() !== "");

  const idsToDelete = existingIds.filter((id) => !incomingIds.includes(id));

  await prisma.$transaction(async (tx) => {
    if (idsToDelete.length > 0) {
      await tx.companyProductService.deleteMany({
        where: {
          companyId,
          id: { in: idsToDelete },
        },
      });
    }

    for (const record of normalizedRecords) {
      const data = {
        companyId,
        name: record.name,
        revenueCenter: record.revenueCenter ?? null,
        type: record.type ?? null,
        revenueSharePercent: record.revenueSharePercent ?? null,
        distinctiveFeatures: record.distinctiveFeatures ?? null,
        startYear: record.startYear ?? null,
        marketPosition: record.marketPosition ?? null,
        isExported:
          typeof record.isExported === "boolean" ? record.isExported : false,
        sortOrder: Number.isNaN(record.sortOrder) ? null : record.sortOrder,
      };

      if (record.id && existingIds.includes(record.id)) {
        await tx.companyProductService.update({
          where: { id: record.id },
          data,
        });
      } else {
        await tx.companyProductService.create({
          data,
        });
      }
    }
  });

  const updatedRecords = await prisma.companyProductService.findMany({
    where: { companyId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return updatedRecords.map(serializeProductService);
};

const syncCompanyMarkets = async (companyId, markets) => {
  if (!companyId) {
    const error = new Error("شناسه شرکت الزامی است.");
    error.statusCode = 400;
    throw error;
  }

  if (!Array.isArray(markets)) {
    const error = new Error("فرمت اطلاعات بازارها نامعتبر است.");
    error.statusCode = 400;
    throw error;
  }

  const cleanedMarkets = markets.map((item, index) => {
    const marketName = normalizeRequiredString(item.marketName);

    if (!marketName) {
      const error = new Error(`نام بازار در ردیف ${index + 1} الزامی است.`);
      error.statusCode = 400;
      throw error;
    }

    const marketSharePercent = normalizeDecimal(item.marketSharePercent);

    if (
      item.marketSharePercent !== undefined &&
      item.marketSharePercent !== null &&
      item.marketSharePercent !== "" &&
      marketSharePercent === null
    ) {
      const error = new Error(
        `مقدار سهم بازار در ردیف ${index + 1} نامعتبر است.`,
      );
      error.statusCode = 400;
      throw error;
    }

    if (
      marketSharePercent !== null &&
      (marketSharePercent < 0 || marketSharePercent > 100)
    ) {
      const error = new Error(
        `سهم بازار در ردیف ${index + 1} باید بین 0 تا 100 باشد.`,
      );
      error.statusCode = 400;
      throw error;
    }

    const yearsInMarket = normalizeInt(item.yearsInMarket);

    if (
      item.yearsInMarket !== undefined &&
      item.yearsInMarket !== null &&
      item.yearsInMarket !== "" &&
      yearsInMarket === null
    ) {
      const error = new Error(
        `تعداد سال حضور در بازار در ردیف ${index + 1} نامعتبر است.`,
      );
      error.statusCode = 400;
      throw error;
    }

    if (yearsInMarket !== null && yearsInMarket < 0) {
      const error = new Error(
        `تعداد سال حضور در بازار در ردیف ${index + 1} نمی‌تواند منفی باشد.`,
      );
      error.statusCode = 400;
      throw error;
    }

    return {
      id: item.id || null,
      marketName,
      marketType: normalizeString(item.marketType),
      marketSharePercent,
      marketPenetrationLevel: normalizeString(item.marketPenetrationLevel),
      yearsInMarket,
      relatedProductService: normalizeString(item.relatedProductService),
      sortOrder:
        item.sortOrder === undefined ||
        item.sortOrder === null ||
        item.sortOrder === ""
          ? index
          : normalizeInt(item.sortOrder),
    };
  });

  const result = await prisma.$transaction(async (tx) => {
    const existingRecords = await tx.companyMarket.findMany({
      where: { companyId },
      select: { id: true },
    });

    const existingIds = new Set(existingRecords.map((item) => item.id));

    const incomingExistingIds = cleanedMarkets
      .map((item) => item.id)
      .filter((id) => isUuid(id) && existingIds.has(id));

    await tx.companyMarket.deleteMany({
      where: {
        companyId,
        ...(incomingExistingIds.length > 0
          ? {
              id: {
                notIn: incomingExistingIds,
              },
            }
          : {}),
      },
    });

    for (const item of cleanedMarkets) {
      const shouldUpdate = isUuid(item.id) && existingIds.has(item.id);

      if (shouldUpdate) {
        await tx.companyMarket.update({
          where: {
            id: item.id,
          },
          data: {
            marketName: item.marketName,
            marketType: item.marketType,
            marketSharePercent: item.marketSharePercent,
            marketPenetrationLevel: item.marketPenetrationLevel,
            yearsInMarket: item.yearsInMarket,
            relatedProductService: item.relatedProductService,
            sortOrder: item.sortOrder,
          },
        });
      } else {
        await tx.companyMarket.create({
          data: {
            companyId,
            marketName: item.marketName,
            marketType: item.marketType,
            marketSharePercent: item.marketSharePercent,
            marketPenetrationLevel: item.marketPenetrationLevel,
            yearsInMarket: item.yearsInMarket,
            relatedProductService: item.relatedProductService,
            sortOrder: item.sortOrder,
          },
        });
      }
    }

    return tx.companyMarket.findMany({
      where: { companyId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  });

  return result;
};

const syncCompanyKeyCustomers = async (companyId, keyCustomers) => {
  if (!companyId) {
    const error = new Error("شناسه شرکت الزامی است.");
    error.statusCode = 400;
    throw error;
  }

  if (!Array.isArray(keyCustomers)) {
    const error = new Error("فرمت اطلاعات مشتریان کلیدی نامعتبر است.");
    error.statusCode = 400;
    throw error;
  }

  const cleanedKeyCustomers = keyCustomers.map((item, index) => {
    const customerName = normalizeRequiredString(item.customerName);

    if (!customerName) {
      const error = new Error(`نام مشتری در ردیف ${index + 1} الزامی است.`);
      error.statusCode = 400;
      throw error;
    }

    return {
      id: item.id || null,
      customerName,
      category: normalizeString(item.category),
      businessField: normalizeString(item.businessField),
      productImportanceLevel: normalizeString(item.productImportanceLevel),
      revenueImpactLevel: normalizeString(item.revenueImpactLevel),
      loyaltyLevel: normalizeString(item.loyaltyLevel),
      walletShareLevel: normalizeString(item.walletShareLevel),
      sortOrder:
        item.sortOrder === undefined ||
        item.sortOrder === null ||
        item.sortOrder === ""
          ? index
          : normalizeInt(item.sortOrder),
    };
  });

  const result = await prisma.$transaction(async (tx) => {
    const existingRecords = await tx.keyCustomer.findMany({
      where: { companyId },
      select: { id: true },
    });

    const existingIds = new Set(existingRecords.map((item) => item.id));

    const incomingExistingIds = cleanedKeyCustomers
      .map((item) => item.id)
      .filter((id) => isUuid(id) && existingIds.has(id));

    await tx.keyCustomer.deleteMany({
      where: {
        companyId,
        ...(incomingExistingIds.length > 0
          ? {
              id: {
                notIn: incomingExistingIds,
              },
            }
          : {}),
      },
    });

    for (const item of cleanedKeyCustomers) {
      const shouldUpdate = isUuid(item.id) && existingIds.has(item.id);

      if (shouldUpdate) {
        await tx.keyCustomer.update({
          where: {
            id: item.id,
          },
          data: {
            customerName: item.customerName,
            category: item.category,
            businessField: item.businessField,
            productImportanceLevel: item.productImportanceLevel,
            revenueImpactLevel: item.revenueImpactLevel,
            loyaltyLevel: item.loyaltyLevel,
            walletShareLevel: item.walletShareLevel,
            sortOrder: item.sortOrder,
          },
        });
      } else {
        await tx.keyCustomer.create({
          data: {
            companyId,
            customerName: item.customerName,
            category: item.category,
            businessField: item.businessField,
            productImportanceLevel: item.productImportanceLevel,
            revenueImpactLevel: item.revenueImpactLevel,
            loyaltyLevel: item.loyaltyLevel,
            walletShareLevel: item.walletShareLevel,
            sortOrder: item.sortOrder,
          },
        });
      }
    }

    return tx.keyCustomer.findMany({
      where: { companyId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  });

  return result;
};

const syncCompanyResourceCapabilities = async (
  companyId,
  resourceCapabilities,
) => {
  if (!Array.isArray(resourceCapabilities)) {
    throw new Error("لیست منابع و قابلیت‌ها نامعتبر است.");
  }

  const cleanedRecords = resourceCapabilities.map((item, index) => {
    const capability = normalizeRequiredString(item.capability, "نام قابلیت");

    const category = normalizeString(item.category);
    const importanceLevel = normalizeString(item.importanceLevel);
    const availabilityLevel = normalizeString(item.availabilityLevel);
    const rarityLevel = normalizeString(item.rarityLevel);
    const inimitabilityLevel = normalizeString(item.inimitabilityLevel);

    return {
      id: isUuid(item.id) ? item.id : null,
      capability,
      category,
      importanceLevel,
      availabilityLevel,
      rarityLevel,
      inimitabilityLevel,
      sortOrder: normalizeInt(item.sortOrder, index),
    };
  });

  return prisma.$transaction(async (tx) => {
    const existingRecords = await tx.companyResourceCapability.findMany({
      where: { companyId },
      select: { id: true },
    });

    const existingIds = new Set(existingRecords.map((item) => item.id));

    const incomingExistingIds = cleanedRecords
      .map((item) => item.id)
      .filter((id) => id && existingIds.has(id));

    await tx.companyResourceCapability.deleteMany({
      where: {
        companyId,
        ...(incomingExistingIds.length > 0
          ? { id: { notIn: incomingExistingIds } }
          : {}),
      },
    });

    for (const item of cleanedRecords) {
      const data = {
        capability: item.capability,
        category: item.category,
        importanceLevel: item.importanceLevel,
        availabilityLevel: item.availabilityLevel,
        rarityLevel: item.rarityLevel,
        inimitabilityLevel: item.inimitabilityLevel,
        sortOrder: item.sortOrder,
      };

      if (item.id && existingIds.has(item.id)) {
        await tx.companyResourceCapability.update({
          where: { id: item.id },
          data,
        });
      } else {
        await tx.companyResourceCapability.create({
          data: {
            companyId,
            ...data,
          },
        });
      }
    }

    return tx.companyResourceCapability.findMany({
      where: { companyId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  });
};

const syncCompanyBalanceSheets = async ({
  companyId,
  uploadedById,
  balanceSheets,
  files,
}) => {
  return prisma.$transaction(async (tx) => {
    const existingRecords = await tx.companyBalanceSheet.findMany({
      where: { companyId },
      select: {
        id: true,
        balanceFileId: true,
      },
    });

    const existingMap = new Map(existingRecords.map((item) => [item.id, item]));
    const existingIds = existingRecords.map((item) => item.id);

    const fileIdsBefore = new Set(
      existingRecords.map((item) => item.balanceFileId).filter(Boolean),
    );

    const incomingIds = balanceSheets
      .map((item) => (!isEmpty(item.id) ? String(item.id) : null))
      .filter(Boolean);

    for (const [index, item] of balanceSheets.entries()) {
      if (isEmpty(item.id)) continue;

      const recordId = String(item.id);

      if (!existingMap.has(recordId)) {
        const error = new Error(
          `balanceSheets[${index}].id برای این شرکت معتبر نیست`,
        );
        error.statusCode = 400;
        throw error;
      }
    }

    for (const [index, item] of balanceSheets.entries()) {
      if (isEmpty(item.balanceFileId)) continue;

      const balanceFileId = String(item.balanceFileId);

      const ownedFile = existingRecords.find(
        (record) => record.balanceFileId === balanceFileId,
      );

      if (!ownedFile) {
        const error = new Error(
          `balanceSheets[${index}].balanceFileId برای این شرکت معتبر نیست`,
        );
        error.statusCode = 400;
        throw error;
      }
    }

    const idsToDelete = existingIds.filter((id) => !incomingIds.includes(id));

    if (idsToDelete.length > 0) {
      await tx.companyBalanceSheet.deleteMany({
        where: {
          companyId,
          id: {
            in: idsToDelete,
          },
        },
      });
    }

    const savedRecords = [];

    for (const [index, item] of balanceSheets.entries()) {
      let balanceFileId = null;

      if (!isEmpty(item.balanceFileId)) {
        balanceFileId = String(item.balanceFileId);
      }

      const hasBalanceFileIndex =
        item.balanceFileIndex !== undefined &&
        item.balanceFileIndex !== null &&
        item.balanceFileIndex !== "";

      if (hasBalanceFileIndex) {
        const balanceFileIndex = Number(item.balanceFileIndex);
        const file = files[balanceFileIndex];

        if (!file) {
          const error = new Error(
            `balanceSheets[${index}].balanceFileIndex فایل معتبر ندارد`,
          );
          error.statusCode = 400;
          throw error;
        }
        const uploadKey = `file/${file.filename}`;

        const createdFile = await tx.fileAttachment.create({
          data: {
            originalName: file.originalname,
            fileName: file.filename,
            uploadKey,
            filePath: `uploads/${uploadKey}`,
            mimeType: file.mimetype,
            extension: path.extname(file.originalname),
            size: file.size,
            uploadedById,
          },
          select: {
            id: true,
          },
        });

        balanceFileId = createdFile.id;
      }

      const data = {
        companyId,
        fiscalPeriodStart: new Date(item.fiscalPeriodStart),
        fiscalPeriodEnd: new Date(item.fiscalPeriodEnd),
        category: normalizeNullableString(item.category),
        title: String(item.title).trim(),
        amount: normalizeNullableNumber(item.amount),
        balanceFileId,
        description: normalizeNullableString(item.description),
        sortOrder: isEmpty(item.sortOrder) ? null : Number(item.sortOrder),
      };

      const recordId = !isEmpty(item.id) ? String(item.id) : null;

      let saved;

      if (recordId && existingMap.has(recordId)) {
        saved = await tx.companyBalanceSheet.update({
          where: { id: recordId },
          data,
          include: {
            balanceFile: true,
          },
        });
      } else {
        saved = await tx.companyBalanceSheet.create({
          data,
          include: {
            balanceFile: true,
          },
        });
      }

      savedRecords.push(saved);
    }

    const finalRecords = await tx.companyBalanceSheet.findMany({
      where: { companyId },
      include: {
        balanceFile: true,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    const fileIdsAfter = new Set(
      finalRecords.map((item) => item.balanceFileId).filter(Boolean),
    );

    const orphanFileIds = [...fileIdsBefore].filter(
      (fileId) => !fileIdsAfter.has(fileId),
    );

    let orphanFilePaths = [];

    if (orphanFileIds.length > 0) {
      const orphanFiles = await tx.fileAttachment.findMany({
        where: {
          id: {
            in: orphanFileIds,
          },
        },
        select: {
          filePath: true,
        },
      });

      orphanFilePaths = orphanFiles
        .map((file) => file.filePath)
        .filter(Boolean);

      await tx.fileAttachment.deleteMany({
        where: {
          id: {
            in: orphanFileIds,
          },
        },
      });
    }

    return {
      balanceSheets: finalRecords,
      orphanFilePaths,
    };
  });
};

const syncCompanyIncomeStatements = async ({
  companyId,
  uploadedById,
  incomeStatements,
  files,
}) => {
  return prisma.$transaction(async (tx) => {
    const existingRecords = await tx.companyIncomeStatement.findMany({
      where: { companyId },
      select: {
        id: true,
        incomeFileId: true,
      },
    });

    const existingMap = new Map(existingRecords.map((item) => [item.id, item]));
    const existingIds = existingRecords.map((item) => item.id);

    const fileIdsBefore = new Set(
      existingRecords.map((item) => item.incomeFileId).filter(Boolean),
    );

    const incomingIds = incomeStatements
      .map((item) => (!isEmpty(item.id) ? String(item.id) : null))
      .filter(Boolean);

    for (const [index, item] of incomeStatements.entries()) {
      if (isEmpty(item.id)) continue;

      const recordId = String(item.id);

      if (!existingMap.has(recordId)) {
        const error = new Error(
          `incomeStatements[${index}].id برای این شرکت معتبر نیست`,
        );
        error.statusCode = 400;
        throw error;
      }
    }

    for (const [index, item] of incomeStatements.entries()) {
      if (isEmpty(item.incomeFileId)) continue;

      const incomeFileId = String(item.incomeFileId);

      const ownedFile = existingRecords.find(
        (record) => record.incomeFileId === incomeFileId,
      );

      if (!ownedFile) {
        const error = new Error(
          `incomeStatements[${index}].incomeFileId برای این شرکت معتبر نیست`,
        );
        error.statusCode = 400;
        throw error;
      }
    }

    const idsToDelete = existingIds.filter((id) => !incomingIds.includes(id));

    if (idsToDelete.length > 0) {
      await tx.companyIncomeStatement.deleteMany({
        where: {
          companyId,
          id: {
            in: idsToDelete,
          },
        },
      });
    }

    const savedRecords = [];

    for (const [index, item] of incomeStatements.entries()) {
      let incomeFileId = null;

      if (!isEmpty(item.incomeFileId)) {
        incomeFileId = String(item.incomeFileId);
      }

      const hasIncomeFileIndex =
        item.incomeFileIndex !== undefined &&
        item.incomeFileIndex !== null &&
        item.incomeFileIndex !== "";

      if (hasIncomeFileIndex) {
        const incomeFileIndex = Number(item.incomeFileIndex);
        const file = files[incomeFileIndex];

        if (!file) {
          const error = new Error(
            `incomeStatements[${index}].incomeFileIndex فایل معتبر ندارد`,
          );
          error.statusCode = 400;
          throw error;
        }
        const uploadKey = `file/${file.filename}`;

        const createdFile = await tx.fileAttachment.create({
          data: {
            originalName: file.originalname,
            fileName: file.filename,
            uploadKey,
            filePath: `uploads/${uploadKey}`,
            mimeType: file.mimetype,
            extension: path.extname(file.originalname),
            size: file.size,
            uploadedById,
          },
          select: {
            id: true,
          },
        });

        incomeFileId = createdFile.id;
      }

      const data = {
        companyId,
        fiscalPeriodStart: new Date(item.fiscalPeriodStart),
        fiscalPeriodEnd: new Date(item.fiscalPeriodEnd),
        category: normalizeNullableString(item.category),
        title: String(item.title).trim(),
        amount: normalizeNullableNumber(item.amount),
        incomeFileId,
        description: normalizeNullableString(item.description),
        sortOrder: isEmpty(item.sortOrder) ? null : Number(item.sortOrder),
      };

      const recordId = !isEmpty(item.id) ? String(item.id) : null;

      let saved;

      if (recordId && existingMap.has(recordId)) {
        saved = await tx.companyIncomeStatement.update({
          where: { id: recordId },
          data,
          include: {
            incomeFile: true,
          },
        });
      } else {
        saved = await tx.companyIncomeStatement.create({
          data,
          include: {
            incomeFile: true,
          },
        });
      }

      savedRecords.push(saved);
    }

    const finalRecords = await tx.companyIncomeStatement.findMany({
      where: { companyId },
      include: {
        incomeFile: true,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    const fileIdsAfter = new Set(
      finalRecords.map((item) => item.incomeFileId).filter(Boolean),
    );

    const orphanFileIds = [...fileIdsBefore].filter(
      (fileId) => !fileIdsAfter.has(fileId),
    );

    let orphanFilePaths = [];

    if (orphanFileIds.length > 0) {
      const orphanFiles = await tx.fileAttachment.findMany({
        where: {
          id: {
            in: orphanFileIds,
          },
        },
        select: {
          filePath: true,
        },
      });

      orphanFilePaths = orphanFiles
        .map((file) => file.filePath)
        .filter(Boolean);

      await tx.fileAttachment.deleteMany({
        where: {
          id: {
            in: orphanFileIds,
          },
        },
      });
    }

    return {
      incomeStatements: finalRecords,
      orphanFilePaths,
    };
  });
};

module.exports = {
  updateCompanyService,
  getCompanyMembersService,
  upsertCompanyBasicInfo,
  getCompanyProfile,
  syncCompanyManagers,
  syncCompanyRevenueCenters,
  syncCompanyShareholders,
  syncCompanyOrganizationUnits,
  syncCompanyLicenseCertificates,
  syncCompanyMemberships,
  getCompanyProfile,
  saveCompanyProductServicesService,
  syncCompanyMarkets,
  syncCompanyKeyCustomers,
  syncCompanyResourceCapabilities,
  syncCompanyBalanceSheets,
  syncCompanyIncomeStatements,
};
