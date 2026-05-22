// controllers/companyController.js
const { v4: uuidv4 } = require("uuid");
const { successResponse } = require("../utils/responses");
const {
  createCompanyService,
  updateCompanyService,
  getCompaniesService,
  getCompanyMembersService,
  deleteCompanyService,
  getCompanyService,
} = require("../services/companyService");
const { createBadRequestError } = require("../utils");
const prisma = require("../prismaClient");
const fs = require("fs");
const path = require("path");
const {
  calculateCompanyProgress,
  calculateUserProgress,
} = require("../utils/profileUtils");
const FILE_FIELDS = [
  "resumeFile",
  "orgStructure",
  "certificateFile",
  "balancesheetfile",
  "profitLossStatementFile",
];

exports.createCompanyWithAdmin = async (req, res, next) => {
  try {
    const { name, industry, userLimit, username, password } = req.body;

    const result = await createCompanyService(
      name,
      industry,
      userLimit,
      username,
      password,
    );
    return successResponse(res, 201, result);
  } catch (err) {
    next(err);
  }
};

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

exports.getAllCompany = async (req, res, next) => {
  try {
    const conpamies = await getCompaniesService(req.query);
    return successResponse(res, 200, conpamies);
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

exports.deleteCompany = async (req, res, next) => {
  try {
    const { id } = req.params;
    await deleteCompanyService(id);
    return successResponse(res, 200, { message: "شرکت با موفقیت حذف شد" });
  } catch (err) {
    next(err);
  }
};

exports.getCompany = async (req, res, next) => {
  try {
    const { id } = req.params;
    const company = await getCompanyService(id);
    return successResponse(res, 200, company);
  } catch (err) {
    next(err);
  }
};

const deleteFileIfExists = async (filePath) => {
  if (!filePath) return;

  let fullPath = filePath;
  // اگر مسیر نسبی بود، به مسیر کامل تبدیل کن
  if (filePath.startsWith("/uploads/")) {
    fullPath = path.join(__dirname, "..", "..", filePath);
  } else if (!path.isAbsolute(filePath)) {
    // اگر مسیر مطلق نبود ولی با uploads شروع نمی‌شد (محض اطمینان)
    fullPath = path.join(__dirname, "..", "..", filePath);
  }

  try {
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath); // استفاده از نسخه غیرهمزمان برای جلوگیری از بلوک شدن رویداد
      console.log(`File deleted: ${fullPath}`);
    }
  } catch (error) {
    console.error(`Error deleting file ${fullPath}:`, error);
  }
};

exports.patchCompany = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const dataPath = req.body.dataPath;
    let recordDataStr = req.body.recordData;

    if (!recordDataStr) {
      return res
        .status(400)
        .json({ message: "داده رکورد (recordData) الزامی است." });
    }

    let processedRecord;
    try {
      processedRecord = JSON.parse(recordDataStr);
    } catch (e) {
      return res.status(400).json({ message: "فرمت JSON رکورد نامعتبر است." });
    }

    const uploadedFiles = req.files ? req.files["files"] : [];
    const fileMetadataList = req.body.fileMetadataList
      ? JSON.parse(req.body.fileMetadataList)
      : [];

    if (uploadedFiles?.length > 0 && fileMetadataList?.length > 0) {
      uploadedFiles.forEach((file, index) => {
        const metadata = fileMetadataList[index];
        if (metadata) {
          const { fieldName = "resumeFile" } = metadata;
          processedRecord[fieldName] = {
            url: `/uploads/file/${file.filename}`,
            name: file.originalname,
            size: file.size,
            type: file.mimetype,
          };
        }
      });
    }

    let action = "add";
    let recordId = null;

    if (
      processedRecord &&
      processedRecord.id &&
      processedRecord.id.trim() !== ""
    ) {
      action = "update";
      recordId = processedRecord.id;
    } else {
      action = "add";
      processedRecord.id = uuidv4();
    }

    if (action === "update") {
      await updateRecordInJson(companyId, dataPath, recordId, processedRecord);
    } else {
      await addRecordToJson(companyId, dataPath, processedRecord);
    }
    const companyAfterUpdate = await prisma.company.findUnique({
      where: { id: companyId },
      select: { profile: true },
    });

    const companyProgress = calculateCompanyProgress(
      companyAfterUpdate.profile,
    );

    await prisma.company.update({
      where: { id: companyId },
      data: { profileCompleted: companyProgress.completed },
    });

    const me = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { profile: true, progress: true, role: true, companyId: true },
    });

    const userProgress = calculateUserProgress(me?.profile);

    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        profileCompleted: userProgress.completed,
        progress: {
          user: userProgress,
          company: companyProgress,
        },
      },
    });

    return res.status(200).json({
      message:
        action === "update"
          ? "رکورد با موفقیت ویرایش شد"
          : "رکورد با موفقیت اضافه شد",
    });
  } catch (err) {
    next(err);
  }
};

