const {
  addIllustratedService,
  removeIllustratedService,
  getIllustratedService,
} = require("../services/illustratedService");
const { successResponse } = require("../utils/responses");

exports.addIllustrated = async (req, res, next) => {
  try {
    const illustrated = await addIllustratedService(req.user.id, req.params.id);

    return successResponse(res, 201, illustrated);
  } catch (error) {
    next(error);
  }
};

exports.removeIllustrated = async (req, res, next) => {
  try {
    await removeIllustratedService(req.user.id, req.params.id);

    return successResponse(res, 200, {
      message: "پروژه با موفقیت از تصویب مصور حذف شد",
    });
  } catch (error) {
    next(error);
  }
};

exports.getIllustrated = async (req, res, next) => {
  try {
    const result = await getIllustratedService(req.user.id, req.query);

    return successResponse(res, 200, result);
  } catch (error) {
    next(error);
  }
};
