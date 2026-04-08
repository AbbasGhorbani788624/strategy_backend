const {
  loginService,
  getMeService,
  refreshService,
  logoutService,
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
    if (!req.user) {
      return errorResponse(res, 401, "احراز هویت نشده است");
    }

    const user = await getMeService(req.user.id);
    return successResponse(res, 200, user);
  } catch (err) {
    next(err);
  }
};

exports.refresh = async function (req, res) {
  try {
    const refreshToken = req.cookies.refresh_token;

    const { accessToken, refreshToken: newRefreshToken } =
      await refreshService(refreshToken);

    setAuthCookies(res, accessToken, newRefreshToken);

    return successResponse(res, 200, {
      message: "Access token refreshed",
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
