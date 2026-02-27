const yup = require("yup");

// ساختار انتظار برای body
const schema = yup.object().shape({
  formId: yup
    .string()
    .uuid("formId باید یک UUID معتبر باشد")
    .required("formId الزامی است"),
  answers: yup
    .object()
    .required("answers الزامی است")
    .test(
      "is-not-empty",
      "answers نباید خالی باشد",
      (val) => val && Object.keys(val).length > 0,
    ),
});

exports.validateFormSubmission = async (req, res, next) => {
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
