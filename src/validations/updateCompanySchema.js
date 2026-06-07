const yup = require("yup");

const schema = yup.object().shape({
  name: yup
    .string()
    .trim()
    .min(2, "نام شرکت باید حداقل 2 کاراکتر باشد")
    .required("نام شرکت الزامی است"),

  industry: yup
    .string()
    .trim()
    .min(2, "حوزه فعالیت معتبر نیست")
    .required("حوزه فعالیت الزامی است"),

  userLimit: yup
    .number()
    .typeError("محدودیت کاربران باید عدد باشد")
    .integer("محدودیت کاربران باید عدد صحیح باشد")
    .min(1, "محدودیت کاربران باید حداقل 1 باشد")
    .required("محدودیت کاربران الزامی است"),
});

exports.updateCompanySchema = async (req, res, next) => {
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
