const yup = require("yup");

const schema = yup
  .object()
  .shape({
    userId: yup
      .string()
      .uuid("شناسه کاربر معتبر نیست")
      .required("شناسه کاربر الزامی است"),

    username: yup.string().min(3, "یوزرنیم حداقل 3 کاراکتر باشد").optional(),

    oldPassword: yup
      .string()
      .min(3, "پسورد قبلی حداقل 3 کاراکتر باشد")
      .optional(),

    newPassword: yup
      .string()
      .min(3, "پسورد جدید حداقل 3 کاراکتر باشد")
      .optional()
      .test(
        "not-same-as-old",
        "پسورد جدید نمی‌تواند مشابه پسورد قبلی باشد",
        function (value) {
          const oldPassword = this.parent.oldPassword;

          if (!value || !oldPassword) return true;

          return value !== oldPassword;
        },
      ),
  })
  .test(
    "at-least-one-field",
    "حداقل نام کاربری یا پسورد جدید را وارد کنید",
    function (value) {
      if (!value.username && !value.newPassword) {
        return this.createError({
          path: "username",
          message: "حداقل نام کاربری یا پسورد جدید را وارد کنید",
        });
      }

      return true;
    },
  )
  .test("old-password-required", "پسورد قبلی الزامی است", function (value) {
    if ((value.username || value.newPassword) && !value.oldPassword) {
      return this.createError({
        path: "oldPassword",
        message: "پسورد قبلی الزامی است",
      });
    }

    return true;
  });

exports.changeCredentialSchema = async (req, res, next) => {
  try {
    await schema.validate(req.body, {
      abortEarly: false,
    });

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
