const { successResponse } = require("../utils/responses");
const { createCompanyUserService } = require("../services/companyUserService");

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

//delete user
