// controllers/companyController.js
const { v4: uuidv4 } = require("uuid");
const { successResponse } = require("../utils/responses");
const {
  updateCompanyService,
  getCompanyMembersService,
  getCompanyProfile,
  upsertCompanyBasicInfo,
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
    const companyId = req.user.companyId;
    const conpamies = await getCompanyMembersService(companyId, req.query);
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
    const userId = req.user.id;
    const result = await getCompanyProfile(companyId, userId);

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
