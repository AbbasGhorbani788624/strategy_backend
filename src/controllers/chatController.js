const {
  generateSummaryService,
  sendMessageToChatService,
} = require("../services/chatService");
const { errorResponse, successResponse } = require("../utils/responses");
exports.generateSummary = async (req, res, next) => {
  try {
    const { analysisText } = req.body;
    if (!analysisText) {
      return errorResponse(res, 400, "تحلیل برای ایجاد summary لازم است");
    }

    const summary = await generateSummaryService(analysisText);

    return successResponse(res, 200, { summary });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.sendMessageToChat = async (req, res, next) => {
  try {
    const { messages } = req.body; // شامل summary + پیام‌های قبلی + پیام جدید
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return errorResponse(res, 400, "پیامها الزامی است و باید آرایه باشد");
    }

    const result = await sendMessageToChatService(messages);
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    next(err);
  }
};
