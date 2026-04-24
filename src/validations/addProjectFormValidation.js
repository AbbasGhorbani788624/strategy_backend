const yup = require("yup");

const chatMessageSchema = yup.object().shape({
  role: yup
    .string()
    .oneOf(["user", "assistant"], "نوع پیام معتبر نیست")
    .required("نوع پیام الزامی است"),
  content: yup.string().trim().required("متن پیام الزامی است"),
});

const createProjectSchema = yup.object().shape({
  title: yup.string().trim().required("عنوان پروژه الزامی است"),

  formId: yup
    .string()
    .uuid("فرمت شناسه معتبر نیست")
    .required("شناسه فرم الزامی است"),

  analysis: yup.string().trim().required("تحلیل الزامی است"),

  mode: yup
    .string()
    .oneOf(["SINGLE", "STEP"], "حالت پروژه معتبر نیست")
    .required("حالت پروژه الزامی است"),

  messages: yup
    .array()
    .of(chatMessageSchema)
    .min(1, "حداقل یک پیام باید وجود داشته باشد")
    .optional(),
});

exports.createProjectValidation = async (req, res, next) => {
  try {
    const validated = await createProjectSchema.validate(req.body, {
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
