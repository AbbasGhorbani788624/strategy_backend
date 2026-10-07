const yup = require("yup");

const grantSchema = yup.object().shape({
  userId: yup.string().uuid("userId نامعتبر است").required("userId الزامی است"),
  permission: yup
    .string()
    .oneOf(["VIEW", "EDIT"], "permission فقط VIEW یا EDIT است")
    .optional()
    .default("EDIT"),
});

const patchSchema = yup.object().shape({
  permission: yup
    .string()
    .oneOf(["VIEW", "EDIT"], "permission فقط VIEW یا EDIT است")
    .required("permission الزامی است"),
});

const validateBody = (schema) => async (req, res, next) => {
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

exports.grantCollaboratorSchema = validateBody(grantSchema);
exports.patchCollaboratorSchema = validateBody(patchSchema);
