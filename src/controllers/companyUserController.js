const { successResponse } = require("../utils/responses");
const {
  createCompanyUserService,
  deleteCompanyUserService,
  getColleaguesService,
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

exports.usersColleague = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const colleague = await getColleaguesService(userId);

    return successResponse(res, 200, colleague);
  } catch (err) {
    next(err);
  }
};
