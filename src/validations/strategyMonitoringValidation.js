const yup = require("yup");

const planningSchema = yup
  .object()
  .shape({
  ownerId: yup.string().uuid("ownerId معتبر نیست").nullable().optional(),
  ownerName: yup
    .string()
    .trim()
    .max(255, "نام مسئول نمی‌تواند بیشتر از ۲۵۵ کاراکتر باشد")
    .nullable()
    .optional(),
  finalTarget: yup
    .number()
    .typeError("finalTarget باید عدد باشد")
    .required("finalTarget الزامی است"),
  periods: yup
    .array()
    .of(
      yup.object().shape({
        periodIndex: yup
          .number()
          .integer("periodIndex باید عدد صحیح باشد")
          .min(0, "periodIndex نمی‌تواند منفی باشد"),
        periodId: yup.string().uuid("periodId معتبر نیست"),
        targetValue: yup
          .number()
          .typeError("targetValue باید عدد باشد")
          .required("targetValue الزامی است"),
      })
        .test(
          "period-ref",
          "periodIndex یا periodId الزامی است",
          (value) =>
            (value?.periodIndex !== undefined && value?.periodIndex !== null) ||
            Boolean(value?.periodId),
        ),
    )
    .min(1, "حداقل یک period الزامی است")
    .required("periods الزامی است"),
})
  .test(
    "owner-ref",
    "ownerId یا ownerName الزامی است",
    (value) => {
      const hasOwnerId =
        value?.ownerId != null && String(value.ownerId).trim() !== "";
      const hasOwnerName =
        value?.ownerName != null && String(value.ownerName).trim() !== "";
      return hasOwnerId || hasOwnerName;
    },
  );

exports.updateMonitoringPlanningSchema = async (req, res, next) => {
  try {
    await planningSchema.validate(req.body, { abortEarly: false });
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

const measurementSchema = yup.object().shape({
  actualValue: yup
    .number()
    .typeError("actualValue باید عدد باشد")
    .required("actualValue الزامی است"),
});

exports.recordPeriodMeasurementSchema = async (req, res, next) => {
  try {
    await measurementSchema.validate(req.body, { abortEarly: false });
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
