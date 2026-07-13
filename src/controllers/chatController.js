const { createChatService, getChatService } = require("../services/chatService");

exports.createChat = async (req, res, next) => {
    try {
      const result = await createChatService({
        companyId: req.user.companyId,
        userId: req.user.companyId,
        userGoal: req.body.userGoal,
        conversationId:req.user.companyId,
      });


  console.log("result =>",result)
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };


  exports.getChat = async (req, res, next) => {
    try {
      console.log("req.user.companyId =>",req.user.companyId)
      const result = await getChatService({
        conversationId:req.user.companyId,

      });
      console.log("result =>",result)
      res.status(200).json(result);
    }
    catch (error) {
      next(error);
    }
  }