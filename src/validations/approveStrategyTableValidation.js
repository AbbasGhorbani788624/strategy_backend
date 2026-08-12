const yup = require("yup");

const schema = yup.object().shape({
  approvedTable: yup
    .mixed()
    .test(
      "is-object-or-array",
      "approvedTable باید یک آبجکت یا آرایه معتبر باشد",
      (value) => value !== null && value !== undefined && typeof value === "object",
    )
    .required("approvedTable الزامی است"),
});

exports.approveStrategyTableSchema = async (req, res, next) => {
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
