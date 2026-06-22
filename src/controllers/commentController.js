const {
  getCommentsService,
  createCommentService,
  deleteCommentService,
} = require("../services/commentService");

exports.getComments = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const { page = 1, limit = 10 } = req.query;

    const result = await getCommentsService(
      projectId,
      req.user.id,
      Number(page),
      Number(limit),
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.createComment = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const { content } = req.body;

    const comment = await createCommentService(projectId, req.user.id, content);

    res.status(201).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;

    const result = await deleteCommentService(commentId, req.user.id);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
