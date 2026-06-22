const express = require("express");
const auth = require("../middleware/auth");
const {
  getComments,
  createComment,
  deleteComment,
} = require("../controllers/commentController");
const router = express.Router();

router.get("/", auth, getComments);

router.post("/:projectId", auth, createComment);

router.delete("/:commentId", auth, deleteComment);

module.exports = router;
