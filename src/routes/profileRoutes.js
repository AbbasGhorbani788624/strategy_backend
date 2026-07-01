const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  create,
  update,
  remove,
  postUserInfo,
} = require("../controllers/profileController");
const { multerStorage } = require("../utils/fileMulterConfig");
const upload = multerStorage();

router.post("/user-info", auth, upload.any(), postUserInfo);

router.post("/:section", auth, upload.any(), create);

router.patch("/:section/:id", auth, upload.any(), update);

router.delete("/:section/:id", auth, remove);

module.exports = router;
