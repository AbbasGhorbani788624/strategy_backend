// controllers/companyController.js
const { v4: uuidv4 } = require("uuid");
const { successResponse } = require("../utils/responses");
const {
  updateCompanyService,
  getCompanyMembersService,
  getCompanyProfile,
  upsertCompanyBasicInfo,
  syncCompanyManagers,
  syncCompanyRevenueCenters,
  syncCompanyShareholders,
  syncCompanyOrganizationUnits,
  syncCompanyLicenseCertificates,
  syncCompanyMemberships,
  saveCompanyProductServicesService,
  syncCompanyMarkets,
  syncCompanyKeyCustomers,
  syncCompanyResourceCapabilities,
  syncCompanyBalanceSheets,
  syncCompanyIncomeStatements,
} = require("../services/companyService");
const {
  createBadRequestError,
  deletePhysicalFiles,
  isUuid,
  isEmpty,
} = require("../utils");
const prisma = require("../prismaClient");
const fs = require("fs");
const path = require("path");
const {
  calculateCompanyProgress,
  calculateUserProgress,
} = require("../utils/profileUtils");

exports.updateCompany = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, industry, userLimit } = req.body;
    const companyId = req.user.companyId;
    const userRole = req.user.role;

    if (userRole === "COMPANY") {
      if (id !== companyId) {
        createBadRequestError("شما مجاز به ویرایش شرکت دیگری نیستید.", 401);
      }
    }

    const result = await updateCompanyService(
      id,
      name,
      industry,
      userLimit,
      userRole,
    );

    return successResponse(res, 200, result);
  } catch (err) {
    next(err);
  }
};

exports.getCompanyMemebers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;
    const conpamies = await getCompanyMembersService(id, companyId, req.query);
    return successResponse(res, 200, conpamies);
  } catch (err) {
    next(err);
  }
};

