const parseListQuery = (query = {}, { defaultLimit = 10, maxLimit = 50 } = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(
    Math.max(parseInt(query.limit, 10) || defaultLimit, 1),
    maxLimit,
  );
  const skip = (page - 1) * limit;
  const search = String(query.search || query.q || "").trim() || undefined;

  return { page, limit, skip, search };
};

const buildPaginationMeta = ({ totalItems, page, limit }) => ({
  totalItems,
  currentPage: page,
  totalPages: totalItems > 0 ? Math.ceil(totalItems / limit) : 0,
  limit,
});

const buildProjectTitleSearchFilter = (search) => {
  if (!search) {
    return {};
  }

  return {
    project: {
      title: {
        contains: search,
      },
    },
  };
};

module.exports = {
  parseListQuery,
  buildPaginationMeta,
  buildProjectTitleSearchFilter,
};
