const yup = require("yup");

const numberFromQuery = () =>
  yup
    .number()
    .transform((value, originalValue) => {
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

const baseSchema = yup.object().shape({
  page: numberFromQuery().integer().min(1).optional(),
  limit: numberFromQuery().integer().min(1).max(50).optional(),
  search: yup.string().trim().max(200).optional(),
  q: yup.string().trim().max(200).optional(),
  framework: yup
    .string()
    .oneOf(["BSC", "OKR"], "framework فقط می‌تواند BSC یا OKR باشد")
    .optional(),
});

const approvedSchema = baseSchema.shape({
  state: yup
    .string()
    .oneOf(
      ["READY_FOR_MONITORING", "MONITORING"],
      "state فقط می‌تواند READY_FOR_MONITORING یا MONITORING باشد",
    )
    .optional(),
});

const measuresSchema = yup.object().shape({
  page: numberFromQuery().integer().min(1).optional(),
  limit: numberFromQuery().integer().min(1).max(100).optional(),
  search: yup.string().trim().max(200).optional(),
  q: yup.string().trim().max(200).optional(),
  monitoringStatus: yup
    .string()
    .oneOf(["DRAFT", "LOCKED"], "monitoringStatus فقط DRAFT یا LOCKED است")
    .optional(),
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

exports.strategyPlanListQuerySchema = validateQuery(baseSchema);
exports.strategyPlanApprovedListQuerySchema = validateQuery(approvedSchema);
exports.strategyPlanMeasuresListQuerySchema = validateQuery(measuresSchema);
