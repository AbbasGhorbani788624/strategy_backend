const yup = require("yup");

const schema = yup.object().shape({
  full_name: yup.string().required("نام و نام خانوادگی الزامی است"),
  email: yup
    .string()
    .email("فرمت ایمیل صحیح نیست")
    .required("ایمیل الزامی است"),
  phone: yup
    .string()
    .required("شماره موبایل الزامی است")
    .matches(/^09\d{9}$/, "فرمت شماره موبایل باید 09xxxxxxxxx باشد"),

  userId: yup.string().optional(),
  username: yup.string().min(3, "یوزرنیم معتبر نیست").notRequired(), // اختیاری ولی اگر فرستاده شد min 3 رعایت می‌شود

  password: yup.string().min(6, "پسورد حداقل ۶ کاراکتر باشد").notRequired(), // اختیاری ولی اگر فرستاده شد حداقل 6 کاراکتر رعایت می‌شود
});

exports.profileSchema = async (req, res, next) => {
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
