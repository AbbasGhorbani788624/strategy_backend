const yup = require("yup");

const createActionSchema = yup.object().shape({
  title: yup.string().trim().required("عنوان اقدام الزامی است"),
  description: yup.string().trim().nullable().optional(),
  startDate: yup
    .date()
    .typeError("تاریخ شروع معتبر نیست")
    .nullable()
    .optional(),
  endDate: yup
    .date()
    .typeError("تاریخ پایان معتبر نیست")
    .nullable()
    .optional(),
  executorId: yup.string().uuid("شناسه مجری معتبر نیست").nullable().optional(),
  order: yup.number().integer("ترتیب باید عدد صحیح باشد").min(1).optional(),
  prerequisiteActionId: yup
    .string()
    .uuid("شناسه پیش‌نیاز معتبر نیست")
    .nullable()
    .optional(),
});

const updateActionSchema = yup.object().shape({
  title: yup.string().trim().optional(),
  description: yup.string().trim().nullable().optional(),
  startDate: yup
    .date()
    .typeError("تاریخ شروع معتبر نیست")
    .nullable()
    .optional(),
  endDate: yup
    .date()
    .typeError("تاریخ پایان معتبر نیست")
    .nullable()
    .optional(),
  executorId: yup.string().uuid("شناسه مجری معتبر نیست").nullable().optional(),
  order: yup.number().integer("ترتیب باید عدد صحیح باشد").min(1).optional(),
  prerequisiteActionId: yup
    .string()
    .uuid("شناسه پیش‌نیاز معتبر نیست")
    .nullable()
    .optional(),
});

const updateProgressSchema = yup.object().shape({
  progress: yup
    .number()
    .integer("پیشرفت باید عدد صحیح باشد")
    .min(0, "پیشرفت نمی‌تواند کمتر از ۰ باشد")
    .max(100, "پیشرفت نمی‌تواند بیشتر از ۱۰۰ باشد")
    .required("پیشرفت الزامی است"),
});

const bulkUpdateActionCompletionsSchema = yup.object().shape({
  actions: yup
    .array()
    .of(
      yup.object().shape({
        actionId: yup
          .string()
          .uuid("شناسه اقدام معتبر نیست")
          .required("شناسه اقدام الزامی است"),
        description: yup.string().trim().nullable().optional(),
        previouslyCompleted: yup.boolean().optional(),
      }),
    )
    .min(1, "حداقل یک اقدام برای به‌روزرسانی لازم است")
    .required("لیست اقدامات الزامی است"),
});

const listPlansQuerySchema = yup.object().shape({
  page: yup.number().integer().min(1).optional(),
  limit: yup.number().integer().min(1).max(50).optional(),
  search: yup.string().trim().optional(),
  status: yup
    .string()
    .oneOf(["DRAFT", "LOCKED", "IN_PROGRESS", "COMPLETED"])
    .optional(),
  executorId: yup.string().uuid("شناسه مجری معتبر نیست").optional(),
  scheduleStatus: yup
    .string()
    .oneOf(["ON_TRACK", "AT_RISK", "DELAYED"])
    .optional(),
  startDate: yup.date().typeError("تاریخ شروع فیلتر معتبر نیست").optional(),
  endDate: yup.date().typeError("تاریخ پایان فیلتر معتبر نیست").optional(),
});

const validateWithSchema = (schema, source = "body") => {
  return async (req, res, next) => {
    try {
      const data = source === "query" ? req.query : req.body;
      await schema.validate(data, { abortEarly: false });
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
};

exports.createActionSchema = validateWithSchema(createActionSchema);
exports.updateActionSchema = validateWithSchema(updateActionSchema);
exports.updateProgressSchema = validateWithSchema(updateProgressSchema);
exports.bulkUpdateActionCompletionsSchema = validateWithSchema(
  bulkUpdateActionCompletionsSchema,
);
// backward compatible alias
exports.bulkUpdateActionDescriptionsSchema =
  exports.bulkUpdateActionCompletionsSchema;
exports.listPlansQuerySchema = validateWithSchema(listPlansQuerySchema, "query");
