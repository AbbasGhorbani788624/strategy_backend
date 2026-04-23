const { successResponse } = require("../utils/responses");
const {
  createCompanyUserService,
  deleteCompanyUserService,
} = require("../services/companyUserService");

exports.createCompanyUser = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const newUser = await createCompanyUserService(
      req.user.id,
      username,
      password,
    );

    return successResponse(res, 201, newUser);
  } catch (err) {
    next(err);
  }
};

exports.deleteCompanyUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const creator = req.user;

    await deleteCompanyUserService(id, creator);

    return successResponse(res, 200, { message: "کاربر با موفقیت حذف شد" });
  } catch (err) {
    next(err);
  }
};
