const yup = require("yup");

const numberFromQuery = () =>
  yup.number().transform((value, originalValue) => {
    if (
      originalValue === undefined ||
      originalValue === null ||
      originalValue === ""
    ) {
      return undefined;
    }
    const parsed = Number(originalValue);
    return Number.isNaN(parsed) ? value : parsed;
  });

const schema = yup.object().shape({
  section: yup
    .string()
    .oneOf(["kpi", "monitoring"], "section فقط می‌تواند kpi یا monitoring باشد")
    .optional(),
  page: numberFromQuery().integer().min(1).optional(),
  limit: numberFromQuery().integer().min(1).max(50).optional(),
  search: yup.string().trim().max(200).optional(),
  q: yup.string().trim().max(200).optional(),
});

exports.strategyPlanWorkspaceQuerySchema = async (req, res, next) => {
  try {
    await schema.validate(req.query, { abortEarly: false });
    next();
  } catch (err) {
    return res.status(400).json({
      errors: err.inner.map((e) => ({
        field: e.path,
        message: e.message,
      })),
    });
  }
};
