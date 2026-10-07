const { errorResponse } = require("../utils/responses");
const {
  isRecaptchaEnabled,
  verifyRecaptchaToken,
} = require("../utils/recaptchaVerify");

async function verifyLoginRecaptcha(req, res, next) {
  try {
    if (!isRecaptchaEnabled()) {
      return next();
    }

    const token = req.body.recaptchaToken;
    if (!token || !String(token).trim()) {
      return errorResponse(res, 400, "captcha الزامی است");
    }

    const result = await verifyRecaptchaToken(String(token).trim());
    if (!result?.success) {
      return errorResponse(res, 400, "تأیید captcha ناموفق بود");
    }

    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { verifyLoginRecaptcha };
