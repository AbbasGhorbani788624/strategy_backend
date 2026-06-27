const {
  addBookmarkService,
  removeBookmarkService,
  getBookmarksService,
} = require("../services/bookmarkService");
const { successResponse } = require("../utils/responses");

exports.addBookmark = async (req, res, next) => {
  try {
    const bookmark = await addBookmarkservice(
      req.user.id,
      req.params.projectId,
    );

    return successResponse(res, 201, bookmark);
  } catch (error) {
    next(error);
  }
};

exports.removeBookmark = async (req, res, next) => {
  try {
    await removeBookmarkService(req.user.id, req.params.projectId);

    return successResponse(res, 200, {
      message: "پروژ با موفقیت از بوکمارک حذف شد",
    });
  } catch (error) {
    next(error);
  }
};

exports.getBookmarks = async (req, res, next) => {
  try {
    const result = await getBookmarksService(req.user.id, req.query);

    return successResponse(res, 200, result);
  } catch (error) {
    next(error);
  }
};
