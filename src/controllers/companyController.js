// controllers/companyController.js
const { successResponse } = require("../utils/responses");
const {
  createCompanyService,
  updateCompanyService,
  getCompaniesService,
  getCompanyMembersService,
  deleteCompanyService,
  getCompanyService,
} = require("../services/companyService");
const { createBadRequestError } = require("../utils");

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

exports.updateCompany = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, industry, userLimit, profileCompany } = req.body;
    const companyId = req.user.companyId;
    const userRole = req.user.role;

    if (userRole === "COMPANY") {
      if (id !== companyId) {
        throw createBadRequestError(
          "شما مجاز به ویرایش شرکت دیگری نیستید.",
          401,
        );
      }
    }

    const result = await updateCompanyService(
      id,
      name,
      industry,
      userLimit,
      profileCompany,
      userRole,
    );

    return successResponse(res, 200, result);
  } catch (err) {
    next(err);
  }
};

exports.getAllCompany = async (req, res, next) => {
  try {
    const conpamies = await getCompaniesService(req.query);
    return successResponse(res, 200, conpamies);
  } catch (err) {
    next(err);
  }
};

exports.getCompanyMemebers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;
    const conpamies = await getCompanyMembersService(id, companyId, req.query);
    return successResponse(res, 200, conpamies);
  } catch (err) {
    next(err);
  }
};

exports.deleteCompany = async (req, res, next) => {
  try {
    const { id } = req.params;
    await deleteCompanyService(id);
    return successResponse(res, 200, { message: "شرکت با موفقیت حذف شد" });
  } catch (err) {
    next(err);
  }
};

exports.getCompany = async (req, res, next) => {
  try {
    const { id } = req.params;
    const company = await getCompanyService(id);
    return successResponse(res, 200, company);
  } catch (err) {
    next(err);
  }
};
