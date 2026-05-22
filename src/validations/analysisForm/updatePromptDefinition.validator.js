const yup = require("yup");

const schema = yup.object().shape({
  title: yup.string().trim().nullable().notRequired(),

  description: yup.string().trim().nullable().notRequired(),

  segments: yup
    .array()
    .of(
      yup.object().shape({
        key: yup
          .string()
          .trim()
          .required("key برای segment الزامی است")
          .matches(
            /^[a-zA-Z0-9_]+$/,
            "key فقط می‌تواند شامل حروف انگلیسی، عدد و underscore باشد",
          ),

        label: yup.string().trim().required("label برای segment الزامی است"),

        description: yup.string().trim().nullable().notRequired(),

        order: yup
          .number()
          .typeError("order segment باید عدد باشد")
          .integer("order segment باید عدد صحیح باشد")
          .min(0, "order segment نمی‌تواند منفی باشد")
          .notRequired(),

        isRequired: yup.boolean().notRequired(),
      }),
    )
    .min(1, "حداقل یک segment الزامی است")
    .required("segments الزامی است")
    .test(
      "unique-segment-keys",
      "keyهای segmentها نباید تکراری باشند",
      function (segments) {
        if (!segments) return true;
        const keys = segments.map((item) => item.key);
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
