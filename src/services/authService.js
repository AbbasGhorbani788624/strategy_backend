const {
  signAccessToken,
  signRefreshToken,
  verifyToken,
  comparePassword,
} = require("../utils/auth");

const userRepo = require("../repositories/userRepository");
const { createBadRequestError } = require("../utils");

const loginService = async (username, password) => {
  const user = await userRepo.findUserByUsername(username);
  if (!user) {
    createBadRequestError("کاربر پیدا نشد", 404);
  }

  const isValid = await comparePassword(password, user.password);
  if (!isValid) {
    createBadRequestError("نام کاربری یا رمز عبور صحیح نیست", 401);
  }

  const payload = { userId: user.id, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  // 🔹 revoke توکن‌های قبلی
  await userRepo.revokeAllRefreshTokensByUserId(user.id);

  // ذخیره refresh جدید
  await userRepo.createRefreshToken(user.id, refreshToken);

  const safeUser = { ...user };
  delete safeUser.password;

  return { user: safeUser, accessToken, refreshToken };
};

const getMeService = async (userId) => {
  const user = await userRepo.findById(userId);
  if (!user) {
    createBadRequestError("کاربر پیدا نشد", 404);
  }
  return user;
};

const refreshService = async (refreshToken) => {
  if (!refreshToken) {
    createBadRequestError("توکن refresh وجود ندارد", 404);
  }

  let decoded;
  try {
    decoded = verifyToken(refreshToken, process.env.REFRESH_TOKEN_SECRET_KEY);
  } catch {
    createBadRequestError("refresh token نامعتبر است", 401);
  }

  const storedToken = await userRepo.findRefreshToken(refreshToken);

  if (!storedToken || storedToken.revoked) {
    createBadRequestError("refresh token معتبر نیست", 401);
  }

  if (storedToken.expiresAt < new Date()) {
    createBadRequestError("refresh token منقضی شده است", 401);
  }

  // Rotation: توکن قدیمی را revoke کن
  await userRepo.revokeRefreshTokenByHash(storedToken.tokenHash);

  const payload = { userId: decoded.userId, role: decoded.role };
  const newAccessToken = signAccessToken(payload);
  const newRefreshToken = signRefreshToken(payload);

  await userRepo.createRefreshToken(decoded.userId, newRefreshToken);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

const logoutService = async (refreshToken) => {
  if (!refreshToken) return;
  await userRepo.revokeRefreshToken(refreshToken);
};

module.exports = {
  loginService,
  getMeService,
  refreshService,
  logoutService,
};
