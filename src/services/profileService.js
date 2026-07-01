const { createBadRequestError } = require("../utils");
const sectionModels = require("./companySectionModels");
const prisma = require("../prismaClient");

function getModel(client, section) {
  const modelName = sectionModels[section];

  if (!modelName) {
    createBadRequestError(`Invalid section: ${section}`, 400);
  }

  return client[modelName];
}

exports.upsertUserInfo = async (data) => {
  return await prisma.userInfo.upsert({
    where: {
      userId: data.userId,
    },

    update: {
      firstName: data.firstName,
      lastName: data.lastName,
      nationalCode: data.nationalCode,
      jobTitle: data.jobTitle,
      birthDate: data.birthDate,
      lastJobTitle: data.lastJobTitle,

      organizationalLevel: data.organizationalLevel,
      isboardMember: data.isboardMember,
      isshareholder: data.isshareholder,
      isstrategyTeamMember: data.isstrategyTeamMember,
    },

    create: {
      userId: data.userId,

      firstName: data.firstName,
      lastName: data.lastName,
      nationalCode: data.nationalCode,
      jobTitle: data.jobTitle,
      birthDate: data.birthDate,
      lastJobTitle: data.lastJobTitle,

      organizationalLevel: data.organizationalLevel,
      isboardMember: data.isboardMember,
      isshareholder: data.isshareholder,
      isstrategyTeamMember: data.isstrategyTeamMember,
    },
  });
};

exports.create = async (userId, section, data) => {
  return await prisma.$transaction(async (tx) => {
    const model = getModel(tx, section);

    return await model.create({
      data: {
        ...data,
        userId,
      },
    });
  });
};

exports.update = async (section, id, data) => {
  return await prisma.$transaction(async (tx) => {
    const model = getModel(tx, section);

    const current = await model.findUnique({
      where: {
        id,
      },
    });

    if (!current) {
      createBadRequestError("رکورد موردنظر یافت نشد.", 404);
    }

    return await model.update({
      where: {
        id,
      },
      data,
    });
  });
};

exports.remove = async (section, id) => {
  return await prisma.$transaction(async (tx) => {
    const model = getModel(tx, section);

    const current = await model.findUnique({
      where: {
        id,
      },
    });

    if (!current) {
      createBadRequestError("رکورد موردنظر یافت نشد.", 404);
    }

    await model.delete({
      where: {
        id,
      },
    });
  });
};
