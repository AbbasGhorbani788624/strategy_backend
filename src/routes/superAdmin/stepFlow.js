const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const { roleGuard } = require("../../middleware/roleGuard");
const {
  createStepFlow,
  updateStepFlow,
  deleteStepFlow,
  getAllStepFlows,
} = require("../../controllers/stepFlowController");
const { stepFlowSchema } = require("../../validations/stepFlowVaidation");

router.get("/", auth, roleGuard(["SUPER_ADMIN"]), getAllStepFlows);

//ساخت ترتیب مراحل فرم های مرحله ای
router.post(
  "/create",
  auth,
  roleGuard(["SUPER_ADMIN"]),
  stepFlowSchema,
  createStepFlow,
);

//ویرایش
router.put(
  "/edit/:id",
  auth,
  roleGuard(["SUPER_ADMIN"]),
  stepFlowSchema,
  updateStepFlow,
);

//جذف
router.delete("/delete/:id", auth, roleGuard(["SUPER_ADMIN"]), deleteStepFlow);

module.exports = router;
