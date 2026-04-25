const yup = require("yup");

const questionSchema = yup.object().shape({
  label: yup.string().trim().required("متن سوال الزامی است"),

  type: yup
    .string()
    .oneOf(
      ["checkbox", "radio", "dropdown", "short", "long"],
      "نوع سوال معتبر نیست",
    )
    .required("نوع سوال الزامی است"),

  options: yup
    .array()
    .of(yup.string().trim())
    .when("type", {
      is: (val) => ["checkbox", "radio", "dropdown"].includes(val),
      then: (schema) =>
        schema
          .min(1, "برای این نوع سوال باید حداقل یک گزینه وارد شود")
          .required("گزینه‌ها الزامی هستند"),
      otherwise: (schema) => schema.notRequired().nullable(),
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

  promptTemplate: yup.string().trim().required("قالب پرامپت الزامی است"),

  order: yup
    .number()
    .typeError("ترتیب فرم باید عدد باشد")
    .integer("ترتیب فرم باید عدد صحیح باشد")
    .nullable(),

  isActive: yup.boolean().optional(),

  questions: yup
    .array()
    .of(questionSchema)
    .min(1, "حداقل یک سوال باید اضافه شود")
    .required("لیست سوالات الزامی است"),
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
