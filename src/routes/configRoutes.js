const express = require("express");
const auth = require("../middleware/auth");

const {
  SHAREHOLDER_TYPES,
  ORGANIZATIONAL_LEVELS,
  DEGREE_TYPES,
  COURSE_LEVELS,
  SKILL_TYPES,
  EXPECTED_LEVELS,
  CURRENT_LEVELS,
  JOB_RELEVANCE,
  IMPORTANCE_LEVELS,
  COMPANY_TYPES,
  COMPANY_STRUCTURE_TYPES,
  MANAGER_ROLES,
  SHAREHOLDER_TYPES_COMPANY,
  SHAREHOLDER_BOARD_MEMBERSHIP,
  ORG_STRUCTURE_LEVELS,
  ORG_UNIT_TYPES,
  PARENT_UNITS,
  revenueCenters,
  types,
  marketPositions,
  revenueShares,
  marketTypes,
  marketPenetration,
  relatedProducts,
  customerCategories,
  productImportance,
  revenueImpact,
  loyaltyLevels,
  shareOfWallet,
  categoryOptions,
  accessLevelOptions,
  rarityOptions,
  imitabilityOptions,
} = require("../configs/profileConfig");

const router = express.Router();

router.get("/", auth, (req, res, next) => {
  try {
    const options = {
      shareholderTypes: SHAREHOLDER_TYPES,
      organizationalLevels: ORGANIZATIONAL_LEVELS,
      degreeTypes: DEGREE_TYPES,
      courseLevels: COURSE_LEVELS,
      skillTypes: SKILL_TYPES,
      expectedLevels: EXPECTED_LEVELS,
      currentLevels: CURRENT_LEVELS,
      jobRelevance: JOB_RELEVANCE,
      importanceLevels: IMPORTANCE_LEVELS,
      COMPANY_TYPES: COMPANY_TYPES,
      COMPANY_STRUCTURE_TYPES: COMPANY_STRUCTURE_TYPES,
      MANAGER_ROLES: MANAGER_ROLES,
      SHAREHOLDER_TYPES_COMPANY: SHAREHOLDER_TYPES_COMPANY,
      SHAREHOLDER_BOARD_MEMBERSHIP: SHAREHOLDER_BOARD_MEMBERSHIP,
      ORG_STRUCTURE_LEVELS: ORG_STRUCTURE_LEVELS,
      ORG_UNIT_TYPES: ORG_UNIT_TYPES,
      PARENT_UNITS: PARENT_UNITS,
      revenueCenters,
      types,
      marketPositions,
      revenueShares,
      marketTypes,
      marketPenetration,
      relatedProducts,
      customerCategories,
      productImportance,
      revenueImpact,
      loyaltyLevels,
      shareOfWallet,
      categoryOptions,
      accessLevelOptions,
      rarityOptions,
      imitabilityOptions,
    };

    res.status(200).json({
      success: true,
      data: options,
    });
  } catch (error) {
    next(error);
    res.status(500).json({
      success: false,
      error: "خطا در دریافت گزینه‌ها",
    });
  }
});

module.exports = router;
