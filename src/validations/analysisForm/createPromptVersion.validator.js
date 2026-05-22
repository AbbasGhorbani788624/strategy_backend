const yup = require("yup");

const schema = yup.object().shape({
  versionKey: yup.string().trim().nullable().notRequired(),

  status: yup
    .string()
    .oneOf(
      ["DRAFT", "PUBLISHED"],
      "status فقط می‌تواند DRAFT یا PUBLISHED باشد",
    )
    .notRequired(),

  segmentValues: yup
    .array()
    .of(
      yup.object().shape({
        segmentKey: yup.string().trim().required("segmentKey الزامی است"),

        content: yup
          .string()
          .trim()
          .required("content برای segment الزامی است"),
      }),
    )
    .min(1, "حداقل یک segmentValue الزامی است")
    .required("segmentValues الزامی است")
    .test(
      "unique-segment-keys",
      "segmentKeyها نباید تکراری باشند",
      function (segmentValues) {
        if (!segmentValues) return true;
        const keys = segmentValues.map((item) => item.segmentKey);
        return keys.length === new Set(keys).size;
      },
    ),
});

module.exports = async (req, res, next) => {
  try {
    await schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

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
