const prisma = require("../prismaClient");
const path = require("path");
const fs = require("fs");

const createBadRequestError = (message, statusCode) => {
  const err = new Error(message);
  err.statusCode = statusCode || 400;
  throw err;
};

const deleteImage = (filename) => {
  const filePath = path.resolve(
    __dirname,
    "..",
    "..",
    "uploads",
    "profiles",
    filename,
  );

  fs.unlink(filePath, (unlinkErr) => {
    if (unlinkErr) {
      console.error(`Error deleting file  at ${filePath}:`, unlinkErr);
    }
  });
};

const findUserAndDeleteImage = async (id) => {
  const user = await prisma.user.findById(id);
  if (!user) {
    createBadRequestError("چنین کاربری وجود ندارد");
  }
  const profileImage = user.avatar;
  if (profileImage) {
    deleteImage(profileImage);
  }
};

const buildProjectAccessWhere = async ({
  userId,
  userRole,
  companyId,
  targetUserId,
}) => {
  let whereClause = {};

  if (userRole === "SUPER_ADMIN") {
    if (targetUserId) {
      whereClause.creatorId = targetUserId;
    }
  } else if (userRole === "COMPANY") {
    if (targetUserId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { companyId: true },
      });

      if (!targetUser || targetUser.companyId !== companyId) {
        throw createBadRequestError(
          "دسترسی غیرمجاز: شما فقط می‌توانید پروژه‌های اعضای شرکت خود را مشاهده کنید.",
          401,
        );
      }

      whereClause.creatorId = targetUserId;
    } else {
      whereClause.companyId = companyId;
    }
  } else if (userRole === "MEMBER") {
    const accessCondition = {
      accesses: {
        some: {
          userId,
        },
      },
    };

    if (targetUserId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { companyId: true },
      });

      if (!targetUser || targetUser.companyId !== companyId) {
        throw createBadRequestError("دسترسی غیرمجاز.", 401);
      }

      whereClause.creatorId = targetUserId;
    } else {
      whereClause = {
        OR: [{ creatorId: userId }, accessCondition],
      };
    }
  }

  return whereClause;
};

const getPublishedPromptContentsForAnalysisForm = async (formId) => {
  const promptDefinition = await prisma.promptDefinition.findFirst({
    where: {
      ownerType: "ANALYSIS_FORM",
      analysisFormId: formId,
    },
    include: {
      versions: {
        where: {
          status: "PUBLISHED",
        },
        orderBy: {
          versionNumber: "desc",
        },
        take: 1,
        include: {
          segmentValues: {
            include: {
              segmentDefinition: true,
            },
          },
        },
      },
    },
  });

  const publishedVersion = promptDefinition?.versions?.[0];

  if (!publishedVersion) {
    return "";
  }

  const workflowSegment = publishedVersion.segmentValues.find(
    (item) => item.segmentDefinition?.key === "workflow",
  );

  return workflowSegment?.content || "";
};

const getPublishedPromptContentsForMultiAnalysisForm = async (
  multiAnalysisFormId,
) => {
  const promptDefinition = await prisma.promptDefinition.findFirst({
    where: {
      ownerType: "MULTI_ANALYSIS_FORM",
      multiAnalysisFormId,
    },
    include: {
      versions: {
        where: {
          status: "PUBLISHED",
        },
        orderBy: {
          versionNumber: "desc",
        },
        take: 1,
        include: {
          segmentValues: {
            include: {
              segmentDefinition: true,
            },
          },
        },
      },
    },
  });

  const publishedVersion = promptDefinition?.versions?.[0];

  if (!publishedVersion) {
    return "";
  }

  const workflowSegment = publishedVersion.segmentValues.find(
    (item) => item.segmentDefinition?.key === "workflow",
  );

  return workflowSegment?.content || "";
};

const resolveNextProjectStep = ({
  currentStatus,
  userInput,
  understood = false,
}) => {
  const isUnderstood =
    understood === true || understood === "true" || understood === 1;

  const lowerInput = userInput?.toLowerCase().trim() || "";

  let nextStatus = currentStatus;
  let transitionReason = null;

  switch (currentStatus) {
    case "ANALYSIS_PENDING":
      nextStatus = "REVIEWING";
      transitionReason = "INITIAL_ANALYSIS_GENERATED";
      break;

    case "REVIEWING": {
      const isApproved = [
        "خوب",
        "تایید",
        "بله",
        "ادامه",
        "ok",
        "yes",
        "تایید میکنم",
        "تایید می‌کنم",
        "اوکی",
      ].some((k) => lowerInput.includes(k));

      const isRejected = [
        "نه",
        "کافی نبود",
        "رد",
        "اشتباه",
        "خوب نیست",
        "no",
        "reject",
        "wrong",
        "نمی‌خوام",
        "نمیخوام",
      ].some((k) => lowerInput.includes(k));

      if (isApproved) {
        nextStatus = "RISK_ANALYSIS";
        transitionReason = "INITIAL_ANALYSIS_APPROVED";
      } else if (isRejected) {
        nextStatus = "CHAT_MODE";
        transitionReason = "INITIAL_ANALYSIS_REJECTED";
      } else {
        nextStatus = "REVIEWING";
        transitionReason = "WAITING_FOR_REVIEW_DECISION";
      }
      break;
    }

    case "CHAT_MODE":
      if (isUnderstood) {
        nextStatus = "RISK_ANALYSIS";
        transitionReason = "CHAT_COMPLETED";
      } else {
        nextStatus = "CHAT_MODE";
        transitionReason = "CHAT_CONTINUES";
      }
      break;

    case "RISK_ANALYSIS": {
      const wantsFinal = [
        "تحلیل نهایی",
        "ادامه",
        "تایید",
        "بله",
        "ok",
        "yes",
        "اوکی",
      ].some((k) => lowerInput.includes(k));

      if (wantsFinal) {
        nextStatus = "FINAL_ANALYSIS";
        transitionReason = "FINAL_ANALYSIS_REQUESTED";
      } else {
        nextStatus = "RISK_ANALYSIS";
        transitionReason = "RISK_ANALYSIS_CONTINUES";
      }
      break;
    }

    case "FINAL_ANALYSIS":
      nextStatus = "FINAL_ANALYSIS";
      transitionReason = "FINAL_ANALYSIS_CONTINUES";
      break;

    default:
      nextStatus = currentStatus;
      transitionReason = "UNKNOWN_STATUS";
      break;
  }

  return {
    isUnderstood,
    nextStatus,
    transitionReason,
  };
};

module.exports = {
  createBadRequestError,
  deleteImage,
  findUserAndDeleteImage,
  buildProjectAccessWhere,
  resolveNextProjectStep,
  getPublishedPromptContentsForAnalysisForm,
  getPublishedPromptContentsForMultiAnalysisForm,
};
