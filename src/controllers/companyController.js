// controllers/companyController.js
const { successResponse } = require("../utils/responses");
const { createCompanyService } = require("../services/companyService");

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
