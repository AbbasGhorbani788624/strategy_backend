const OpenAI = require("openai");

module.exports = async function useOpenAICompatible(prompt, messages = []) {
  const client = new OpenAI({
    apiKey: process.env.AI_API_KEY || "none",
    baseURL: process.env.AI_BASE_URL,
  });

  const completion = await client.chat.completions.create({
    model: process.env.AI_MODEL,
    messages: [
      { role: "assistant", content: prompt.assistant },
      { role: "user", content: prompt.user },
    ],
    max_tokens: prompt.max_tokens || 1500,
    temperature: prompt.temperature || 0.7,
  });

  return completion.choices[0].message.content;
};
