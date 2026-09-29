const express = require("express");
const auth = require("../middleware/auth");
const {
  openFormCollaboration,
  getFormCollaboration,
  submitMyCollaborationResponse,
  createDelegations,
  getAggregatePreview,
  applyAggregatedForm,
  prepareReadOnlyDelegationSnapshot,
} = require("../controllers/formCollaborationController");

const router = express.Router({ mergeParams: true });

router.post("/", auth, openFormCollaboration);
router.get("/", auth, getFormCollaboration);
router.put("/responses/me", auth, submitMyCollaborationResponse);
router.post("/delegations", auth, createDelegations);
router.get("/read-only-snapshot", auth, prepareReadOnlyDelegationSnapshot);
router.get("/aggregate-preview", auth, getAggregatePreview);
router.post("/apply-aggregated", auth, applyAggregatedForm);

module.exports = router;
