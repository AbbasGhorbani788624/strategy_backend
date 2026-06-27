const prisma = require("../prismaClient");

const { createBadRequestError } = require("../utils");

const addBookmarkService = async (userId, projectId) => {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
  });

  if (!project) {
    createBadRequestError("پروژه مورد نظر یافت نشد", 404);
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

const getBookmarksService = async (userId, query) => {
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
