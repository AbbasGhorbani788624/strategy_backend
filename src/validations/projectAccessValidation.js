const yup = require("yup");

const colleagueEntrySchema = yup.object().shape({
  userId: yup.string().uuid().required(),
  canView: yup.boolean(),
  canAction: yup.boolean(),
  canVisualize: yup.boolean(),
  permission: yup.string().oneOf(["VIEW", "EDIT"]),
});

const schema = yup.object().shape({
  colleagueIds: yup.array().of(yup.string().uuid()),
  colleagues: yup.array().of(colleagueEntrySchema),
});

exports.projectAccessSchema = async (req, res, next) => {
  try {
    await schema.validate(req.body, { abortEarly: false });
    const hasColleagues = req.body.colleagues !== undefined;
    const hasIds = req.body.colleagueIds !== undefined;
    if (!hasColleagues && !hasIds) {
      return res.status(400).json({
        errors: [
          {
            field: "colleagues",
            message: "colleagues or colleagueIds is required",
          },
        ],
      });
    }
    if (hasColleagues && hasIds) {
      return res.status(400).json({
        errors: [
          {
            field: "colleagues",
            message: "Send either colleagues or colleagueIds, not both",
          },
        ],
      });
    }
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
