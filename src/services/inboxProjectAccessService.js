const prisma = require("../prismaClient");
const { createBadRequestError } = require("../utils");
const {
  parseListQuery,
  buildPaginationMeta,
} = require("../utils/listQueryUtils");
const {
  toCounterparty,
  mapProjectRef,
  parseInboxDirection,
} = require("../utils/inboxItemMappers");

const mapProjectAccessInboxItem = (row, direction) => {
  const project = row.project;
  const projectRef = mapProjectRef(project);
  const counterparty =
    direction === "received"
      ? toCounterparty(project?.creator)
      : toCounterparty(row.user);

  return {
    id: row.id,
    direction,
    resource: projectRef,
    project: projectRef,
    counterparty,
    permission: row.canView ? "VIEW" : null,
    canView: row.canView,
    canAction: row.canAction,
    canVisualize: row.canVisualize,
    message: null,
    createdAt: row.createdAt,
    updatedAt: null,
  };
};

const listProjectAccessInboxService = async (user, query = {}) => {
  if (!user?.id) {
    createBadRequestError("کاربر نامعتبر است.", 401);
  }

  const direction = parseInboxDirection(query);
  const { page, limit, skip, search } = parseListQuery(query, {
    defaultLimit: 20,
    maxLimit: 50,
  });

  if (!user.companyId) {
    return {
      items: [],
      pagination: buildPaginationMeta({ totalItems: 0, page, limit }),
    };
  }

  if (direction === "received" && user.role !== "MEMBER") {
    return {
      items: [],
      pagination: buildPaginationMeta({ totalItems: 0, page, limit }),
    };
  }

  const searchFilter = search
    ? {
        OR: [
          { project: { title: { contains: search } } },
          ...(direction === "received"
            ? [{ project: { creator: { username: { contains: search } } } }]
            : [{ user: { username: { contains: search } } }]),
        ],
      }
    : {};

  const where =
    direction === "received"
      ? {
          userId: user.id,
          project: { companyId: user.companyId },
          ...searchFilter,
        }
      : {
          userId: { not: user.id },
          project: {
            creatorId: user.id,
            companyId: user.companyId,
          },
          ...searchFilter,
        };

  const [rows, totalItems] = await Promise.all([
    prisma.projectAccess.findMany({
      where,
      include: {
        user: { select: { id: true, username: true } },
        project: {
          select: {
            id: true,
            title: true,
            creator: { select: { id: true, username: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.projectAccess.count({ where }),
  ]);

  return {
    items: rows.map((row) => mapProjectAccessInboxItem(row, direction)),
    pagination: buildPaginationMeta({ totalItems, page, limit }),
  };
};

module.exports = {
  listProjectAccessInboxService,
};
