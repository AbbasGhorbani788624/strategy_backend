const {
  loginService,
  getMeService,
  refreshService,
  logoutService,
  changePasseordService,
  changeCredentialsService,
} = require("../services/authService");
const setAuthCookies = require("../utils/cookie");
const { successResponse, errorResponse } = require("../utils/responses");

exports.login = async function (req, res, next) {
  try {
    const { username, password } = req.body;
    const { user, accessToken, refreshToken } = await loginService(
      username,
      password,
    );

    setAuthCookies(res, accessToken, refreshToken);

    return successResponse(res, 200, { user });
  } catch (err) {
    next(err);
  }
};

exports.getMe = async function (req, res, next) {
  try {
    const user = await getMeService(req.user.id);
    return successResponse(res, 200, user);
  } catch (err) {
    next(err);
  }
};

exports.changeCredentials = async (req, res, next) => {
  try {
    const result = await changeCredentialsService({
      currentUserId: req.user.id,
      userId: req.body.userId,
      oldPassword: req.body.oldPassword,
      newPassword: req.body.newPassword,
      username: req.body.username,
    });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
exports.refresh = async function (req, res) {
  try {
    const refreshToken = req.cookies.refresh_token;

    const { accessToken, refreshToken: newRefreshToken } =
      await refreshService(refreshToken);

    setAuthCookies(res, accessToken, newRefreshToken);

    return successResponse(res, 200, {
      message: "توکن دسترسی با موفقیت رفرش شد",
    });
  } catch (err) {
    return errorResponse(res, 401, err.message);
  }
};

exports.logout = async function (req, res) {
  const refreshToken = req.cookies.refresh_token;

  await logoutService(refreshToken);

  res.clearCookie("access_token");
  res.clearCookie("refresh_token");

  return successResponse(res, 200, {
    message: "با موفقیت خارج شدید",
  });
};

exports.changePassword = async function (req, res, next) {
  try {
    const { oldPassword, newPassword } = req.body;

    await changePasseordService(req.user.id, oldPassword, newPassword);
    return successResponse(res, 200, {
      message: "رمز عبور با موفقیت تغییر کرد",
    });
  } catch (err) {
    next(err);
  }
};
