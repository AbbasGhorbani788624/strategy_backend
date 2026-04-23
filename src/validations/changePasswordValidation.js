const yup = require("yup");

const schema = yup.object().shape({
  oldPassword: yup
    .string()
    .min(6, "پسورد قبلی حداقل ۶ کاراکتر باشد")
    .required("پسورد قبلی الزامی است"),

  newPassword: yup
    .string()
    .min(6, "پسورد جدید حداقل ۶ کاراکتر باشد")
    .required("پسورد جدید الزامی است")
    .test(
      "not-same-as-old",
      "پسورد جدید نمی‌تواند مشابه پسورد قبلی باشد",
      function (value) {
        const oldPassword = this.parent.oldPassword;

        return value !== oldPassword;
      },
    ),
});

exports.changePasswordSchema = async (req, res, next) => {
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
