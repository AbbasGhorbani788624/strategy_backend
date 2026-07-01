const sectionModels = require("./companySectionModels");
const prisma = require("../prismaClient");
const fileConfigs = require("../configs/companySectionFiles");
const { deletePhysicalFiles, createBadRequestError } = require("../utils");

function getModel(client, section) {
  const modelName = sectionModels[section];

  if (!modelName) {
    throw new Error(`Invalid section: ${section}`);
  }

  return client[modelName];
}

function buildInclude(section) {
  return (fileConfigs[section] || []).reduce((obj, item) => {
    const relation = item.relation.replace("Id", "");

    obj[relation] = true;

    return obj;
  }, {});
}

exports.create = async (companyId, section, data, files, uploadedById) => {
  return await prisma.$transaction(async (tx) => {
    const model = getModel(tx, section);

    let extraData = {};

    const configs = fileConfigs[section] || [];

    for (const config of configs) {
      const file = files.find((f) => f.fieldname === config.field);

      if (!file) continue;

      const attachment = await tx.fileAttachment.create({
        data: {
          originalName: file.originalname,
          fileName: file.filename,
          filePath: `uploads/file/${file.filename}`,
          mimeType: file.mimetype,
          extension: file.originalname.split(".").pop(),
          size: file.size,
          uploadedById,
        },
      });

      extraData[config.relation] = attachment.id;
    }

    const record = await model.create({
      data: {
        ...data,
        ...extraData,
        companyId,
      },
      include: buildInclude(section),
    });

    return record;
  });
};

exports.update = async (section, id, data, files, uploadedById) => {
  const filesToDelete = [];
  const current = await prisma.organizationUnit.findUnique({
    where: { id },
  });

  const result = await prisma.$transaction(async (tx) => {
    const model = getModel(tx, section);

    const configs = fileConfigs[section] || [];

    const current = await model.findUnique({
      where: { id },
    });

    if (!current) {
      throw new Error("رکورد موردنظر یافت نشد.");
    }

    const extraData = {};
    const attachmentIdsToDelete = [];

    for (const config of configs) {
      const uploadedFile = files.find(
        (file) => file.fieldname === config.field,
      );

      if (!uploadedFile) continue;

      const attachment = await tx.fileAttachment.create({
        data: {
          originalName: uploadedFile.originalname,
          fileName: uploadedFile.filename,
          filePath: `uploads/file/${uploadedFile.filename}`,
          mimeType: uploadedFile.mimetype,
          extension: uploadedFile.originalname.split(".").pop(),
          size: uploadedFile.size,
          uploadedById,
        },
      });

      extraData[config.relation] = attachment.id;

      const oldAttachmentId = current[config.relation];

      if (oldAttachmentId) {
        const oldAttachment = await tx.fileAttachment.findUnique({
          where: { id: oldAttachmentId },
        });

        if (oldAttachment) {
          attachmentIdsToDelete.push(oldAttachment.id);
          filesToDelete.push(oldAttachment.filePath);
        }
      }
    }

    const updatedRecord = await model.update({
      where: { id },
      data: {
        ...data,
        ...extraData,
      },
      include: buildInclude(section),
    });

    if (attachmentIdsToDelete.length > 0) {
      await tx.fileAttachment.deleteMany({
        where: {
          id: {
            in: attachmentIdsToDelete,
          },
        },
      });
    }

    return updatedRecord;
  });

  if (filesToDelete.length > 0) {
    await deletePhysicalFiles(filesToDelete);
  }

  return result;
};

exports.remove = async (section, id) => {
  const filesToDelete = [];

  try {
    await prisma.$transaction(async (tx) => {
      const model = getModel(tx, section);
      const configs = fileConfigs[section] || [];

      const record = await model.findUnique({
        where: { id },
      });

      if (!record) {
        createBadRequestError("رکورد یافت نشد.", 404);
      }

      await model.delete({
        where: { id },
      });

      for (const config of configs) {
        const attachmentId = record[config.relation];

        if (!attachmentId) continue;

        const attachment = await tx.fileAttachment.findUnique({
          where: {
            id: attachmentId,
          },
        });

        if (!attachment) continue;

        filesToDelete.push(attachment.filePath);

        await tx.fileAttachment.delete({
          where: {
            id: attachmentId,
          },
        });
      }
    });

    if (filesToDelete.length) {
      await deletePhysicalFiles(filesToDelete);
    }
  } catch (error) {
    console.error(error);
  }
};
