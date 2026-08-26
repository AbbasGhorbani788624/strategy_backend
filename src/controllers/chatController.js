const {
  enqueueChatService,
  getChatJobStatusService,
  getChatService,
} = require("../services/chatService");

exports.createChat = async (req, res, next) => {
  try {
    const { jobId, status, deduplicated } = await enqueueChatService({
      companyId: req.user.companyId,
      userId: req.user.companyId,
      userGoal: req.body.userGoal,
      conversationId: req.user.companyId,
    });

    res.status(202).json({
      success: true,
      message: "Chat job queued",
      jobId,
      status,
      deduplicated: Boolean(deduplicated),
    });
  } catch (err) {
    next(err);
  }
};

exports.getChatJobStatus = async (req, res, next) => {
  try {
    const result = await getChatJobStatusService({
      jobId: req.params.jobId,
      conversationId: req.user.companyId,
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

exports.getChat = async (req, res, next) => {
  try {
    const result = await getChatService({
      conversationId: req.user.companyId,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
