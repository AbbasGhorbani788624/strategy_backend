const yup = require("yup");

const schema = yup.object().shape({
  username: yup
    .string()
    .min(3, "یوزرنیم معتبر نیست")
    .required("یوزرنیم الزامی است"),
  password: yup
    .string()
    .min(6, "پسورد حداقل ۶ کاراکتر باشد")
    .required("پسورد الزامی است"),
});

exports.loginSchema = async (req, res, next) => {
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
