const yup = require("yup");

const allowedQuestionTypes = [
  "CHECKBOX",
  "RADIO",
  "DROPDOWN",
  "TEXT",
  "TEXTAREA",
  "NUMBER",
];

// trim امن برای string
const trimmedString = () =>
  yup
    .string()
    .transform((value, originalValue) =>
      typeof originalValue === "string" ? originalValue.trim() : originalValue,
    );

const questionSchema = yup
  .object({
    label: trimmedString().required("عنوان سوال الزامی است"),

    type: yup
      .string()
      .oneOf(allowedQuestionTypes, "نوع سوال معتبر نیست")
      .required("نوع سوال الزامی است"),

    options: yup
      .array()
      .of(trimmedString().required("مقدار گزینه نمی‌تواند خالی باشد"))
      .when("type", {
        is: (type) => ["CHECKBOX", "RADIO", "DROPDOWN"].includes(type),
        then: (schema) =>
          schema
            .min(1, "گزینه‌ها برای این نوع سوال الزامی است")
            .required("گزینه‌ها برای این نوع سوال الزامی است"),
        otherwise: (schema) => schema.notRequired().nullable(),
      }),

    required: yup.boolean().default(true),

    order: yup.number().integer().min(1).optional(),
  })
  .noUnknown(true, "فیلد غیرمجاز در سوال ارسال شده است");

const schema = yup
  .object({
    title: trimmedString().required("عنوان فرم الزامی است"),

    description: trimmedString().nullable().notRequired(),

    isActive: yup.boolean().default(true),

    order: yup.number().integer().min(1).default(1),

    questions: yup
      .array()
      .of(questionSchema)
      .min(1, "حداقل یک سوال برای فرم پیگیری الزامی است")
      .required("حداقل یک سوال برای فرم پیگیری الزامی است"),
  })
  .noUnknown(true, "فیلد غیرمجاز در فرم ارسال شده است");

exports.followupSchema = async (req, res, next) => {
  try {
    const validData = await schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    // نرمال‌سازی order و required برای سوال‌ها
    validData.questions = validData.questions.map((q, index) => ({
      ...q,
      label: q.label.trim(),
      options: q.options ?? null,
      required: typeof q.required === "boolean" ? q.required : true,
      order: Number.isInteger(q.order) ? q.order : index + 1,
    }));

    req.body = validData;
    next();
  } catch (err) {
    return res.status(400).json({
      errors: (err.inner?.length ? err.inner : [err]).map((e) => ({
        field: e.path,
        message: e.message,
      })),
    });
  }
};
