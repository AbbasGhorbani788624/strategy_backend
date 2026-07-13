const yup = require("yup");

const schema = yup.object().shape({
  projectId: yup
    .string()
    .uuid("ایدی پروژه معتبر نیست")
    .required("ایدی پروژه الزامی است"),

  answers: yup.object().required("answers الزامی است"),
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
