const service = require("../services/companySectionService");
const { deletePhysicalFiles } = require("../utils");
const normalizeFormData = require("../utils/normalizeFormData");

exports.create = async (req, res, next) => {
  const uploadedFiles = req.files || [];

  try {
    const data = normalizeFormData(req.params.section, req.body);

    const result = await service.create(
      req.user.companyId,
      req.params.section,
      data,
      uploadedFiles,
      req.user.id,
    );

    res.status(201).json(result);
  } catch (err) {
    if (uploadedFiles.length > 0) {
      await deletePhysicalFiles(uploadedFiles);
    }

    next(err);
  }
};

exports.update = async (req, res, next) => {
  const uploadedFiles = req.files || [];
  try {
    const data = normalizeFormData(req.params.section, req.body);

    const result = await service.update(
      req.params.section,
      req.params.id,
      data,
      uploadedFiles,
      req.user.id,
    );

    res.status(200).json(result);
  } catch (err) {
    if (uploadedFiles.length > 0) {
      await deletePhysicalFiles(uploadedFiles);
    }

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
