const OpenAI = require("openai");

module.exports = async function useOpenAICompatible(prompt) {
  const client = new OpenAI({
    apiKey: process.env.AI_API_KEY || "none",
    baseURL: process.env.AI_BASE_URL,
  });

  const messages = [];

  if (typeof prompt.system === "string" && prompt.system.trim()) {
    messages.push({
      role: "system",
      content: prompt.system,
    });
  }

  if (typeof prompt.user !== "string" || !prompt.user.trim()) {
    throw new Error("AI user prompt is empty or invalid");
  }

  messages.push({
    role: "user",
    content: prompt.user,
  });

  const completion = await client.chat.completions.create({
    model: process.env.AI_MODEL,
    messages,
    max_tokens: prompt.max_tokens || 1500,
    temperature: prompt.temperature ?? 0.7,
  });

  return completion.choices[0].message.content;
};
