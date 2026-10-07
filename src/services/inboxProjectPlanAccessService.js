const prisma = require("../prismaClient");
const { createBadRequestError } = require("../utils");
const {
  parseListQuery,
  buildPaginationMeta,
  buildProjectTitleSearchFilter,
} = require("../utils/listQueryUtils");
const {
  mapProjectPlanAccessRowToInboxItem,
  parseInboxDirection,
} = require("../utils/inboxItemMappers");
const {
  fetchReceivedProjectPlanAccessPage,
} = require("./projectPlanCollaboratorsService");

const listProjectPlanAccessInboxService = async (user, query = {}) => {
  if (!user?.id) {
    createBadRequestError("کاربر نامعتبر است.", 401);
  }

  const direction = parseInboxDirection(query);
  const { page, limit, skip, search } = parseListQuery(query, {
    defaultLimit: 20,
    maxLimit: 50,
  });

  if (direction === "received") {
    if (user.role !== "MEMBER" || !user.companyId) {
      return {
        items: [],
        pagination: buildPaginationMeta({ totalItems: 0, page, limit }),
      };
    }

    const { rows, totalItems } = await fetchReceivedProjectPlanAccessPage(
      user,
      { page, limit, skip, search },
    );

    return {
      items: rows.map((row) =>
        mapProjectPlanAccessRowToInboxItem(row, "received"),
      ),
      pagination: buildPaginationMeta({ totalItems, page, limit }),
    };
  }

  if (!user.companyId) {
    return {
      items: [],
      pagination: buildPaginationMeta({ totalItems: 0, page, limit }),
    };
  }

  const sentWhere = {
    revokedAt: null,
    companyId: user.companyId,
    grantedByUserId: user.id,
    ...(search
      ? { plan: buildProjectTitleSearchFilter(search) }
      : {}),
  };

  const [rows, totalItems] = await Promise.all([
    prisma.projectPlanAccess.findMany({
      where: sentWhere,
      include: {
        user: { select: { id: true, username: true } },
        grantedBy: { select: { id: true, username: true } },
        plan: {
          include: {
            project: { select: { id: true, title: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.projectPlanAccess.count({ where: sentWhere }),
  ]);

  return {
    items: rows.map((row) => mapProjectPlanAccessRowToInboxItem(row, "sent")),
    pagination: buildPaginationMeta({ totalItems, page, limit }),
  };
};

module.exports = {
  listProjectPlanAccessInboxService,
};
