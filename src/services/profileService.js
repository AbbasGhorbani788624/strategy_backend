const { createBadRequestError } = require("../utils");
const prisma = require("../prismaClient");
const {
  calculateUserProgress,
  calculateCompanyProgress,
} = require("../utils/profileUtils");

const getTargetArrayAndParent = (profileObj, dataPath) => {
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

const updateProfileService = async (
  currentUser,
  targetUserId,
  dataPath,
  newData,
) => {
  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { profile: true, role: true, companyId: true },
  });
  if (!user) throw new Error("کاربر پیدا نشد");

  const isSelf = currentUser.id === targetUserId;
  if (currentUser.role === "MEMBER") {
    if (!isSelf)
      throw new Error("شما فقط می‌توانید پروفایل خودتان را ویرایش کنید");
  } else if (currentUser.role === "COMPANY") {
    if (!isSelf && user.companyId !== currentUser.companyId) {
      throw new Error(
        "شما فقط می‌توانید پروفایل اعضای شرکت خود را ویرایش کنید",
      );
    }
  }

  let currentProfile = JSON.parse(JSON.stringify(user.profile || {}));
  const { parentObj, finalKey, recordsArray } = getTargetArrayAndParent(
    currentProfile,
    dataPath,
  );

  // normalize input => array
  let recordsToProcess = [];
  if (Array.isArray(newData)) recordsToProcess = newData;
  else if (newData && typeof newData === "object") recordsToProcess = [newData];
  else throw new Error("داده‌های ورودی نامعتبر است");

  // ensure id
  const processedNewRecords = recordsToProcess.map((recordData) => {
    let processedRecord = { ...recordData };
    if (typeof processedRecord === "string")
      processedRecord = JSON.parse(processedRecord);

    if (!processedRecord.id || processedRecord.id.trim() === "") {
      processedRecord.id = require("uuid").v4();
    }
    return processedRecord;
  });

  const updatedRecordsArray = [...recordsArray];

  processedNewRecords.forEach((newRec) => {
    const existingIndex = updatedRecordsArray.findIndex(
      (rec) => rec.id === newRec.id,
    );
    if (existingIndex !== -1) updatedRecordsArray[existingIndex] = newRec;
    else updatedRecordsArray.push(newRec);
  });

  parentObj[finalKey] = updatedRecordsArray;

  // ✅ FIX: compute progress from updated profile
  const userProgress = calculateUserProgress(currentProfile);

  let companyProgress = null;
  if (user.role === "COMPANY" && user.companyId) {
    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: { profile: true, profileCompleted: true },
    });
    companyProgress = calculateCompanyProgress(company?.profile);
  }

  await prisma.user.update({
    where: { id: targetUserId },
    data: {
      profile: currentProfile,
      profileCompleted: userProgress.completed, // ✅ دقیق
      progress: {
        user: userProgress,
        company: companyProgress,
      },
    },
  });
};

const overViewProfileService = async (currentUser, targetUserId) => {
  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      username: true,
      role: true,
      profile: true,
      profileCompleted: true,
      company: {
        select: {
          id: true,
          name: true,
          industry: true,
          profile: true,
        },
      },
    },
  });

  if (!user) {
    createBadRequestError("پروفایل کاربری با چنین ایدی وجود ندارد", 404);
  }

  const isSelf = currentUser.id === targetUserId;

  if (currentUser.role === "MEMBER") {
    if (!isSelf) {
      createBadRequestError(
        "شما فقط می‌توانید پروفایل خودتان را مشاهده کنید",
        403,
      );
    }
  } else if (currentUser.role === "COMPANY") {
    if (!isSelf && user.company.id !== currentUser.companyId) {
      createBadRequestError(
        "شما فقط می‌توانید پروفایل اعضای شرکت خود را مشاهده کنید",
        403,
      );
    }
  }

  return user;
};

module.exports = {
  updateProfileService,
  overViewProfileService,
};
