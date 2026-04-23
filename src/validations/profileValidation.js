const yup = require("yup");

const schema = yup.object().shape({
  fullName: yup.string().required("نام و نام خانوادگی الزامی است"),
  email: yup
    .string()
    .email("فرمت ایمیل صحیح نیست")
    .optional("ایمیل الزامی است"),
  phoneNumber: yup
    .string()
    .required("شماره موبایل الزامی است")
    .matches(/^09\d{9}$/, "فرمت شماره موبایل باید 09xxxxxxxxx باشد"),
  username: yup.string().min(3, "یوزرنیم معتبر نیست").notRequired(),
  userId: yup.string().optional(),
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
