const yup = require("yup");

const startStepSessionSchema = yup.object().shape({
  flowId: yup
    .string()
    .uuid("فرمت شناسه معتبر نیست")
    .required("شناسه مسیر مرحله‌ای الزامی است"),
});

exports.analyzeStepValidation = async (req, res, next) => {
  try {
    const validated = await startStepSessionSchema.validate(req.body, {
      abortEarly: false,
    });
    req.body = validated;
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