exports.postCompanyBasicInfo = async (req, res) => {
  try {
    const {
      brandTitle,
      nationalId,
      companyType,
      establishmentYear,
      commercialActivityStartYear,
      isListed,
      isHolding,
      isHoldingSubsidiary,
      parentCompanyName,
      totalPersonnelCount,
      operationalPersonnelCount,
      phoneNumber,
      website,
    } = req.body;

    const companyId = req.user.companyId;

    const result = await upsertCompanyBasicInfo({
      companyId,
      brandTitle,
      nationalId,
      companyType,
      establishmentYear,
      commercialActivityStartYear,
      isListed,
      isHolding,
      isHoldingSubsidiary,
      parentCompanyName,
      totalPersonnelCount,
      operationalPersonnelCount,
      phoneNumber,
      website,
    });

    return successResponse(res, 201, result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

exports.getCompanyProfileController = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const result = await getCompanyProfile(companyId);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "شرکت یافت نشد",
      });
    }

    return successResponse(res, 200, result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

exports.putCompanyManagers = async (req, res) => {
  const uploadedFiles = req.files || [];

  try {
    const companyId = req.user.companyId;
    const uploadedById = req.user.id;

    if (!req.body.managers) {
      await deletePhysicalFiles(uploadedFiles);

      return res.status(400).json({
        success: false,
        message: "managers الزامی است",
      });
    }

    let managers;
    try {
      managers = JSON.parse(req.body.managers);
    } catch (error) {
      await deletePhysicalFiles(uploadedFiles);

      return res.status(400).json({
        success: false,
        message: "managers باید JSON معتبر باشد",
      });
    }

    if (!Array.isArray(managers)) {
      await deletePhysicalFiles(uploadedFiles);

      return res.status(400).json({
        success: false,
        message: "managers باید آرایه باشد",
      });
    }

    if (managers.length === 0) {
      await deletePhysicalFiles(uploadedFiles);

      return res.status(400).json({
        success: false,
        message: "managers نمی‌تواند خالی باشد",
      });
    }

    const usedFileIndexes = new Set();
    const seenManagerIds = new Set();
    const seenResumeFileIds = new Set();

    for (const [index, item] of managers.entries()) {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        await deletePhysicalFiles(uploadedFiles);

        return res.status(400).json({
          success: false,
          message: `managers[${index}] باید آبجکت باشد`,
        });
      }

      if (item.id !== undefined && item.id !== null && item.id !== "") {
        if (typeof item.id !== "string" || !isUuid(item.id)) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `managers[${index}].id نامعتبر است`,
          });
        }

        if (seenManagerIds.has(item.id)) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `managers[${index}].id تکراری است`,
          });
        }

        seenManagerIds.add(item.id);
      }

      if (
        !item.fullName ||
        typeof item.fullName !== "string" ||
        !item.fullName.trim()
      ) {
        await deletePhysicalFiles(uploadedFiles);

        return res.status(400).json({
          success: false,
          message: `managers[${index}].fullName الزامی است`,
        });
      }

      const booleanFields = ["isBoardMember", "isStrategyTeamMember"];

      for (const field of booleanFields) {
        const value = item[field];

        const isValidBooleanValue =
          value === undefined ||
          value === null ||
          value === "" ||
          value === true ||
          value === false ||
          value === "true" ||
          value === "false";

        if (!isValidBooleanValue) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `managers[${index}].${field} نامعتبر است`,
          });
        }
      }

      const hasResumeFileIndex =
        item.resumeFileIndex !== undefined &&
        item.resumeFileIndex !== null &&
        item.resumeFileIndex !== "";

      const hasResumeFileId =
        item.resumeFileId !== undefined &&
        item.resumeFileId !== null &&
        item.resumeFileId !== "";

      if (hasResumeFileIndex && hasResumeFileId) {
        await deletePhysicalFiles(uploadedFiles);

        return res.status(400).json({
          success: false,
          message: `managers[${index}] نمی‌تواند هم resumeFileIndex و هم resumeFileId داشته باشد`,
        });
      }

      if (hasResumeFileIndex) {
        const resumeFileIndex = Number(item.resumeFileIndex);

        if (
          !Number.isInteger(resumeFileIndex) ||
          resumeFileIndex < 0 ||
          resumeFileIndex >= uploadedFiles.length
        ) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `managers[${index}].resumeFileIndex نامعتبر است`,
          });
        }

        if (usedFileIndexes.has(resumeFileIndex)) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `resumeFiles[${resumeFileIndex}] نمی‌تواند برای چند مدیر استفاده شود`,
          });
        }

        usedFileIndexes.add(resumeFileIndex);
      }

      if (hasResumeFileId) {
        if (
          typeof item.resumeFileId !== "string" ||
          !isUuid(item.resumeFileId)
        ) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `managers[${index}].resumeFileId نامعتبر است`,
          });
        }

        if (seenResumeFileIds.has(item.resumeFileId)) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `managers[${index}].resumeFileId تکراری است`,
          });
        }

        seenResumeFileIds.add(item.resumeFileId);
      }

      if (
        item.companyWorkExperience !== undefined &&
        item.companyWorkExperience !== null &&
        item.companyWorkExperience !== ""
      ) {
        const value = Number(item.companyWorkExperience);

        if (!Number.isInteger(value) || value < 0) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `managers[${index}].companyWorkExperience باید عدد صحیح غیرمنفی باشد`,
          });
        }
      }

      if (
        item.totalWorkExperience !== undefined &&
        item.totalWorkExperience !== null &&
        item.totalWorkExperience !== ""
      ) {
        const value = Number(item.totalWorkExperience);

        if (!Number.isInteger(value) || value < 0) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `managers[${index}].totalWorkExperience باید عدد صحیح غیرمنفی باشد`,
          });
        }
      }

      if (
        item.sortOrder !== undefined &&
        item.sortOrder !== null &&
        item.sortOrder !== ""
      ) {
        const value = Number(item.sortOrder);

        if (!Number.isInteger(value)) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `managers[${index}].sortOrder باید عدد صحیح باشد`,
          });
        }
      }
    }

    if (usedFileIndexes.size !== uploadedFiles.length) {
      await deletePhysicalFiles(uploadedFiles);

      return res.status(400).json({
        success: false,
        message: "تمام فایل‌های آپلودشده باید به یک manager متصل شوند",
      });
    }

    const result = await syncCompanyManagers({
      companyId,
      uploadedById,
      managers,
      files: uploadedFiles,
    });

    if (result.orphanFilePaths.length > 0) {
      await deletePhysicalFiles(result.orphanFilePaths);
    }

    return res.status(200).json({
      success: true,
      message: "Company managers synced successfully",
      data: result.managers,
    });
  } catch (error) {
    await deletePhysicalFiles(uploadedFiles);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

exports.syncCompanyRevenueCentersController = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const revenueCenters = Array.isArray(req.body.revenueCenters)
      ? req.body.revenueCenters
      : [];

    const result = await syncCompanyRevenueCenters({
      companyId,
      revenueCenters,
    });

    return res.status(200).json({
      success: true,
      message: "Revenue centers synced successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.syncCompanyShareholdersController = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const { shareholders } = req.body;

    const savedShareholders = await syncCompanyShareholders({
      companyId,
      shareholders: Array.isArray(shareholders) ? shareholders : [],
    });

    return res.status(200).json({
      success: true,
      message: "Company shareholders synced successfully",
      data: savedShareholders,
    });
  } catch (error) {
    next(error);
  }
};

exports.syncOrganizationUnitsController = async (req, res) => {
  const uploadedFiles = req.files || [];

  try {
    const companyId = req.user.companyId;
    const uploadedById = req.user.id;

    if (!req.body.organizationUnits) {
      await deletePhysicalFiles(uploadedFiles);

      return res.status(400).json({
        success: false,
        message: "organizationUnits الزامی است",
      });
    }

    let organizationUnits;
    try {
      organizationUnits = JSON.parse(req.body.organizationUnits);
    } catch (error) {
      await deletePhysicalFiles(uploadedFiles);

      return res.status(400).json({
        success: false,
        message: "organizationUnits باید JSON معتبر باشد",
      });
    }

    if (!Array.isArray(organizationUnits)) {
      await deletePhysicalFiles(uploadedFiles);

      return res.status(400).json({
        success: false,
        message: "organizationUnits باید آرایه باشد",
      });
    }

    const usedFileIndexes = new Set();
    const seenIds = new Set();

    for (const [index, item] of organizationUnits.entries()) {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        await deletePhysicalFiles(uploadedFiles);

        return res.status(400).json({
          success: false,
          message: `organizationUnits[${index}] باید آبجکت باشد`,
        });
      }

      if (!isEmpty(item.id)) {
        const id = String(item.id);

        if (!id.startsWith("temp_") && !isUuid(id)) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `organizationUnits[${index}].id نامعتبر است`,
          });
        }

        if (seenIds.has(id)) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `organizationUnits[${index}].id تکراری است`,
          });
        }

        seenIds.add(id);
      }

      if (typeof item.unitName !== "string" || !item.unitName.trim()) {
        await deletePhysicalFiles(uploadedFiles);

        return res.status(400).json({
          success: false,
          message: `organizationUnits[${index}].unitName الزامی است`,
        });
      }

      if (
        !isEmpty(item.structureLevel) &&
        typeof item.structureLevel !== "string"
      ) {
        await deletePhysicalFiles(uploadedFiles);

        return res.status(400).json({
          success: false,
          message: `organizationUnits[${index}].structureLevel باید متن باشد`,
        });
      }

      if (!isEmpty(item.parentUnitName)) {
        if (typeof item.parentUnitName !== "string") {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `organizationUnits[${index}].parentUnitName باید متن باشد`,
          });
        }

        if (item.parentUnitName.trim().length > 255) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `organizationUnits[${index}].parentUnitName بیش از حد طولانی است`,
          });
        }
      }

      if (!isEmpty(item.managerName) && typeof item.managerName !== "string") {
        await deletePhysicalFiles(uploadedFiles);

        return res.status(400).json({
          success: false,
          message: `organizationUnits[${index}].managerName باید متن باشد`,
        });
      }

      if (!isEmpty(item.isRevenueCenter)) {
        const validBoolean =
          item.isRevenueCenter === true ||
          item.isRevenueCenter === false ||
          item.isRevenueCenter === "true" ||
          item.isRevenueCenter === "false";

        if (!validBoolean) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `organizationUnits[${index}].isRevenueCenter نامعتبر است`,
          });
        }
      }

      if (!isEmpty(item.employeeCount)) {
        const employeeCount = Number(item.employeeCount);

        if (!Number.isInteger(employeeCount) || employeeCount < 0) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `organizationUnits[${index}].employeeCount باید عدد صحیح غیرمنفی باشد`,
          });
        }
      }

      const hasStructureFileIndex = !isEmpty(item.structureFileIndex);
      const hasStructureFileId = !isEmpty(item.structureFileId);

      if (hasStructureFileIndex && hasStructureFileId) {
        await deletePhysicalFiles(uploadedFiles);

        return res.status(400).json({
          success: false,
          message: `organizationUnits[${index}] نمی‌تواند هم structureFileIndex و هم structureFileId داشته باشد`,
        });
      }

      if (hasStructureFileIndex) {
        const fileIndex = Number(item.structureFileIndex);

        if (
          !Number.isInteger(fileIndex) ||
          fileIndex < 0 ||
          fileIndex >= uploadedFiles.length
        ) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `organizationUnits[${index}].structureFileIndex نامعتبر است`,
          });
        }

        if (usedFileIndexes.has(fileIndex)) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `structureFiles[${fileIndex}] نمی‌تواند برای چند رکورد استفاده شود`,
          });
        }

        usedFileIndexes.add(fileIndex);
      }

      if (hasStructureFileId) {
        const structureFileId = String(item.structureFileId);

        if (!isUuid(structureFileId)) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `organizationUnits[${index}].structureFileId نامعتبر است`,
          });
        }
      }
    }

    if (usedFileIndexes.size !== uploadedFiles.length) {
      await deletePhysicalFiles(uploadedFiles);

      return res.status(400).json({
        success: false,
        message: "تمام فایل‌های آپلودشده باید استفاده شوند",
      });
    }

    const result = await syncCompanyOrganizationUnits({
      companyId,
      uploadedById,
      organizationUnits,
      files: uploadedFiles,
    });

    if (result.orphanFilePaths.length > 0) {
      await deletePhysicalFiles(result.orphanFilePaths);
    }

    return res.status(200).json({
      success: true,
      message: "Organization units synced successfully",
      data: result.units,
    });
  } catch (error) {
    await deletePhysicalFiles(uploadedFiles);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

exports.syncCompanyLicenseCertificatesController = async (req, res) => {
  const uploadedFiles = req.files || [];

  try {
    const companyId = req.user.companyId;
    const uploadedById = req.user.id;

    if (!req.body.licenseCertificates) {
      await deletePhysicalFiles(uploadedFiles);

      return res.status(400).json({
        success: false,
        message: "licenseCertificates الزامی است",
      });
    }

    let licenseCertificates;
    try {
      licenseCertificates = JSON.parse(req.body.licenseCertificates);
    } catch (error) {
      await deletePhysicalFiles(uploadedFiles);

      return res.status(400).json({
        success: false,
        message: "licenseCertificates باید JSON معتبر باشد",
      });
    }

    if (!Array.isArray(licenseCertificates)) {
      await deletePhysicalFiles(uploadedFiles);

      return res.status(400).json({
        success: false,
        message: "licenseCertificates باید آرایه باشد",
      });
    }

    const usedFileIndexes = new Set();
    const seenIds = new Set();

    for (const [index, item] of licenseCertificates.entries()) {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        await deletePhysicalFiles(uploadedFiles);

        return res.status(400).json({
          success: false,
          message: `licenseCertificates[${index}] باید آبجکت باشد`,
        });
      }

      if (!isEmpty(item.id)) {
        const id = String(item.id);

        if (!id.startsWith("temp_") && !isUuid(id)) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `licenseCertificates[${index}].id نامعتبر است`,
          });
        }

        if (seenIds.has(id)) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `licenseCertificates[${index}].id تکراری است`,
          });
        }

        seenIds.add(id);
      }

      if (typeof item.title !== "string" || !item.title.trim()) {
        await deletePhysicalFiles(uploadedFiles);

        return res.status(400).json({
          success: false,
          message: `licenseCertificates[${index}].title الزامی است`,
        });
      }

      if (
        !isEmpty(item.issuerReference) &&
        typeof item.issuerReference !== "string"
      ) {
        await deletePhysicalFiles(uploadedFiles);

        return res.status(400).json({
          success: false,
          message: `licenseCertificates[${index}].issuerReference باید متن باشد`,
        });
      }

      if (!isEmpty(item.type) && typeof item.type !== "string") {
        await deletePhysicalFiles(uploadedFiles);

        return res.status(400).json({
          success: false,
          message: `licenseCertificates[${index}].type باید متن باشد`,
        });
      }

      if (!isEmpty(item.issueDate)) {
        const issueDate = new Date(item.issueDate);

        if (Number.isNaN(issueDate.getTime())) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `licenseCertificates[${index}].issueDate نامعتبر است`,
          });
        }
      }

      const hasAttachmentFileIndex = !isEmpty(item.attachmentFileIndex);
      const hasAttachmentFileId = !isEmpty(item.attachmentFileId);

      if (hasAttachmentFileIndex && hasAttachmentFileId) {
        await deletePhysicalFiles(uploadedFiles);

        return res.status(400).json({
          success: false,
          message: `licenseCertificates[${index}] نمی‌تواند هم attachmentFileIndex و هم attachmentFileId داشته باشد`,
        });
      }

      if (hasAttachmentFileIndex) {
        const fileIndex = Number(item.attachmentFileIndex);

        if (
          !Number.isInteger(fileIndex) ||
          fileIndex < 0 ||
          fileIndex >= uploadedFiles.length
        ) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `licenseCertificates[${index}].attachmentFileIndex نامعتبر است`,
          });
        }

        if (usedFileIndexes.has(fileIndex)) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `attachmentFiles[${fileIndex}] نمی‌تواند برای چند رکورد استفاده شود`,
          });
        }

        usedFileIndexes.add(fileIndex);
      }

      if (hasAttachmentFileId) {
        const attachmentFileId = String(item.attachmentFileId);

        if (!isUuid(attachmentFileId)) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `licenseCertificates[${index}].attachmentFileId نامعتبر است`,
          });
        }
      }
    }

    if (usedFileIndexes.size !== uploadedFiles.length) {
      await deletePhysicalFiles(uploadedFiles);

      return res.status(400).json({
        success: false,
        message: "تمام فایل‌های آپلودشده باید استفاده شوند",
      });
    }

    const result = await syncCompanyLicenseCertificates({
      companyId,
      uploadedById,
      licenseCertificates,
      files: uploadedFiles,
    });

    if (result.orphanFilePaths.length > 0) {
      await deletePhysicalFiles(result.orphanFilePaths);
    }

    return res.status(200).json({
      success: true,
      message: "License certificates synced successfully",
      data: result.licenseCertificates,
    });
  } catch (error) {
    await deletePhysicalFiles(uploadedFiles);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

exports.syncCompanyMemberships = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    let memberships = req.body.memberships;

    if (typeof memberships === "string") {
      try {
        memberships = JSON.parse(memberships);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "فرمت JSON عضویت‌ها نامعتبر است.",
        });
      }
    }

    const data = await syncCompanyMemberships(companyId, memberships);

    return res.status(200).json({
      success: true,
      message: "اطلاعات عضویت‌ها با موفقیت ثبت شد.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

exports.saveCompanyProductServicesController = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const productServices = req.body?.productServices;

    const result = await saveCompanyProductServicesService({
      companyId,
      productServices,
    });

    return res.status(200).json({
      success: true,
      message: "Product services saved successfully",
      data: result,
    });
  } catch (error) {
    console.error("saveCompanyProductServicesController error:", error);

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errors: error.errors || [],
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.syncCompanyMarkets = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    let markets = req.body.markets;

    if (typeof markets === "string") {
      try {
        markets = JSON.parse(markets);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "فرمت JSON بازارها نامعتبر است.",
        });
      }
    }

    const data = await syncCompanyMarkets(companyId, markets);

    return res.status(200).json({
      success: true,
      message: "اطلاعات بازارها با موفقیت ثبت شد.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

exports.syncCompanyKeyCustomers = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    let keyCustomers = req.body.keyCustomers;

    if (typeof keyCustomers === "string") {
      try {
        keyCustomers = JSON.parse(keyCustomers);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "فرمت JSON مشتریان کلیدی نامعتبر است.",
        });
      }
    }

    const data = await syncCompanyKeyCustomers(companyId, keyCustomers);

    return res.status(200).json({
      success: true,
      message: "اطلاعات مشتریان کلیدی با موفقیت ثبت شد.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

exports.syncCompanyResourceCapabilities = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    let { resourceCapabilities } = req.body;

    if (typeof resourceCapabilities === "string") {
      try {
        resourceCapabilities = JSON.parse(resourceCapabilities);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "فرمت JSON منابع و قابلیت‌ها نامعتبر است.",
        });
      }
    }

    const records = await syncCompanyResourceCapabilities(
      companyId,
      resourceCapabilities,
    );

    res.status(200).json({
      success: true,
      message: "اطلاعات منابع و قابلیت‌ها با موفقیت ثبت شد.",
      data: records,
    });
  } catch (error) {
    next(error);
  }
};

