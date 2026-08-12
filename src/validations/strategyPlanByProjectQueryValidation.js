const yup = require("yup");

const schema = yup.object().shape({
  framework: yup
    .string()
    .oneOf(["BSC", "OKR"], "framework فقط می‌تواند BSC یا OKR باشد")
    .required("framework الزامی است"),
});

exports.strategyPlanByProjectQuerySchema = async (req, res, next) => {
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
