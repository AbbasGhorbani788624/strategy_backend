const yup = require("yup");

const schema = yup.object().shape({});

exports.companyAdminSchema = async (req, res, next) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        errors: [
          { field: "body", message: "بدنه درخواست نمی‌تواند خالی باشد" },
        ],
      });
    }

    await schema.validate(req.body, { abortEarly: false });

    next();
  } catch (err) {
    return res.status(400).json({
      errors: err.inner?.length
        ? err.inner.map((e) => ({
            field: e.path,
            message: e.message,
          }))
        : [{ field: "body", message: err.message }],
    });
  }
};
