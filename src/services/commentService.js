const prisma = require("../prismaClient");
const { createBadRequestError } = require("../utils");

const getCommentsService = async (projectId, userId, page, limit) => {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,

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
  });

  if (!project) {
    createBadRequestError("دسترسی به پروژه ندارید", 403);
  }

  const skip = (page - 1) * limit;

  const [comments, total] = await Promise.all([
    prisma.projectComment.findMany({
      where: {
        projectId,
      },

      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },

      skip,

      take: limit,
    }),

    prisma.projectComment.count({
      where: {
        projectId,
      },
    }),
  ]);

  return {
    comments,

    pagination: {
      total,
      page,
      limit,

      totalPages: Math.ceil(total / limit),
    },
  };
};

const createCommentService = async (projectId, userId, content) => {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,

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
  });

  if (!project) {
    createBadRequestError("دسترسی به پروژه ندارید", 403);
  }

  if (!content) {
    createBadRequestError("متن کامنت الزامی است", 400);
  }

  return prisma.projectComment.create({
    data: {
      content,

      projectId,

      userId,
    },

    include: {
      user: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });
};

const deleteCommentService = async (commentId, userId) => {
  const comment = await prisma.projectComment.findUnique({
    where: {
      id: commentId,
    },

    include: {
      project: true,
    },
  });

  if (!comment) {
    createBadRequestError("کامنت پیدا نشد", 404);
  }

  if (comment.project.creatorId !== userId) {
    createBadRequestError("فقط صاحب پروژه می‌تواند حذف کند", 403);
  }

  return prisma.projectComment.delete({
    where: {
      id: commentId,
    },
  });
};

module.exports = {
  getCommentsService,
  createCommentService,
  deleteCommentService,
};
