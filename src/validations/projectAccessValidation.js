const yup = require("yup");

const schema = yup.object().shape({
  colleagueIds: yup
    .array()
    .of(yup.string().uuid())
    .min(1, "حداقل یک همکار را انتخاب کنید.")
    .required("لیست همکاران الزامی است."),
});

exports.projectAccessSchema = async (req, res, next) => {
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
