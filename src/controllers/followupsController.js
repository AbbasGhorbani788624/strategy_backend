const {
  getActiveFollowUpFormService,
  createProjectFollowUpRequestService,
  getMyFollowUps,
} = require("../services/followupsService");
const { successResponse } = require("../utils/responses");

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

exports.getMyFollowUpsController = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await getMyFollowUps(userId, req.query);

    res.status(200).json({
      success: true,
      data: {
        followUps: result.followUps,
        pagination: result.pagination,
      },
    });
  } catch (err) {
    next(err);
  }
};
