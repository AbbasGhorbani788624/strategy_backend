const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  login,
  getMe,
  refresh,
  logout,
  changePassword,
} = require("../controllers/authController");
const { loginSchema } = require("../validations/loginValidation");
const {
  changePasswordSchema,
} = require("../validations/changePasswordValidation");

router.post("/login", loginSchema, login);

router.get("/me", auth, getMe);

router.post("/refresh", refresh);

router.post("/logout", logout);

router.put("/changepassword", auth, changePasswordSchema, changePassword);

module.exports = router;
