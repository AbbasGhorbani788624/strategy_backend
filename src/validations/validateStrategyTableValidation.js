const yup = require("yup");

const schema = yup.object().shape({
  editedTable: yup
    .mixed()
    .test(
      "is-object-or-array",
      "editedTable باید یک آبجکت یا آرایه معتبر باشد",
      (value) => value !== null && value !== undefined && typeof value === "object",
    )
    .required("editedTable الزامی است"),
});

exports.validateStrategyTableSchema = async (req, res, next) => {
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
