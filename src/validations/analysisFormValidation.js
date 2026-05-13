const yup = require("yup");

const promptSchema = yup.object().shape({
  content: yup.string().trim().required("متن پرامپت الزامی است"),
});

const goalSchema = yup.object().shape({
  title: yup.string().trim().required("عنوان هدف الزامی است"),
});

const questionSchema = yup.object().shape({
  label: yup.string().trim().required("متن سوال الزامی است"),
  type: yup
    .string()
    .oneOf(["CHECKBOX", "RADIO", "DROPDOWN"], "نوع سوال معتبر نیست")
    .required("نوع سوال الزامی است"),

  options: yup.mixed().when("type", {
    is: (val) => ["CHECKBOX", "RADIO", "DROPDOWN"].includes(val),
    then: () =>
      yup
        .array()
        .of(yup.string().trim().required())
        .min(1, "برای این نوع سوال باید حداقل یک گزینه وارد شود")
        .required("گزینه‌ها الزامی هستند"),
    otherwise: () => yup.mixed().nullable().notRequired(),
  }),

  required: yup.boolean().optional(),

  order: yup
    .number()
    .typeError("ترتیب باید عدد باشد")
    .integer("ترتیب باید عدد صحیح باشد")
    .required("ترتیب سوال الزامی است"),
});

const schema = yup.object().shape({
  title: yup.string().trim().required("عنوان فرم الزامی است"),

  info: yup.string().trim().nullable(),

  order: yup
    .number()
    .typeError("ترتیب فرم باید عدد باشد")
    .integer("ترتیب فرم باید عدد صحیح باشد")
    .nullable(),

  isActive: yup.boolean().optional(),

  prompts: yup
    .array()
    .of(promptSchema)
    .min(1, "حداقل یک پرامپت باید اضافه شود")
    .required("لیست پرامپت‌ها الزامی است"),

  goals: yup
    .array()
    .of(goalSchema)
    .min(1, "حداقل یک هدف باید اضافه شود")
    .required("لیست اهداف الزامی است"),

  questions: yup.array().of(questionSchema).optional().default([]),
});
exports.analysisFormSchema = async (req, res, next) => {
  try {
    const validated = await schema.validate(req.body, {
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
