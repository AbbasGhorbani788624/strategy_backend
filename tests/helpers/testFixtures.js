const { randomUUID } = require("crypto");
const prisma = require("../../src/prismaClient");
const { hashPassword, signAccessToken } = require("../../src/utils/auth");

const QA_PREFIX = "__qa_test__";

const makeUsername = (label) =>
  `${QA_PREFIX}${label}_${Date.now()}_${randomUUID().slice(0, 8)}`;

async function createTestCompany(nameSuffix = "co") {
  return prisma.company.create({
    data: {
      name: `${QA_PREFIX}company_${nameSuffix}_${Date.now()}`,
    },
  });
}

async function createTestUser({ role, companyId, usernameLabel = role }) {
  const password = "QaTestPass123!";
  const user = await prisma.user.create({
    data: {
      username: makeUsername(usernameLabel),
      password: await hashPassword(password),
      role,
      companyId: companyId ?? null,
    },
  });

  const accessToken = signAccessToken({ userId: user.id, role: user.role });

  return {
    user,
    password,
    accessToken,
  };
}

async function createTwoCompanyScenario() {
  const companyA = await createTestCompany("A");
  const companyB = await createTestCompany("B");

  const companyUserA = await createTestUser({
    role: "COMPANY",
    companyId: companyA.id,
    usernameLabel: "companyA",
  });

  const memberA = await createTestUser({
    role: "MEMBER",
    companyId: companyA.id,
    usernameLabel: "memberA",
  });

  const memberB = await createTestUser({
    role: "MEMBER",
    companyId: companyB.id,
    usernameLabel: "memberB",
  });

  const memberA2 = await createTestUser({
    role: "MEMBER",
    companyId: companyA.id,
    usernameLabel: "memberA2",
  });

  return {
    companyA,
    companyB,
    companyUserA,
    memberA,
    memberA2,
    memberB,
  };
}

async function cleanupQaData() {
  const qaUsers = await prisma.user.findMany({
    where: { username: { startsWith: QA_PREFIX } },
    select: { id: true, companyId: true },
  });

  const userIds = qaUsers.map((u) => u.id);
  const companyIds = [
    ...new Set(qaUsers.map((u) => u.companyId).filter(Boolean)),
  ];

  if (userIds.length) {
    await prisma.refreshToken.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.notification.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.projectAccess.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.projectBookmark.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.followUpRequest.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.project.deleteMany({
      where: { creatorId: { in: userIds } },
    });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }

  if (companyIds.length) {
    await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
  }

  const orphanCompanies = await prisma.company.findMany({
    where: { name: { startsWith: QA_PREFIX } },
    select: { id: true },
  });

  if (orphanCompanies.length) {
    await prisma.company.deleteMany({
      where: { id: { in: orphanCompanies.map((c) => c.id) } },
    });
  }
}

module.exports = {
  QA_PREFIX,
  createTestCompany,
  createTestUser,
  createTwoCompanyScenario,
  cleanupQaData,
};
