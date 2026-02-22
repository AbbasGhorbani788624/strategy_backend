const {
  signAccessToken,
  signRefreshToken,
  verifyToken,
  comparePassword,
} = require("../utils/auth");

const userRepo = require("../repositories/userRepository");

const loginService = async (username, password) => {
  const user = await userRepo.findUserByUsername(username);
  if (!user) {
    const err = new Error("کاربر پیدا نشد");
    err.statusCode = 404;
    throw err;
  }

  const isValid = await comparePassword(password, user.password);
  if (!isValid) {
    const err = new Error("نام کاربری یا رمز عبور صحیح نیست");
    err.statusCode = 401;
    throw err;
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
    const err = new Error("کاربر پیدا نشد");
    err.statusCode = 404;
    throw err;
  }
  return user;
};

const refreshService = async (refreshToken) => {
  if (!refreshToken) {
    const err = new Error("توکن refresh وجود ندارد");
    err.statusCode = 400;
    throw err;
  }
  let decoded;
  try {
    decoded = verifyToken(refreshToken, process.env.REFRESH_TOKEN_SECRET_KEY);
  } catch {
    const err = new Error("refresh token نامعتبر است");
    err.statusCode = 401;
    throw err;
  }

  const storedToken = await userRepo.findRefreshToken(refreshToken);

  if (!storedToken || storedToken.revoked) {
    const err = new Error("refresh token معتبر نیست");
    err.statusCode = 401;
    throw err;
  }

  if (storedToken.expiresAt < new Date()) {
    const err = new Error("refresh token منقضی شده است");
    err.statusCode = 401;
    throw err;
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
