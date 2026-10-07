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

const inboxDirectionSchema = yup
  .string()
  .oneOf(["received", "sent"], "direction فقط می‌تواند received یا sent باشد")
  .optional();

const baseInboxQuerySchema = yup.object().shape({
  direction: inboxDirectionSchema,
  page: numberFromQuery().integer().min(1).optional(),
  limit: numberFromQuery().integer().min(1).max(50).optional(),
  search: yup.string().trim().max(200).optional(),
});

const formInboxQuerySchema = baseInboxQuerySchema.shape({
  mode: yup.string().oneOf(["FILL", "READ_ONLY"]).optional(),
  status: yup.string().optional(),
});

const validateQuery = (schema) => async (req, res, next) => {
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

exports.inboxDirectionQuerySchema = validateQuery(baseInboxQuerySchema);
exports.inboxFormQuerySchema = validateQuery(formInboxQuerySchema);

