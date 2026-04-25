const yup = require("yup");

const schema = yup.object().shape({
  score: yup
    .number()
    .min(1, "امتیاز باید عددی بین 1 تا 5 باشد")
    .max(5, "امتیاز باید عددی بین 1 تا 5 باشد")
    .required("امتیاز الزامی است"),
  comment: yup.string().min(2, "حداقل 2 کاراکتر باشد").optional(""),
});

exports.rateCommentSchema = async (req, res, next) => {
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