exports.putCompanyBalanceSheets = async (req, res) => {
  const uploadedFiles = req.files || [];

  try {
    const companyId = req.user.companyId;
    const uploadedById = req.user.id;

    if (!req.body.balanceSheets) {
      await deletePhysicalFiles(uploadedFiles);

      return res.status(400).json({
        success: false,
        message: "balanceSheets الزامی است",
      });
    }

    let balanceSheets;
    try {
      balanceSheets = JSON.parse(req.body.balanceSheets);
    } catch (error) {
      await deletePhysicalFiles(uploadedFiles);

      return res.status(400).json({
        success: false,
        message: "balanceSheets باید JSON معتبر باشد",
      });
    }

    if (!Array.isArray(balanceSheets)) {
      await deletePhysicalFiles(uploadedFiles);

      return res.status(400).json({
        success: false,
        message: "balanceSheets باید آرایه باشد",
      });
    }

    if (balanceSheets.length === 0) {
      await deletePhysicalFiles(uploadedFiles);

      return res.status(400).json({
        success: false,
        message: "balanceSheets نمی‌تواند خالی باشد",
      });
    }

    const usedFileIndexes = new Set();
    const seenIds = new Set();
    const seenBalanceFileIds = new Set();

    for (const [index, item] of balanceSheets.entries()) {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        await deletePhysicalFiles(uploadedFiles);

        return res.status(400).json({
          success: false,
          message: `balanceSheets[${index}] باید آبجکت باشد`,
        });
      }

      if (item.id !== undefined && item.id !== null && item.id !== "") {
        if (typeof item.id !== "string" || !isUuid(item.id)) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `balanceSheets[${index}].id نامعتبر است`,
          });
        }

        if (seenIds.has(item.id)) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `balanceSheets[${index}].id تکراری است`,
          });
        }

        seenIds.add(item.id);
      }

      if (!item.title || typeof item.title !== "string" || !item.title.trim()) {
        await deletePhysicalFiles(uploadedFiles);

        return res.status(400).json({
          success: false,
          message: `balanceSheets[${index}].title الزامی است`,
        });
      }

      if (
        !item.fiscalPeriodStart ||
        typeof item.fiscalPeriodStart !== "string"
      ) {
        await deletePhysicalFiles(uploadedFiles);

        return res.status(400).json({
          success: false,
          message: `balanceSheets[${index}].fiscalPeriodStart الزامی است`,
        });
      }

      if (!item.fiscalPeriodEnd || typeof item.fiscalPeriodEnd !== "string") {
        await deletePhysicalFiles(uploadedFiles);

        return res.status(400).json({
          success: false,
          message: `balanceSheets[${index}].fiscalPeriodEnd الزامی است`,
        });
      }

      if (
        item.category !== undefined &&
        item.category !== null &&
        item.category !== "" &&
        typeof item.category !== "string"
      ) {
        await deletePhysicalFiles(uploadedFiles);

        return res.status(400).json({
          success: false,
          message: `balanceSheets[${index}].category نامعتبر است`,
        });
      }

      if (
        item.amount !== undefined &&
        item.amount !== null &&
        item.amount !== ""
      ) {
        const value = Number(item.amount);

        if (!Number.isFinite(value) || value < 0) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `balanceSheets[${index}].amount باید عدد نامنفی باشد`,
          });
        }
      }

      const hasBalanceFileIndex =
        item.balanceFileIndex !== undefined &&
        item.balanceFileIndex !== null &&
        item.balanceFileIndex !== "";

      const hasBalanceFileId =
        item.balanceFileId !== undefined &&
        item.balanceFileId !== null &&
        item.balanceFileId !== "";

      if (hasBalanceFileIndex && hasBalanceFileId) {
        await deletePhysicalFiles(uploadedFiles);

        return res.status(400).json({
          success: false,
          message: `balanceSheets[${index}] نمی‌تواند هم balanceFileIndex و هم balanceFileId داشته باشد`,
        });
      }

      if (hasBalanceFileIndex) {
        const balanceFileIndex = Number(item.balanceFileIndex);

        if (
          !Number.isInteger(balanceFileIndex) ||
          balanceFileIndex < 0 ||
          balanceFileIndex >= uploadedFiles.length
        ) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `balanceSheets[${index}].balanceFileIndex نامعتبر است`,
          });
        }

        if (usedFileIndexes.has(balanceFileIndex)) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `balanceFiles[${balanceFileIndex}] نمی‌تواند برای چند رکورد استفاده شود`,
          });
        }

        usedFileIndexes.add(balanceFileIndex);
      }

      if (hasBalanceFileId) {
        if (
          typeof item.balanceFileId !== "string" ||
          !isUuid(item.balanceFileId)
        ) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `balanceSheets[${index}].balanceFileId نامعتبر است`,
          });
        }

        if (seenBalanceFileIds.has(item.balanceFileId)) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `balanceSheets[${index}].balanceFileId تکراری است`,
          });
        }

        seenBalanceFileIds.add(item.balanceFileId);
      }

      if (
        item.sortOrder !== undefined &&
        item.sortOrder !== null &&
        item.sortOrder !== ""
      ) {
        const value = Number(item.sortOrder);

        if (!Number.isInteger(value)) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `balanceSheets[${index}].sortOrder باید عدد صحیح باشد`,
          });
        }
      }

      if (
        item.description !== undefined &&
        item.description !== null &&
        item.description !== "" &&
        typeof item.description !== "string"
      ) {
        await deletePhysicalFiles(uploadedFiles);

        return res.status(400).json({
          success: false,
          message: `balanceSheets[${index}].description نامعتبر است`,
        });
      }
    }

    if (usedFileIndexes.size !== uploadedFiles.length) {
      await deletePhysicalFiles(uploadedFiles);

      return res.status(400).json({
        success: false,
        message: "تمام فایل‌های آپلودشده باید به یک balanceSheet متصل شوند",
      });
    }

    const result = await syncCompanyBalanceSheets({
      companyId,
      uploadedById,
      balanceSheets,
      files: uploadedFiles,
    });

    if (result.orphanFilePaths.length > 0) {
      await deletePhysicalFiles(result.orphanFilePaths);
    }

    return res.status(200).json({
      success: true,
      message: "Company balance sheets synced successfully",
      data: result.balanceSheets,
    });
  } catch (error) {
    await deletePhysicalFiles(uploadedFiles);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

exports.putCompanyIncomeStatements = async (req, res) => {
  const uploadedFiles = req.files || [];

  try {
    const companyId = req.user.companyId;
    const uploadedById = req.user.id;

    if (!req.body.incomeStatements) {
      await deletePhysicalFiles(uploadedFiles);

      return res.status(400).json({
        success: false,
        message: "incomeStatements الزامی است",
      });
    }

    let incomeStatements;
    try {
      incomeStatements = JSON.parse(req.body.incomeStatements);
    } catch (error) {
      await deletePhysicalFiles(uploadedFiles);

      return res.status(400).json({
        success: false,
        message: "incomeStatements باید JSON معتبر باشد",
      });
    }

    if (!Array.isArray(incomeStatements)) {
      await deletePhysicalFiles(uploadedFiles);

      return res.status(400).json({
        success: false,
        message: "incomeStatements باید آرایه باشد",
      });
    }

    if (incomeStatements.length === 0) {
      await deletePhysicalFiles(uploadedFiles);

      return res.status(400).json({
        success: false,
        message: "incomeStatements نمی‌تواند خالی باشد",
      });
    }

    const usedFileIndexes = new Set();
    const seenIds = new Set();
    const seenIncomeFileIds = new Set();

    for (const [index, item] of incomeStatements.entries()) {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        await deletePhysicalFiles(uploadedFiles);

        return res.status(400).json({
          success: false,
          message: `incomeStatements[${index}] باید آبجکت باشد`,
        });
      }

      if (item.id !== undefined && item.id !== null && item.id !== "") {
        if (typeof item.id !== "string" || !isUuid(item.id)) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `incomeStatements[${index}].id نامعتبر است`,
          });
        }

        if (seenIds.has(item.id)) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `incomeStatements[${index}].id تکراری است`,
          });
        }

        seenIds.add(item.id);
      }

      if (!item.title || typeof item.title !== "string" || !item.title.trim()) {
        await deletePhysicalFiles(uploadedFiles);

        return res.status(400).json({
          success: false,
          message: `incomeStatements[${index}].title الزامی است`,
        });
      }

      if (
        !item.fiscalPeriodStart ||
        typeof item.fiscalPeriodStart !== "string"
      ) {
        await deletePhysicalFiles(uploadedFiles);

        return res.status(400).json({
          success: false,
          message: `incomeStatements[${index}].fiscalPeriodStart الزامی است`,
        });
      }

      if (!item.fiscalPeriodEnd || typeof item.fiscalPeriodEnd !== "string") {
        await deletePhysicalFiles(uploadedFiles);

        return res.status(400).json({
          success: false,
          message: `incomeStatements[${index}].fiscalPeriodEnd الزامی است`,
        });
      }

      if (
        item.category !== undefined &&
        item.category !== null &&
        item.category !== "" &&
        typeof item.category !== "string"
      ) {
        await deletePhysicalFiles(uploadedFiles);

        return res.status(400).json({
          success: false,
          message: `incomeStatements[${index}].category نامعتبر است`,
        });
      }

      if (
        item.amount !== undefined &&
        item.amount !== null &&
        item.amount !== ""
      ) {
        const value = Number(item.amount);

        if (!Number.isFinite(value) || value < 0) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `incomeStatements[${index}].amount باید عدد نامنفی باشد`,
          });
        }
      }

      const hasIncomeFileIndex =
        item.incomeFileIndex !== undefined &&
        item.incomeFileIndex !== null &&
        item.incomeFileIndex !== "";

      const hasIncomeFileId =
        item.incomeFileId !== undefined &&
        item.incomeFileId !== null &&
        item.incomeFileId !== "";

      if (hasIncomeFileIndex && hasIncomeFileId) {
        await deletePhysicalFiles(uploadedFiles);

        return res.status(400).json({
          success: false,
          message: `incomeStatements[${index}] نمی‌تواند هم incomeFileIndex و هم incomeFileId داشته باشد`,
        });
      }

      if (hasIncomeFileIndex) {
        const incomeFileIndex = Number(item.incomeFileIndex);

        if (
          !Number.isInteger(incomeFileIndex) ||
          incomeFileIndex < 0 ||
          incomeFileIndex >= uploadedFiles.length
        ) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `incomeStatements[${index}].incomeFileIndex نامعتبر است`,
          });
        }

        if (usedFileIndexes.has(incomeFileIndex)) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `incomeFiles[${incomeFileIndex}] نمی‌تواند برای چند رکورد استفاده شود`,
          });
        }

        usedFileIndexes.add(incomeFileIndex);
      }

      if (hasIncomeFileId) {
        if (
          typeof item.incomeFileId !== "string" ||
          !isUuid(item.incomeFileId)
        ) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `incomeStatements[${index}].incomeFileId نامعتبر است`,
          });
        }

        if (seenIncomeFileIds.has(item.incomeFileId)) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `incomeStatements[${index}].incomeFileId تکراری است`,
          });
        }

        seenIncomeFileIds.add(item.incomeFileId);
      }

      if (
        item.sortOrder !== undefined &&
        item.sortOrder !== null &&
        item.sortOrder !== ""
      ) {
        const value = Number(item.sortOrder);

        if (!Number.isInteger(value)) {
          await deletePhysicalFiles(uploadedFiles);

          return res.status(400).json({
            success: false,
            message: `incomeStatements[${index}].sortOrder باید عدد صحیح باشد`,
          });
        }
      }

      if (
        item.description !== undefined &&
        item.description !== null &&
        item.description !== "" &&
        typeof item.description !== "string"
      ) {
        await deletePhysicalFiles(uploadedFiles);

        return res.status(400).json({
          success: false,
          message: `incomeStatements[${index}].description نامعتبر است`,
        });
      }
    }

    if (usedFileIndexes.size !== uploadedFiles.length) {
      await deletePhysicalFiles(uploadedFiles);

      return res.status(400).json({
        success: false,
        message: "تمام فایل‌های آپلودشده باید به یک incomeStatement متصل شوند",
      });
    }

    const result = await syncCompanyIncomeStatements({
      companyId,
      uploadedById,
      incomeStatements,
      files: uploadedFiles,
    });

    if (result.orphanFilePaths.length > 0) {
      await deletePhysicalFiles(result.orphanFilePaths);
    }

    return res.status(200).json({
      success: true,
      message: "Company income statements synced successfully",
      data: result.incomeStatements,
    });
  } catch (error) {
    await deletePhysicalFiles(uploadedFiles);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
