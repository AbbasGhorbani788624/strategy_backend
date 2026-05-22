const {
  createFollowUpFormService,
  getActiveFollowUpFormService,
} = require("../services/followupsService");
const { successResponse } = require("../utils/responses");

exports.createFollowUpForm = async (req, res, next) => {
  try {
    await createFollowUpFormService(req.body);
    return successResponse(res, 201, { message: "فرم با موفقیت ذخیره شد" });
  } catch (error) {
    next(error);
  }
};

exports.getActiveFollowUpForm = async (req, res, next) => {
  try {
    const result = await getActiveFollowUpFormService();
    return successResponse(res, 200, result);
  } catch (error) {
    next(error);
  }
};

exports.createProjectFollowUpRequest = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const userId = req.user?.id;

    await createProjectFollowUpRequestService({
      projectId,
      userId,
      body: req.body,
    });

    return successResponse(res, 201, {
      message: "درخواست پیگیری با موفقیت ارسال شد",
    });
  } catch (error) {
    next(error);
  }
};
