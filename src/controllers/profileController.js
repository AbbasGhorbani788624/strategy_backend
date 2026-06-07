const {
  updateProfileService,
  overViewProfileService,
} = require("../services/profileService");
const { createBadRequestError } = require("../utils");
const { successResponse } = require("../utils/responses");
const prisma = require("../prismaClient");

exports.updateProfile = async (req, res, next) => {
  try {
    const currentUser = req.user;
    const targetUserId = currentUser.id;
    const { dataPath, data } = req.body;

    if (!dataPath || typeof dataPath !== "string") {
      createBadRequestError("dataPath الزامی است.");
    }
    if (!data) {
      createBadRequestError("data الزامی است.");
    }

    let parsedData = data;
    if (typeof data === "string") {
      try {
        parsedData = JSON.parse(data);
      } catch (e) {
        return res
          .status(400)
          .json({ message: "داده‌های ارسال شده نامعتبر است." });
      }
    }

    await updateProfileService(currentUser, targetUserId, dataPath, parsedData);

    return res.status(200).json({ message: "اطلاعات با موفقیت ذخیره شد" });
  } catch (err) {
    console.log(err);
    if (err.message) {
      return res.status(400).json({ message: err.message });
    }
    next(err);
  }
};

const getTargetObjectAndParent = (profileObj, dataPath) => {
  if (!profileObj) profileObj = {};
  const keys = dataPath.split(".");
  let targetObj = profileObj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!targetObj[key] || typeof targetObj[key] !== "object") {
      targetObj[key] = {};
    }
    targetObj = targetObj[key];
  }

  const finalKey = keys[keys.length - 1];
  if (!Array.isArray(targetObj[finalKey])) {
    targetObj[finalKey] = [];
  }

  return {
    parentObj: targetObj,
    finalKey: finalKey,
    recordsArray: targetObj[finalKey],
  };
};

exports.deleteRecord = async (req, res, next) => {
  try {
    const currentUser = req.user;

    const targetUserId = currentUser.id;

    const { dataPath, recordId } = req.body;

    if (!dataPath || typeof dataPath !== "string") {
      return res.status(400).json({ message: "dataPath الزامی است." });
    }
    if (!recordId) {
      return res.status(400).json({ message: "recordId الزامی است." });
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { profile: true, role: true, companyId: true },
    });

    if (!user) {
      return res.status(404).json({ message: "کاربر مورد نظر یافت نشد." });
    }

    let currentProfile = JSON.parse(JSON.stringify(user.profile || {}));

    const { parentObj, finalKey, recordsArray } = getTargetObjectAndParent(
      currentProfile,
      dataPath,
    );

    const recordIndex = recordsArray.findIndex((rec) => rec.id === recordId);

    if (recordIndex === -1) {
      return res
        .status(404)
        .json({ message: "رکورد مورد نظر برای حذف یافت نشد." });
    }

    recordsArray.splice(recordIndex, 1);

    parentObj[finalKey] = recordsArray;

    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        profile: currentProfile,
      },
    });

    return res.status(200).json({ message: "رکورد با موفقیت حذف شد" });
  } catch (err) {
    console.error("Error in deleteRecord:", err);

    if (err.message) {
      return res.status(400).json({ message: err.message });
    }
    next(err);
  }
};
