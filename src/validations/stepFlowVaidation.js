const yup = require("yup");

// Schema برای StepFlow
const schema = yup.object().shape({
  title: yup
    .string()
    .required("عنوان فرم مرحله‌ای الزامی است")
    .min(3, "عنوان باید حداقل ۳ کاراکتر باشد")
    .max(255, "عنوان نمی‌تواند بیش از ۲۵۵ کاراکتر باشد"),
  isActive: yup.boolean().notRequired(),
  steps: yup
    .array()
    .of(
      yup.object().shape({
        formId: yup
          .string()
          .required("شناسه فرم الزامی است")
          .uuid("formId باید یک UUID معتبر باشد"),
        order: yup
          .number()
          .required("ترتیب مرحله الزامی است")
          .integer("ترتیب باید عدد صحیح باشد")
          .min(1, "ترتیب حداقل باید ۱ باشد"),
        required: yup.boolean().required("فیلد الزامی بودن مرحله مشخص شود"),
      }),
    )
    .min(1, "حداقل یک مرحله باید تعریف شود")
    .required("مراحل الزامی است"),
});

async function stepFlowSchema(req, res, next) {
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
}

module.exports = {
  stepFlowSchema,
};
