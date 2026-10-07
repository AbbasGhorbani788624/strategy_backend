const axios = require("axios");

const SITE_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

function isRecaptchaSkip() {
  return process.env.RECAPTCHA_SKIP === "true";
}

function isRecaptchaEnabled() {
  return !isRecaptchaSkip() && Boolean(process.env.RECAPTCHA_SECRET_KEY);
}

async function verifyRecaptchaToken(token) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  const body = new URLSearchParams({
    secret,
    response: token,
  }).toString();

  const { data } = await axios.post(SITE_VERIFY_URL, body, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 10_000,
  });
console.log(data);
  return data;
}

module.exports = {
  isRecaptchaEnabled,
  isRecaptchaSkip,
  verifyRecaptchaToken,
};
