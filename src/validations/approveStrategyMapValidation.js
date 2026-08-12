const yup = require("yup");

const schema = yup.object().shape({
  approvedMap: yup
    .mixed()
    .test(
      "is-object-or-array",
      "approvedMap باید یک آبجکت یا آرایه معتبر باشد",
      (value) => value !== null && value !== undefined && typeof value === "object",
    )
    .required("approvedMap الزامی است"),
});

exports.approveStrategyMapSchema = async (req, res, next) => {
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
