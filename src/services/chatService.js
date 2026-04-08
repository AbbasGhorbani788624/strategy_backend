const OpenAI = require("openai");
const { createBadRequestError } = require("../utils");
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

const generateSummaryService = async (analysisText) => {
  const prompt = `
شما یک تحلیل کامل دریافت کرده‌اید. لطفا یک خلاصه دقیق، واضح و مفید از این تحلیل ارائه دهید 
که کاربر بتواند با استفاده از آن در چت با AI ادامه دهد. 
تحلیل:
${analysisText}
`;

  const completion = await openai.chat.completions.create({
    model: "openrouter/free",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1000,
  });

  return completion.choices[0].message.content;
};

const sendMessageToChatService = async (messages) => {
  if (messages.length > 31) {
    createBadRequestError("حداکثر 30 پیام مجاز است");
  }

  const completion = await openai.chat.completions.create({
    model: "openrouter/free",
    messages,
    max_tokens: 1000,
  });

  const aiMessage = completion.choices[0].message.content;

  return { message: aiMessage };
};

module.exports = {
  generateSummaryService,
  sendMessageToChatService,
};
