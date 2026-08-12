const yup = require("yup");

const schema = yup.object().shape({
  projectId: yup
    .string()
    .uuid("شناسه پروژه معتبر نیست")
    .required("شناسه پروژه الزامی است"),
  framework: yup
    .string()
    .oneOf(["BSC", "OKR"], "framework فقط می‌تواند BSC یا OKR باشد")
    .required("framework الزامی است"),
});

exports.createStrategyPlanSchema = async (req, res, next) => {
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
