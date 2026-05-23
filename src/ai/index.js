const useOpenAICompatible = require("./providers/openaiCompatible");
const useCustomHttp = require("./providers/customHttp");

module.exports = async function runAI(prompt) {
  const provider = process.env.AI_PROVIDER;

  switch (provider) {
    case "ollama":
    case "openai":
    case "openai_compatible":
      return await useOpenAICompatible(prompt);

    case "custom":
      return await useCustomHttp(prompt);

    default:
      throw new Error("AI_PROVIDER ناشناخته است");
  }
};
