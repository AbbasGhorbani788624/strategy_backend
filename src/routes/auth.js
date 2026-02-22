const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  login,
  getMe,
  refresh,
  logout,
} = require("../controllers/authController");
const { loginSchema } = require("../validations/loginValidation");

router.post("/login", loginSchema, login);

router.get("/me", auth, getMe);

router.post("/refresh", refresh);

router.post("/logout", logout);

module.exports = router;
