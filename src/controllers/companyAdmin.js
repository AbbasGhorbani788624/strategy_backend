const {
  upsertCompanyAdminDataService,
} = require("../services/upsertCompanyAdminDataService");
const { successResponse, errorResponse } = require("../utils/responses");

exports.upsertCompanyAdminData = async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { data } = req.body;

    if (!data) {
      errorResponse(res, 400, "اطلاعات را با کلید data ارسال کنید");
    }

    const result = await upsertCompanyAdminDataService(companyId, data);

    return successResponse(res, 200, result);
  } catch (err) {
    console.log(err);
    next(err);
  }
};
