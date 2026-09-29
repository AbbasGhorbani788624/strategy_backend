const express = require("express");
const auth = require("../middleware/auth");
const {
  listFormDelegationInbox,
  getFormDelegationInboxItem,
} = require("../controllers/formCollaborationController");

const router = express.Router();

router.get("/form-delegations", auth, listFormDelegationInbox);
router.get("/form-delegations/:delegationId", auth, getFormDelegationInboxItem);

module.exports = router;
