const prisma = require("../prismaClient");

const { createBadRequestError, buildProjectAccessWhere } = require("../utils");

const addBookmarkService = async (userId, projectId) => {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { creatorId: userId },
        {
          accesses: {
            some: { userId },
          },
        },
      ],
    },
  });

  if (!project) {
    createBadRequestError("دسترسی به پروژه ندارید", 403);
  }

  return prisma.projectBookmark.upsert({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
    update: {},
    create: {
      userId,
      projectId,
    },
  });
};

const removeBookmarkService = async (userId, projectId) => {
  await prisma.projectBookmark.deleteMany({
    where: {
      userId,
      projectId,
    },
  });

  return true;
};

const getBookmarksService = async (user, query) => {
  const userId = user.id;
  const {
    page = 1,
    limit = 10,
    search,
    formId,
    targetUserId,
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

  if (scoreFilter === "high") {
    projectFilters.push({
      averageRating: {
        gte: 4,
      },
    });
  } else if (scoreFilter === "medium") {
    projectFilters.push({
      averageRating: {
        gte: 2,
        lt: 4,
      },
    });
  } else if (scoreFilter === "low") {
    projectFilters.push({
      averageRating: {
        lt: 2,
      },
    });
  }

  if (search) {
    projectFilters.push({
      OR: [
        { title: { contains: search } },
        { creator: { username: { contains: search } } },
        {
          accesses: {
            some: { user: { username: { contains: search } } },
          },
        },
      ],
    });
  }

  if (targetUserId) {
    await buildProjectAccessWhere({
      userId,
      userRole: user.role,
      companyId: user.companyId,
      targetUserId,
    });
    projectFilters.push({ creatorId: targetUserId });
  }

  if (formId) {
    projectFilters.push({
      OR: [{ formId }, { multiAnalysisFormId: formId }],
    });
  }

  const allowedSortFields = ["createdAt", "averageRating"];
  const allowedSortOrders = ["asc", "desc"];

  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

  const safeSortOrder = allowedSortOrders.includes(sortOrder)
    ? sortOrder
    : "desc";

  let orderBy = [
    {
      project: {
        createdAt: safeSortOrder,
      },
    },
    {
      project: {
        id: "desc",
      },
    },
  ];

  if (safeSortBy === "averageRating") {
    orderBy = [
      {
        project: {
          hasRating: "desc",
        },
      },
      {
        project: {
          averageRating: safeSortOrder,
        },
      },
      {
        project: {
          createdAt: "desc",
        },
      },
      {
        project: {
          id: "desc",
        },
      },
    ];
  }

  const where = {
    userId,
    project: {
      AND: projectFilters,
    },
  };

  const bookmarks = await prisma.projectBookmark.findMany({
    where,
    skip,
    take: parsedLimit,
    orderBy,
    select: {
      createdAt: true,

      project: {
        select: {
          id: true,
          title: true,
          mode: true,
          status: true,
          formId: true,
          multiAnalysisFormId: true,
          createdAt: true,

          averageRating: true,
          ratingCount: true,
          hasRating: true,

          creator: {
            select: {
              id: true,
              username: true,
            },
          },

          company: {
            select: {
              id: true,
              name: true,
            },
          },

          ratings: {
            orderBy: {
              createdAt: "desc",
            },
            include: {
              rater: {
                select: {
                  id: true,
                  username: true,
                  role: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const totalItems = await prisma.projectBookmark.count({
    where,
  });

  return {
    projects: bookmarks.map((bookmark) => ({
      ...bookmark.project,
      bookmarkedAt: bookmark.createdAt,
      isBookmarked: true,
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
  addBookmarkService,
  removeBookmarkService,
  getBookmarksService,
};
