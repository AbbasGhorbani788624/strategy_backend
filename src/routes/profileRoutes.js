const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  updateProfile,
  deleteRecord,
  overViewProfile,
} = require("../controllers/profileController");

//;کاربر پروفایل
router.patch("/", auth, updateProfile);

//حذف رکورد از پروفایل
router.delete("/", auth, deleteRecord);

//دریافت پروفایل
router.get("/overview", auth, overViewProfile);

module.exports = router;
