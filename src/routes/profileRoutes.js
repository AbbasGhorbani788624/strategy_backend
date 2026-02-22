const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { updateProfile } = require("../controllers/profileController");
const { profileSchema } = require("../validations/profileValidation");

//اپدیت پروفایل
router.put("/", auth, profileSchema, updateProfile);

module.exports = router;
