const OpenAI = require("openai");
const { createBadRequestError } = require("../utils");
const openai = new OpenAI({
  apiKey: "ollama",
  baseURL: "http://localhost:11434/v1",
});

const generateSummaryService = async (analysisText) => {
  const prompt = `
  You have received a complete analysis. Please provide a concise, clear, and useful summary of this analysis 
that the user can use to continue chatting with the AI. 
Analysis:
${analysisText}
`;

  const completion = await openai.chat.completions.create({
    model: "qwen2.5-coder:7b",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1000,
    temperature: 0.7,
  });

  return completion.choices[0].message.content;
};

const sendMessageToChatService = async (messages) => {
  if (messages.length > 31) {
    createBadRequestError("حداکثر 30 پیام مجاز است");
  }

  const completion = await openai.chat.completions.create({
    model: "qwen2.5-coder:7b",
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
