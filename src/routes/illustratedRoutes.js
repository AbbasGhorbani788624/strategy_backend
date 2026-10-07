const express = require("express");
const auth = require("../middleware/auth");
const {
  addIllustrated,
  removeIllustrated,
  getIllustrated,
} = require("../controllers/illustratedController");

const router = express.Router();

router.post("/:id", auth, addIllustrated);

router.delete("/:id", auth, removeIllustrated);

router.get("/", auth, getIllustrated);

module.exports = router;
