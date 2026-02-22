const prisma = require("../prismaClient");
const { hashToken, hashPassword } = require("../utils/auth");

const findUserByUsername = async (username) => {
  return prisma.user.findUnique({ where: { username } });
};

const findById = async (id, props = []) => {
  // select پیش‌فرض
  const defaultSelect = {
    id: true,
    username: true,
    role: true,
  };

  // تبدیل props به شی select با مقدار true
  const propSelect = props.reduce((acc, field) => {
    acc[field] = true;
    return acc;
  }, {});

  return prisma.user.findUnique({
    where: { id },
    select: { ...defaultSelect, ...propSelect },
  });
};

const update = async (id, data) => {
  return await prisma.user.update({
    where: { id },
    data,
  });
};

const createRefreshToken = async (userId, refreshToken) => {
  return prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
};

const findRefreshToken = async (refreshToken) => {
  return prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
  });
};

const revokeRefreshToken = async (refreshToken) => {
  return prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(refreshToken) },
    data: { revoked: true },
  });
};

const revokeRefreshTokenByHash = async (tokenHash) => {
  return prisma.refreshToken.updateMany({
    where: { tokenHash },
    data: { revoked: true },
  });
};

const revokeAllRefreshTokensByUserId = async (userId) => {
  return prisma.refreshToken.updateMany({
    where: { userId, revoked: false },
    data: { revoked: true },
  });
};

const countUsersByCompany = async (companyId) => {
  return prisma.user.count({ where: { companyId } });
};

const createUser = async ({ username, password, role, companyId }) => {
  const hashedPassword = await hashPassword(password);
  return prisma.user.create({
    data: {
      username,
      password: hashedPassword,
      role,
      companyId,
    },
  });
};

module.exports = {
  findUserByUsername,
  findById,
  createRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
  revokeRefreshTokenByHash,
  revokeAllRefreshTokensByUserId,
  countUsersByCompany,
  createUser,
  update,
};
