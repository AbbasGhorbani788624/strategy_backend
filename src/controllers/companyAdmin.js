const {
  upsertCompanyAdminDataService,
} = require("../services/upsertCompanyAdminDataService");
const { successResponse } = require("../utils/responses");

exports.upsertCompanyAdminData = async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { data } = req.body;

    const result = await upsertCompanyAdminDataService(companyId, data);

    return successResponse(res, 200, result);
  } catch (err) {
    console.log(err);
    next(err);
  }
};
