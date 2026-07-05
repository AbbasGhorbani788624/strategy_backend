const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { roleGuard } = require("../middleware/roleGuard");
const {
  syncCompanyInsightController,
  getCompanyInsightController,
} = require("../controllers/insightController");

router.post(
  "/sync",
  auth,
  roleGuard(["SUPER_ADMIN"]),
  syncCompanyInsightController,
);

router.get("/", auth, getCompanyInsightController);

module.exports = router;
