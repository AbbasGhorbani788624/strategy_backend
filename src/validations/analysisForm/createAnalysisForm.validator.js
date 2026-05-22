const yup = require("yup");

const schema = yup.object().shape({
  title: yup
    .string()
    .trim()
    .required("عنوان فرم الزامی است")
    .min(2, "عنوان فرم باید حداقل 2 کاراکتر باشد")
    .max(255, "عنوان فرم نمی‌تواند بیشتر از 255 کاراکتر باشد"),

  info: yup.string().trim().nullable().notRequired(),

  order: yup
    .number()
    .typeError("order باید عدد باشد")
    .integer("order باید عدد صحیح باشد")
    .min(0, "order نمی‌تواند منفی باشد")
    .notRequired(),

  isActive: yup.boolean().notRequired(),

  questions: yup
    .array()
    .of(
      yup.object().shape({
        text: yup.string().trim().required("متن سوال الزامی است"),

        type: yup.string().trim().notRequired(),

        order: yup
          .number()
          .typeError("order سوال باید عدد باشد")
          .integer("order سوال باید عدد صحیح باشد")
          .min(0, "order سوال نمی‌تواند منفی باشد")
          .notRequired(),

        isRequired: yup.boolean().notRequired(),

        options: yup.mixed().nullable().notRequired(),
      }),
    )
    .notRequired(),

  goals: yup
    .array()
    .of(
      yup.object().shape({
        title: yup.string().trim().required("عنوان هدف الزامی است"),

        description: yup.string().trim().nullable().notRequired(),

        order: yup
          .number()
          .typeError("order هدف باید عدد باشد")
          .integer("order هدف باید عدد صحیح باشد")
          .min(0, "order هدف نمی‌تواند منفی باشد")
          .notRequired(),
      }),
    )
    .notRequired(),

  promptDefinition: yup
    .object()
    .shape({
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

            label: yup
              .string()
              .trim()
              .required("label برای segment الزامی است"),

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
        .min(1, "حداقل یک segment لازم است")
        .test(
          "unique-segment-keys",
          "keyهای segmentها نباید تکراری باشند",
          function (segments) {
            if (!segments) return true;
            const keys = segments.map((item) => item.key);
            return keys.length === new Set(keys).size;
          },
        )
        .notRequired(),
    })
    .nullable()
    .notRequired(),
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
