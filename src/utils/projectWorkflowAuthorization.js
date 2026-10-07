const { createBadRequestError } = require("./index");
const { resolveProjectAccess } = require("../services/projectAccessService");

/** Workflow actions tied to the analysis pipeline (not form collaboration admin). */
const PROJECT_WORKFLOW_ACTION = {
  SUBMIT_FORM: "SUBMIT_FORM",
  CONVERSATION_STEP: "CONVERSATION_STEP",
  READ_ANALYSIS_STATUS: "READ_ANALYSIS_STATUS",
};

const STATUS_ALLOWS_SUBMIT_FORM = new Set(["WAITING_FOR_FORM"]);

/**
 * Statuses where CONVERSATION_STEP may mutate project state (owner or EDIT).
 * Matches handleConversationStepService switch cases.
 */
const STATUS_ALLOWS_CONVERSATION_MUTATION = new Set([
  "ANALYSIS_PENDING",
  "REVIEWING",
  "AI_PROCESSING",
]);

const isConversationReadOnlyStatus = (status) => status === "FINAL_ANALYSIS";

const workflowRequiresEditPermission = (action, projectStatus) => {
  if (action === PROJECT_WORKFLOW_ACTION.READ_ANALYSIS_STATUS) {
    return false;
  }

  if (action === PROJECT_WORKFLOW_ACTION.SUBMIT_FORM) {
    return true;
  }

  if (action === PROJECT_WORKFLOW_ACTION.CONVERSATION_STEP) {
    if (isConversationReadOnlyStatus(projectStatus)) {
      return false;
    }
    return STATUS_ALLOWS_CONVERSATION_MUTATION.has(projectStatus);
  }

  return true;
};

const workflowStatusDeniedMessage = (action, projectStatus) => {
  if (action === PROJECT_WORKFLOW_ACTION.CONVERSATION_STEP) {
    if (projectStatus === "WAITING_FOR_FORM") {
      return "ابتدا فرم را ثبت کنید؛ تحلیل هنوز شروع نشده است.";
    }
    if (projectStatus === "FAILED") {
      return "تحلیل با خطا متوقف شده است. از «تلاش مجدد تحلیل» استفاده کنید.";
    }
    if (projectStatus === "ARCHIVED") {
      return "پروژه بایگانی شده و قابل ادامه تحلیل نیست.";
    }
  }

  if (action === PROJECT_WORKFLOW_ACTION.SUBMIT_FORM) {
    if (projectStatus !== "WAITING_FOR_FORM") {
      return "ثبت فرم فقط وقتی پروژه در مرحله تکمیل فرم است مجاز است.";
    }
  }

  return "این عملیات در وضعیت فعلی پروژه مجاز نیست.";
};

const isStatusAllowedForAction = (action, projectStatus) => {
  if (action === PROJECT_WORKFLOW_ACTION.READ_ANALYSIS_STATUS) {
    return true;
  }

  if (action === PROJECT_WORKFLOW_ACTION.SUBMIT_FORM) {
    return STATUS_ALLOWS_SUBMIT_FORM.has(projectStatus);
  }

  if (action === PROJECT_WORKFLOW_ACTION.CONVERSATION_STEP) {
    if (isConversationReadOnlyStatus(projectStatus)) {
      return true;
    }
    if (STATUS_ALLOWS_CONVERSATION_MUTATION.has(projectStatus)) {
      return true;
    }
    return false;
  }

  return false;
};

/**
 * @param {object} user - { id, role, companyId }
 * @param {string} projectId
 * @param {string} action - PROJECT_WORKFLOW_ACTION.*
 */
const assertProjectWorkflowAccess = async (user, projectId, action) => {
  const resolved = await resolveProjectAccess(user, projectId);

  if (!resolved.allowed) {
    if (resolved.reason === "NOT_FOUND") {
      createBadRequestError("پروژه یافت نشد", 404);
    }
    createBadRequestError("شما به این پروژه دسترسی ندارید", 403);
  }

  const { project, isOwner, capabilities } = resolved;
  const status = project.status;

  if (!isStatusAllowedForAction(action, status)) {
    createBadRequestError(workflowStatusDeniedMessage(action, status), 403);
  }

  const needsEdit = workflowRequiresEditPermission(action, status);

  if (needsEdit) {
    if (isOwner) {
      return resolved;
    }
    createBadRequestError(
      "فقط مالک پروژه می‌تواند مراحل تحلیل را پیش ببرد.",
      403,
    );
  }

  if (capabilities?.canView || isOwner) {
    return resolved;
  }

  createBadRequestError("شما به این پروژه دسترسی ندارید", 403);
};

module.exports = {
  PROJECT_WORKFLOW_ACTION,
  assertProjectWorkflowAccess,
  isStatusAllowedForAction,
  workflowRequiresEditPermission,
  workflowStatusDeniedMessage,
};
