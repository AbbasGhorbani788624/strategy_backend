const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { updateProfile } = require("../controllers/profileController");
const { profileSchema } = require("../validations/profileValidation");
const { multerStorage } = require("../utils/multerConfigs");
const upload = multerStorage();

//اپدیت پروفایل
router.put("/", auth, upload.single("avatar"), profileSchema, updateProfile);

module.exports = router;
