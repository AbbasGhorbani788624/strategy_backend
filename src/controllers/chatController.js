const {
  createChatService,
  getChatService,
} = require("../services/chatService");

exports.createChat = async (req, res, next) => {
  const requestStart = Date.now();
  try {
    const result = await createChatService({
      companyId: req.user.companyId,
      userId: req.user.companyId,
      userGoal: req.body.userGoal,
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
