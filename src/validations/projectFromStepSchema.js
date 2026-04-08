// ✅ validation
const yup = require("yup");

const createProjectFromStepSchema = yup.object().shape({
  sessionId: yup
    .string()
    .uuid("فرمت شناسه معتبر نیست")
    .required("شناسه جلسه الزامی است"),

  title: yup
    .string()
    .trim()
    .required("عنوان پروژه الزامی است")
    .min(3, "عنوان باید حداقل ۳ کاراکتر باشد"),

  messages: yup
    .array()
    .of(
      yup.object().shape({
        role: yup
          .string()
          .oneOf(["user", "assistant"])
          .required("نوع پیام الزامی است"),
        content: yup.string().trim().required("متن پیام الزامی است"),
      }),
    )
    .min(1, "حداقل یک پیام باید وجود داشته باشد")
    .required("پیام‌ها الزامی است"),
});

exports.createProjectFromStepValidation = async (req, res, next) => {
  try {
    const validated = await createProjectFromStepSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
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