const updateRecordInJson = async (
  companyId,
  dataPath,
  recordId,
  updatedRecord,
) => {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { profile: true },
  });

  if (!company) throw new Error("شرکت مورد نظر یافت نشد.");

  let currentProfile = company.profile;

  const profileToModify = JSON.parse(JSON.stringify(currentProfile || {}));

  const keys = dataPath.split(".");
  let targetObj = profileToModify;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!targetObj[key]) {
      targetObj[key] = {};
    }
    targetObj = targetObj[key];
  }

  const finalKey = keys[keys.length - 1];
  const currentRecords = Array.isArray(targetObj[finalKey])
    ? targetObj[finalKey]
    : [];

  const recordIndex = currentRecords.findIndex((rec) => rec.id === recordId);
  if (recordIndex === -1)
    throw new Error("رکورد مورد نظر برای ویرایش یافت نشد.");

  const oldRecord = currentRecords[recordIndex];
  const processedRecord = processFileFieldsForUpdate(updatedRecord, oldRecord);
  processedRecord.id = recordId;

  currentRecords[recordIndex] = processedRecord;
  targetObj[finalKey] = currentRecords;

  await prisma.company.update({
    where: { id: companyId },
    data: { profile: profileToModify },
  });
};

const addRecordToJson = async (companyId, dataPath, newRecord) => {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { profile: true },
  });

  if (!company) throw new Error("شرکت مورد نظر یافت نشد.");

  let currentProfile = company.profile;

  const profileToModify = JSON.parse(JSON.stringify(currentProfile || {}));
  const keys = dataPath.split(".");
  let targetObj = profileToModify;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!targetObj[key]) {
      targetObj[key] = {};
    }
    targetObj = targetObj[key];
  }

  const finalKey = keys[keys.length - 1];
  const currentRecords = Array.isArray(targetObj[finalKey])
    ? targetObj[finalKey]
    : [];

  const processedRecord = processFileFieldsForNewRecord(newRecord);

  if (!processedRecord.id) {
    processedRecord.id = uuidv4();
  }

  currentRecords.push(processedRecord);
  targetObj[finalKey] = currentRecords;

  await prisma.company.update({
    where: { id: companyId },
    data: { profile: profileToModify },
  });
};

exports.deleteRecord = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const { dataPath, recordId } = req.body;

    if (!recordId) {
      return res.status(400).json({ message: "recordId الزامی است." });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { profile: true },
    });

    if (!company) throw new Error("شرکت مورد نظر یافت نشد.");

    const currentProfile = JSON.parse(JSON.stringify(company.profile || {}));
    const keys = dataPath.split(".");
    let targetObj = currentProfile;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!targetObj[keys[i]]) targetObj[keys[i]] = {};
      targetObj = targetObj[keys[i]];
    }

    const finalKey = keys[keys.length - 1];
    const currentRecords = Array.isArray(targetObj[finalKey])
      ? targetObj[finalKey]
      : [];

    const recordToDelete = currentRecords.find((rec) => rec.id === recordId);

    if (recordToDelete) {
      const fileDeletionPromises = FILE_FIELDS.map(async (field) => {
        const filePath = recordToDelete[field];
        if (filePath && typeof filePath === "string") {
          await deleteFileIfExists(filePath);
        }
      });

      await Promise.all(fileDeletionPromises);

      const updatedRecords = currentRecords.filter(
        (rec) => rec.id !== recordId,
      );
      targetObj[finalKey] = updatedRecords;

      await prisma.company.update({
        where: { id: companyId },
        data: { profile: currentProfile },
      });

      return res.status(200).json({ message: "رکورد با موفقیت حذف شد" });
    } else {
      createBadRequestError("رکورد مورد نظر برای حذف یافت نشد.");
    }
  } catch (err) {
    next(err);
  }
};

const processFileFieldsForNewRecord = (record) => {
  const processed = { ...record };
  FILE_FIELDS.forEach((field) => {
    if (
      processed[field] &&
      typeof processed[field] === "object" &&
      processed[field].url
    ) {
      processed[field] = processed[field].url;
    }
  });
  return processed;
};

const processFileFieldsForUpdate = (newRecord, oldRecord) => {
  const processed = { ...newRecord };
  FILE_FIELDS.forEach((field) => {
    const newFilePath = processed[field];
    const oldFilePath = oldRecord ? oldRecord[field] : null;

    if (newFilePath) {
      if (typeof newFilePath === "object" && newFilePath.url) {
        if (oldFilePath && typeof oldFilePath === "string") {
          deleteFileIfExists(oldFilePath);
        }
        processed[field] = newFilePath.url;
      } else if (typeof newFilePath === "string") {
        if (oldFilePath && typeof oldFilePath === "string") {
          deleteFileIfExists(oldFilePath);
        }
        processed[field] = newFilePath;
      }
    } else {
      if (oldFilePath) {
        processed[field] = oldFilePath;
      } else {
        processed[field] = null;
      }
    }
  });
  return processed;
};

////
