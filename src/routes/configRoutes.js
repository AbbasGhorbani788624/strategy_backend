const express = require("express");
const auth = require("../middleware/auth");
const prisma = require("../prismaClient");
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
  types,
  marketPositions,
  revenueShares,
  marketTypes,
  marketPenetration,
  customerCategories,
  productImportance,
  revenueImpact,
  loyaltyLevels,
  shareOfWallet,
  categoryOptions,
  accessLevelOptions,
  rarityOptions,
  imitabilityOptions,
  ACTIVITY_SCOPE,
  BARGAINING_POWER,
  COST_IMPACT_LEVELS,
  PURCHASE_BUDGET_SHARES,
  PROCUREMENT_CATEGORIES,
  targetMarketType,
} = require("../configs/profileConfig");

const router = express.Router();

router.get("/", auth, async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        shareholderTypes: SHAREHOLDER_TYPES,
        organizationalLevels: ORGANIZATIONAL_LEVELS,
        degreeTypes: DEGREE_TYPES,
        courseLevels: COURSE_LEVELS,
        skillTypes: SKILL_TYPES,
        expectedLevels: EXPECTED_LEVELS,
        currentLevels: CURRENT_LEVELS,
        jobRelevance: JOB_RELEVANCE,
        importanceLevels: IMPORTANCE_LEVELS,
        COMPANY_TYPES,
        COMPANY_STRUCTURE_TYPES,
        MANAGER_ROLES,
        SHAREHOLDER_TYPES_COMPANY,
        SHAREHOLDER_BOARD_MEMBERSHIP,
        ORG_STRUCTURE_LEVELS,
        ORG_UNIT_TYPES,
        PARENT_UNITS,
        targetMarketType,
        ACTIVITY_SCOPE,
        types,
        marketPositions,
        revenueShares,
        marketTypes,
        marketPenetration,
        customerCategories,
        productImportance,
        revenueImpact,
        loyaltyLevels,
        shareOfWallet,
        categoryOptions,
        accessLevelOptions,
        rarityOptions,
        imitabilityOptions,
        bargainingpower: BARGAINING_POWER,
        costimpactlevels: COST_IMPACT_LEVELS,
        purchasebudgetshares: PURCHASE_BUDGET_SHARES,
        procurementcategories: PROCUREMENT_CATEGORIES,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/revenue-centers", auth, async (req, res, next) => {
  try {
    const data = await prisma.revenueCenter.findMany({
      where: {
        companyId: req.user.companyId,
      },
      select: {
        id: true,
        title: true,
      },
      orderBy: {
        sortOrder: "asc",
      },
    });

    res.json({
      success: true,
      data: data.map((item) => ({
        value: item.title,
        label: item.title,
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/product-services", auth, async (req, res, next) => {
  try {
    const data = await prisma.companyProductService.findMany({
      where: {
        companyId: req.user.companyId,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        sortOrder: "asc",
      },
    });

    res.json({
      success: true,
      data: data.map((item) => ({
        value: item.name,
        label: item.name,
      })),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
