// controllers/companyController.js
const { successResponse } = require("../utils/responses");
const {
  createCompanyService,
  updateCompanyService,
} = require("../services/companyService");

exports.createCompanyWithAdmin = async (req, res, next) => {
  try {
    const {
      name,
      industry,
      userLimit,
      username,
      profileCompany,
      profileUser,
      password,
    } = req.body;

    const result = await createCompanyService(
      name,
      industry,
      userLimit,
      username,
      profileCompany,
      profileUser,
      password,
    );
    return successResponse(res, 201, result);
  } catch (err) {
    next(err);
  }
};

exports.updateCompanyWithAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      industry,
      userLimit,
      username,
      profileCompany,
      profileUser,
      password,
    } = req.body;

    const result = await updateCompanyService(
      id,
      name,
      industry,
      userLimit,
      username,
      profileCompany,
      profileUser,
      password,
    );
    return successResponse(res, 200, result);
  } catch (err) {
    next(err);
  }
};
