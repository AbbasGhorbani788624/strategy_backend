const yup = require("yup");

const schema = yup.object().shape({
  editedMap: yup
    .mixed()
    .test(
      "is-object-or-array",
      "editedMap باید یک آبجکت یا آرایه معتبر باشد",
      (value) => value !== null && value !== undefined && typeof value === "object",
    )
    .required("editedMap الزامی است"),
});

exports.validateStrategyMapSchema = async (req, res, next) => {
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
