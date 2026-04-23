const yup = require("yup");

const schema = yup.object().shape({
  name: yup
    .string()
    .required("نام شرکت الزامی است")
    .min(4, "نام شرکت حداقل باید 4 کاراکتر باشد"),
  industry: yup.string().optional(),
  userLimit: yup
    .number("تعداد کاربران باید یک عدد باشد")
    .required("حداقل یک عضو باید باشد")
    .min(1, "حداقل یک عضو باید باشد"),
  username: yup
    .string()
    .required("یوزرنیم الزامی است")
    .min(3, "یوزرنیم باید حداقل ۳ کاراکتر باشد"),
  password: yup
    .string()
    .required("پسورد الزامی است")
    .min(6, "پسورد باید حداقل ۶ کاراکتر باشد"),
});

exports.createCompanySchema = async (req, res, next) => {
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
