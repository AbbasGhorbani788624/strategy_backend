const express = require("express");
const auth = require("../middleware/auth");
const {
  addBookmark,
  removeBookmark,
  getBookmarks,
} = require("../controllers/bookmarkController");

const router = express.Router();

router.post("/:id", auth, addBookmark);

router.delete("/:id", auth, removeBookmark);

router.get("/", auth, getBookmarks);

module.exports = router;
