const { successResponse } = require("../utils/responses");
const prisma = require("../prismaClient");
const normalizeFormData = require("../utils/normalizeFormData");
const service = require("../services/profileService");

exports.postUserInfo = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      nationalCode,
      jobTitle,
      birthDate,
      lastJobTitle,
      organizationalLevel,
      isboardMember,
      isshareholder,
      isstrategyTeamMember,
    } = req.body;

    const result = await service.upsertUserInfo({
      userId: req.user.id,
      firstName,
      lastName,
      nationalCode,
      jobTitle,
      birthDate,
      lastJobTitle,
      organizationalLevel,
      isboardMember,
      isshareholder,
      isstrategyTeamMember,
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const data = normalizeFormData(req.params.section, req.body);

    const result = await service.create(req.user.id, req.params.section, data);

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const data = normalizeFormData(req.params.section, req.body);

    const result = await service.update(
      req.params.section,
      req.params.id,
      data,
    );

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await service.remove(req.params.section, req.params.id);

    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
};
