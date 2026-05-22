const axios = require("axios");

module.exports = async function useCustomHttp(prompt) {
  const res = await axios.post(
    process.env.AI_CUSTOM_HTTP_URL,
    {
      system: prompt.system,
      user: prompt.user,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: process.env.AI_CUSTOM_HTTP_AUTH || "",
      },
    },
  );

  return (
    res.data?.text ||
    res.data?.output ||
    res.data?.result ||
    res.data?.message ||
    res.data?.content ||
    res.data?.data?.text ||
    res.data
  );
};
