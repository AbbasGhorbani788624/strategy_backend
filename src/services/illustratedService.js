const prisma = require("../prismaClient");

const { createBadRequestError } = require("../utils");
const { resolveProjectAccess } = require("./projectAccessService");
const { PROJECT_COLLABORATOR_ACTION } = require("./notificationDispatchService");
const {
  fireAndForgetProjectAccessActivity,
  PROJECT_ACCESS_CAPABILITY,
} = require("./projectCollaboratorNotificationService");

const assertCanMarkIllustrated = async (userId, projectId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, companyId: true },
  });

  if (!user) {
    createBadRequestError("کاربر نامعتبر است", 401);
  }

  const resolved = await resolveProjectAccess(user, projectId);
  if (!resolved.allowed) {
    createBadRequestError("دسترسی به پروژه ندارید", 403);
  }

  if (resolved.isOwner || resolved.capabilities?.canVisualize) {
    return;
  }

  if (user.role === "COMPANY" || user.role === "SUPER_ADMIN") {
    return;
  }

  createBadRequestError(
    "دسترسی تصویب مصور برای این پروژه به شما داده نشده است.",
    403,
  );
};

const addIllustratedService = async (userId, projectId) => {
  await assertCanMarkIllustrated(userId, projectId);

  const existing = await prisma.projectIllustrated.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
    select: { id: true },
  });

  if (existing) {
    return existing;
  }

  const created = await prisma.projectIllustrated.create({
    data: {
      userId,
      projectId,
    },
  });

  fireAndForgetProjectAccessActivity(
    userId,
    projectId,
    PROJECT_COLLABORATOR_ACTION.ILLUSTRATED_MARKED,
    PROJECT_ACCESS_CAPABILITY.VISUALIZE,
  );

  return created;
};

const removeIllustratedService = async (userId, projectId) => {
  await assertCanMarkIllustrated(userId, projectId);

  const deleted = await prisma.projectIllustrated.deleteMany({
    where: {
      userId,
      projectId,
    },
  });

  if (deleted.count > 0) {
    fireAndForgetProjectAccessActivity(
      userId,
      projectId,
      PROJECT_COLLABORATOR_ACTION.ILLUSTRATED_REMOVED,
      PROJECT_ACCESS_CAPABILITY.VISUALIZE,
    );
  }

  return true;
};

const getIllustratedService = async (userId, query) => {
  const {
    page = 1,
    limit = 10,
    search,
    formId,
    sortBy = "createdAt",
    sortOrder = "desc",
    scoreFilter,
  } = query;

  const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
  const parsedLimit = Math.max(parseInt(limit, 10) || 10, 1);

  const skip = (parsedPage - 1) * parsedLimit;

  const projectFilters = [
    {
      OR: [
        {
          creatorId: userId,
        },
        {
          accesses: {
            some: {
              userId,
            },
          },
        },
      ],
    },
  ];

  if (search) {
    projectFilters.push({
      title: {
        contains: search,
      },
    });
  }

  if (formId) {
    projectFilters.push({
      OR: [{ formId }, { multiAnalysisFormId: formId }],
    });
  }

  if (scoreFilter === "high") {
    projectFilters.push({ averageRating: { gte: 4 } });
  } else if (scoreFilter === "medium") {
    projectFilters.push({ averageRating: { gte: 2, lt: 4 } });
  } else if (scoreFilter === "low") {
    projectFilters.push({ averageRating: { lt: 2 } });
  }

  const where = {
    userId,
    project: {
      AND: projectFilters,
    },
  };

  const orderBy =
    sortBy === "title"
      ? { project: { title: sortOrder === "asc" ? "asc" : "desc" } }
      : { createdAt: sortOrder === "asc" ? "asc" : "desc" };

  const [illustrated, totalItems] = await Promise.all([
    prisma.projectIllustrated.findMany({
      where,
      skip,
      take: parsedLimit,
      orderBy,
      include: {
        project: {
          select: {
            id: true,
            title: true,
            status: true,
            averageRating: true,
            formId: true,
            multiAnalysisFormId: true,
            creator: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    }),
    prisma.projectIllustrated.count({ where }),
  ]);

  return {
    projects: illustrated.map((entry) => ({
      ...entry.project,
      illustratedAt: entry.createdAt,
      isIllustrated: true,
      isIllustratedByMe: true,
    })),
    pagination: {
      totalItems,
      currentPage: parsedPage,
      totalPages: Math.ceil(totalItems / parsedLimit),
      limit: parsedLimit,
    },
  };
};

module.exports = {
  addIllustratedService,
  removeIllustratedService,
  getIllustratedService,
};
