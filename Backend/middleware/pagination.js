function parsePagination(req) {
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "20", 10)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function paginate(query, options = {}) {
  return async (req, res, next) => {
    try {
      const { page, limit, skip } = parsePagination(req);
      const { Model, sort = { createdAt: -1 }, select, populate, lean = true } = options;

      const cursor = Model.find(query);
      if (sort) cursor.sort(sort);
      if (select) cursor.select(select);
      if (populate) cursor.populate(populate);
      if (lean) cursor.lean();

      const total = await Model.countDocuments(query);
      cursor.skip(skip).limit(limit);

      const results = await cursor;

      res.json({
        data: results,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      next(error);
    }
  };
}

export { parsePagination, paginate };
