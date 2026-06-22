const {
  signAccessToken,
  signRefreshToken,
  verifyToken,
  comparePassword,
  hashPassword,
} = require("../utils/auth");

const {
  findUserByUsername,
  revokeAllRefreshTokensByUserId,
  createRefreshToken,
  findById,
  findRefreshToken,
  revokeRefreshToken,
  revokeRefreshTokenByHash,
  changePassword,
} = require("../repositories/userRepository");
const { createBadRequestError } = require("../utils");
const {
  calculateUserProgress,
  calculateCompanyProgress,
  resolveProfileRoute,
  getCompanyProfileForProgress,
} = require("../utils/profileUtils");
const prisma = require("../prismaClient");

const loginService = async (username, password) => {
  const user = await findUserByUsername(username);
  if (!user) {
    createBadRequestError("کاربر پیدا نشد", 404);
  }

  const isValid = await comparePassword(password, user.password);
  if (!isValid) {
    createBadRequestError("نام کاربری یا رمز عبور صحیح نیست", 403);
  }

  const payload = { userId: user.id, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  //  revoke توکن‌های قبلی
  await revokeAllRefreshTokensByUserId(user.id);

  // ذخیره refresh جدید
  await createRefreshToken(user.id, refreshToken);

  const safeUser = { ...user };
  delete safeUser.password;

  return { user: safeUser, accessToken, refreshToken };
};

const getMeService = async (userId) => {
  const user = await findById(userId, ["profile"]);

  if (!user) {
    createBadRequestError("کاربر پیدا نشد", 404);
  }

  let userProgress = user.progress?.user;

  if (!userProgress) {
    userProgress = calculateUserProgress(user.profile);
  }

  let companyProgress = null;

  if (user.companyId) {
    const companyProfileData = await getCompanyProfileForProgress(
      user.companyId,
    );

    companyProgress = user.progress?.company;

    if (!companyProgress) {
      companyProgress = calculateCompanyProgress(companyProfileData);
    }
  }

  const nextRoute = resolveProfileRoute({
    role: user.role,
    userProgress,
    companyProgress,
  });

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    companyId: user.companyId,
    progress: {
      user: userProgress,
      company: companyProgress,
    },
    nextRoute,
  };
};

const changePasseordService = async (userId, oldPassword, newPassword) => {
  await revokeAllRefreshTokensByUserId(userId);
  await changePassword(userId, oldPassword, newPassword);
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

  const storedToken = await findRefreshToken(refreshToken);

  if (!storedToken || storedToken.revoked) {
    createBadRequestError("refresh token معتبر نیست", 401);
  }

  if (storedToken.expiresAt < new Date()) {
    createBadRequestError("refresh token منقضی شده است", 401);
  }

  // Rotation: توکن قدیمی را revoke کن
  await revokeRefreshTokenByHash(storedToken.tokenHash);

  const payload = { userId: decoded.userId, role: decoded.role };
  const newAccessToken = signAccessToken(payload);
  const newRefreshToken = signRefreshToken(payload);

  await createRefreshToken(decoded.userId, newRefreshToken);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

const logoutService = async (refreshToken) => {
  if (!refreshToken) return;
  await revokeRefreshToken(refreshToken);
};

const changeCredentialsService = async ({
  currentUserId,
  userId,
  oldPassword,
  newPassword,
  username,
}) => {
  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: {
      id: true,
      role: true,
      companyId: true,
    },
  });

  if (!currentUser) {
    createBadRequestError("کاربر جاری یافت نشد", 404);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      password: true,
      companyId: true,
    },
  });

  if (!user) {
    createBadRequestError("کاربر یافت نشد", 404);
  }

  // USER فقط خودش
  if (currentUser.role === "USER" && currentUser.id !== user.id) {
    createBadRequestError("شما اجازه تغییر اطلاعات این کاربر را ندارید", 403);
  }

  // COMPANY فقط اعضای شرکت خودش
  if (currentUser.role === "COMPANY") {
    if (!currentUser.companyId || currentUser.companyId !== user.companyId) {
      createBadRequestError(
        "شما فقط می‌توانید اعضای شرکت خود را ویرایش کنید",
        403,
      );
    }
  }

  // حداقل یکی از فیلدها باید تغییر کند
  if (!username && !newPassword) {
    createBadRequestError("حداقل یک فیلد برای بروزرسانی ارسال کنید", 400);
  }

  // اگر چیزی تغییر می‌کند، رمز قبلی لازم است
  if (username || newPassword) {
    if (!oldPassword) {
      createBadRequestError("رمز عبور فعلی الزامی است", 400);
    }

    const isPasswordValid = await comparePassword(oldPassword, user.password);

    if (!isPasswordValid) {
      createBadRequestError("رمز عبور فعلی اشتباه است", 400);
    }
  }

  // چک تکراری بودن username
  if (username && username !== user.username) {
    const usernameExists = await prisma.user.findFirst({
      where: {
        username,
        NOT: {
          id: user.id,
        },
      },
    });

    if (usernameExists) {
      createBadRequestError("این نام کاربری قبلاً استفاده شده است", 400);
    }
  }

  const data = {};

  if (username) {
    data.username = username;
  }

  if (newPassword) {
    data.password = await hashPassword(newPassword);
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data,
  });

  return {
    success: true,
    message: "اطلاعات حساب با موفقیت بروزرسانی شد",
  };
};

module.exports = {
  loginService,
  getMeService,
  refreshService,
  logoutService,
  changePasseordService,
  changeCredentialsService,
};
