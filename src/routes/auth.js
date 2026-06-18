const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { roleGuard } = require("../middleware/roleGuard");
const {
  login,
  getMe,
  refresh,
  logout,
  changePassword,
  changeCredentials,
} = require("../controllers/authController");
const { loginSchema } = require("../validations/loginValidation");
const {
  changePasswordSchema,
} = require("../validations/changePasswordValidation");
const {
  changeCredentialSchema,
} = require("../validations/changeCredentialsValidations");

router.post("/login", loginSchema, login);

router.get("/me", auth, getMe);

router.post("/refresh", refresh);

router.post("/logout", logout);

router.put("/changepassword", auth, changePasswordSchema, changePassword);

router.patch(
  "/change-credentials",
  auth,
  changeCredentialSchema,
  changeCredentials,
);

module.exports = router;
