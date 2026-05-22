const yup = require("yup");

const schema = yup.object().shape({
  title: yup
    .string()
    .required("title الزامی است")
    .min(3, "title باید حداقل 3 کاراکتر باشد"),

  requiredForms: yup
    .array()
    .of(
      yup.object().shape({
        formId: yup.string().required("formId الزامی است"),

        order: yup
          .number()
          .required("order الزامی است")
          .integer("order باید عدد صحیح باشد")
          .min(1, "order باید حداقل 1 باشد"),
      }),
    )
    .required("requiredForms الزامی است")
    .min(1, "حداقل یک آیتم در requiredForms لازم است"),

  prompts: yup
    .array()
    .of(
      yup.object().shape({
        content: yup
          .string()
          .required("content الزامی است")
          .min(3, "content باید حداقل 3 کاراکتر باشد"),
      }),
    )
    .required("prompts الزامی است")
    .min(1, "حداقل یک آیتم در prompts لازم است"),

  goals: yup
    .array()
    .of(
      yup.object().shape({
        title: yup
          .string()
          .required("title در goals الزامی است")
          .min(3, "title در goals باید حداقل 3 کاراکتر باشد"),
      }),
    )
    .required("goals الزامی است")
    .min(1, "حداقل یک goal لازم است"),
});

exports.createMultiAnalysisFormValidationSchema = async (req, res, next) => {
  try {
    await schema.validate(req.body, { abortEarly: false });
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
