const express = require("express");
const OpenAI = require("openai");

const router = express.Router();
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1", // حتما این آدرس باشه
});

router.post("/", async (req, res) => {
  const { formPrompt, userProfile, companyProfile, userAnswers } = req.body;

  if (!formPrompt || !userProfile || !userAnswers) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const promptText = `
${formPrompt}

User Profile:
${JSON.stringify(userProfile, null, 2)}

Company Profile:
${JSON.stringify(companyProfile ?? {}, null, 2)}

Answers:
${Object.entries(userAnswers)
  .map(([q, a]) => `Question: ${q}\nAnswer: ${a}`)
  .join("\n\n")}
    `;

    // برای مدل رایگان فقط نامش را بگذار
    const completion = await openai.chat.completions.create({
      model: "openrouter/free", // مدل رایگان
      messages: [{ role: "user", content: promptText }],
      max_tokens: 500,
    });
    const analysis = completion.choices[0].message?.content;
    res.json({ analysis });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI error" });
  }
});

router.post("/solution", async (req, res) => {
  const { analysis } = req.body;

  if (!analysis) return res.status(400).json({ error: "Missing analysis" });

  try {
    const solutionPrompt = `
تحلیل قبلی کاربر:
${analysis}

لطفاً بر اساس این تحلیل یک راه حل عملی، کاربردی و قابل اجرا ارائه بده.
`;

    const completion = await openai.chat.completions.create({
      model: "openrouter/free",
      messages: [{ role: "user", content: solutionPrompt }],
      max_tokens: 500,
    });

    const solution = completion.choices[0].message?.content;
    res.json({ solution });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI error" });
  }
});

router.post("/chat", async (req, res) => {
  const { conversation } = req.body;

  if (!conversation || !Array.isArray(conversation)) {
    return res.status(400).json({ error: "conversation array is required" });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "openrouter/free",
      messages: conversation,
      max_tokens: 500,
    });

    const aiReply = completion.choices[0].message?.content;
    res.json({ reply: aiReply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI error" });
  }
});

module.exports = router;
