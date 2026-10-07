const prisma = require("../prismaClient");
const { isReadyForMonitoring } = require("../utils/strategyPlanResume");

const PROJECT_COLLABORATOR_ACTION = {
  FORM_SUBMITTED: "FORM_SUBMITTED",
  ASSUMPTIONS_CONFIRMED: "ASSUMPTIONS_CONFIRMED",
  ANALYSIS_STEP: "ANALYSIS_STEP",
  ILLUSTRATED_MARKED: "ILLUSTRATED_MARKED",
  ILLUSTRATED_REMOVED: "ILLUSTRATED_REMOVED",
};

const projectCollaboratorActionMessagePhrase = (action) => {
  const map = {
    [PROJECT_COLLABORATOR_ACTION.FORM_SUBMITTED]: "فرم همکاری را ثبت نهایی کرد",
    [PROJECT_COLLABORATOR_ACTION.ASSUMPTIONS_CONFIRMED]:
      "فرضیات تحلیل را تأیید کرد",
    [PROJECT_COLLABORATOR_ACTION.ANALYSIS_STEP]: "مرحله‌ای از تحلیل را انجام داد",
    [PROJECT_COLLABORATOR_ACTION.ILLUSTRATED_MARKED]:
      "پروژه را به فهرست مصورها اضافه کرد",
    [PROJECT_COLLABORATOR_ACTION.ILLUSTRATED_REMOVED]:
      "پروژه را از فهرست مصورها حذف کرد",
  };
  return map[action] || "در پروژه فعالیت انجام داد";
};

const planPermissionLabel = (permission) =>
  permission === "EDIT" ? "ویرایش" : "مشاهده";

const formDelegationModeLabel = (mode) =>
  mode === "FILL" ? "پر کردن" : "مشاهده";

const formatProjectAccessGrantLabels = (capabilities = {}) => {
  const parts = [];
  if (capabilities.canView) parts.push("مشاهده");
  if (capabilities.canAction) parts.push("اقدام");
  if (capabilities.canVisualize) parts.push("تصویب مصور");
  return parts.length ? parts.join("، ") : "مشاهده";
};

const buildProjectAccessGrantedPayload = ({
  userId,
  projectId,
  projectTitle,
  capabilities,
  grantedByUsername,
}) => ({
  userId,
  type: "PROJECT_ACCESS_GRANTED",
  title: "دسترسی به پروژه",
  message: `${grantedByUsername} به شما دسترسی «${formatProjectAccessGrantLabels(capabilities)}» در پروژه «${projectTitle}» داد.`,
  referenceId: projectId,
  referenceType: "PROJECT",
  metadata: {
    projectId,
    projectTitle,
    canView: Boolean(capabilities?.canView),
    canAction: Boolean(capabilities?.canAction),
    canVisualize: Boolean(capabilities?.canVisualize),
    grantedByUsername,
  },
  isRead: false,
});

const buildProjectCollaboratorActivityPayload = ({
  userId,
  projectId,
  projectTitle,
  actorUserId,
  actorUsername,
  action,
  projectStatus,
}) => ({
  userId,
  type: "PROJECT_COLLABORATOR_ACTIVITY",
  title: "به‌روزرسانی پروژه مشترک",
  message: `${actorUsername} در پروژه «${projectTitle}» ${projectCollaboratorActionMessagePhrase(action)}.`,
  referenceId: projectId,
  referenceType: "PROJECT",
  metadata: {
    projectId,
    projectTitle,
    actorUserId,
    actorUsername,
    action,
    ...(projectStatus ? { projectStatus } : {}),
  },
  isRead: false,
});

const buildProjectPlanAccessGrantedPayload = ({
  userId,
  plan,
  permission,
  granterUsername,
}) => {
  const projectTitle = plan.project?.title || "پروژه";
  const permissionLabel = planPermissionLabel(permission);

  return {
    userId,
    type: "PROJECT_PLAN_ACCESS_GRANTED",
    title: "دسترسی به اقدام پروژه",
    message: `${granterUsername} دسترسی «${permissionLabel}» به اقدام پروژه «${projectTitle}» به شما داد.`,
    referenceId: plan.projectId,
    referenceType: "PROJECT_PLAN",
    metadata: {
      projectId: plan.projectId,
      projectTitle,
      planId: plan.id,
      permission,
      grantedByUsername: granterUsername,
    },
    isRead: false,
  };
};

const projectPlanActionMessagePhrase = (action) => {
  const map = {
    ACTION_CREATED: "اقدام جدید ثبت کرد",
    ACTION_UPDATED: "اقدام را به‌روزرسانی کرد",
    ACTION_DELETED: "اقدام حذف کرد",
    PROGRESS_UPDATED: "پیشرفت اقدام را به‌روزرسانی کرد",
  };
  return map[action] || "برنامه اقدام را به‌روزرسانی کرد";
};

const strategyPlanActionMessagePhrase = (action) => {
  const map = {
    MAP_VALIDATED: "نقشه استراتژی را ویرایش کرد",
    MAP_APPROVED: "نقشه استراتژی را تأیید کرد",
    KPI_VALIDATED: "شاخص‌ها را ویرایش کرد",
    KPI_APPROVED: "شاخص‌ها را تأیید کرد",
    TABLE_VALIDATED: "جدول OKR را ویرایش کرد",
    TABLE_APPROVED: "جدول OKR را تأیید کرد",
    MEASURES_SYNCED: "اندازه‌گذاری را همگام‌سازی کرد",
    PLAN_UPDATED: "برنامه استراتژی را به‌روزرسانی کرد",
  };
  return map[action] || "برنامه استراتژی را به‌روزرسانی کرد";
};

const buildProjectPlanCollaboratorActivityPayload = ({
  userId,
  projectId,
  projectTitle,
  planId,
  actorUserId,
  actorUsername,
  action,
}) => ({
  userId,
  type: "PROJECT_PLAN_COLLABORATOR_ACTIVITY",
  title: "به‌روزرسانی برنامه اقدام",
  message: `${actorUsername} در برنامه اقدام پروژه «${projectTitle}» ${projectPlanActionMessagePhrase(action)}.`,
  referenceId: projectId,
  referenceType: "PROJECT_PLAN",
  metadata: {
    projectId,
    projectTitle,
    planId,
    actorUserId,
    actorUsername,
    action,
  },
  isRead: false,
});

const buildStrategyPlanCollaboratorActivityPayload = ({
  userId,
  plan,
  actorUserId,
  actorUsername,
  action,
}) => {
  const projectTitle = plan.project?.title || "پروژه";
  const frameworkLabel = plan.framework === "BSC" ? "BSC" : "OKR";

  return {
    userId,
    type: "STRATEGY_PLAN_COLLABORATOR_ACTIVITY",
    title: "به‌روزرسانی برنامه استراتژی",
    message: `${actorUsername} در برنامه ${frameworkLabel} پروژه «${projectTitle}» ${strategyPlanActionMessagePhrase(action)}.`,
    referenceId: plan.id,
    referenceType: "STRATEGY_PLAN",
    metadata: {
      planId: plan.id,
      projectId: plan.projectId,
      projectTitle,
      framework: plan.framework,
      actorUserId,
      actorUsername,
      action,
    },
    isRead: false,
  };
};

const buildStrategyPlanAccessGrantedPayload = ({
  userId,
  plan,
  permission,
  isReadyForMonitoring: monitoringReady,
}) => {
  const projectTitle = plan.project?.title || "پروژه";
  const frameworkLabel = plan.framework === "BSC" ? "BSC" : "OKR";
  const permissionLabel = planPermissionLabel(permission);

  return {
    userId,
    type: "STRATEGY_PLAN_ACCESS_GRANTED",
    title: "دسترسی به برنامه استراتژی",
    message: `دسترسی «${permissionLabel}» به برنامه ${frameworkLabel} — «${projectTitle}».`,
    referenceId: plan.id,
    referenceType: "STRATEGY_PLAN",
    metadata: {
      planId: plan.id,
      projectId: plan.projectId,
      projectTitle,
      framework: plan.framework,
      permission,
      isReadyForMonitoring: Boolean(monitoringReady),
    },
    isRead: false,
  };
};

const buildFormCollaborationInvitePayload = ({
  userId,
  delegationId,
  projectId,
  projectTitle,
  mode,
  senderUsername,
}) => ({
  userId,
  type: "FORM_COLLABORATION_INVITE",
  title: "دعوت همکاری فرم",
  message: `${senderUsername} شما را برای «${formDelegationModeLabel(mode)}» فرم پروژه «${projectTitle}» دعوت کرد.`,
  referenceId: delegationId,
  referenceType: "FORM_COLLABORATION_DELEGATION",
  metadata: {
    delegationId,
    projectId,
    projectTitle,
    mode,
    senderUsername,
  },
  isRead: false,
});

const FORM_COLLABORATION_ACTIVITY_ACTION = "FORM_RESPONSE_SUBMITTED";

const buildFormCollaborationResponseSubmittedPayload = ({
  userId,
  projectId,
  projectTitle,
  assigneeUserId,
  assigneeUsername,
  delegationId,
  collaborationId,
}) => ({
  userId,
  type: "FORM_COLLABORATION_RESPONSE_SUBMITTED",
  title: "پاسخ فرم همکاری",
  message: `${assigneeUsername} فرم پروژه «${projectTitle}» را تکمیل کرد.`,
  referenceId: projectId,
  referenceType: "PROJECT",
  metadata: {
    projectId,
    projectTitle,
    assigneeUserId,
    assigneeUsername,
    actorUserId: assigneeUserId,
    action: FORM_COLLABORATION_ACTIVITY_ACTION,
    ...(delegationId ? { delegationId } : {}),
    ...(collaborationId ? { collaborationId } : {}),
  },
  isRead: false,
});

const createNotification = async (payload, tx) => {
  const client = tx || prisma;
  return client.notification.create({ data: payload });
};

const resolveStrategyPlanMonitoringReady = async (planId) => {
  const plan = await prisma.strategyPlan.findUnique({
    where: { id: planId },
    select: {
      state: true,
      approvals: { where: { type: "MEASURES" }, select: { id: true } },
    },
  });
  if (!plan) return false;
  return isReadyForMonitoring(plan, plan.approvals.length > 0);
};

const notifyProjectCollaboratorActivityIfNeeded = async ({
  recipientId,
  actorUserId,
  projectId,
  projectTitle,
  action,
  projectStatus,
  actorUsername,
}) => {
  if (!recipientId || recipientId === actorUserId) {
    return null;
  }

  let username = actorUsername;
  if (!username) {
    const actor = await prisma.user.findUnique({
      where: { id: actorUserId },
      select: { username: true },
    });
    username = actor?.username || "همکار";
  }

  return createNotification(
    buildProjectCollaboratorActivityPayload({
      userId: recipientId,
      projectId,
      projectTitle,
      actorUserId,
      actorUsername: username,
      action,
      projectStatus,
    }),
  );
};

module.exports = {
  PROJECT_COLLABORATOR_ACTION,
  FORM_COLLABORATION_ACTIVITY_ACTION,
  projectCollaboratorActionMessagePhrase,
  buildProjectAccessGrantedPayload,
  buildProjectCollaboratorActivityPayload,
  buildProjectPlanAccessGrantedPayload,
  buildProjectPlanCollaboratorActivityPayload,
  buildStrategyPlanAccessGrantedPayload,
  buildStrategyPlanCollaboratorActivityPayload,
  projectPlanActionMessagePhrase,
  strategyPlanActionMessagePhrase,
  buildFormCollaborationInvitePayload,
  buildFormCollaborationResponseSubmittedPayload,
  createNotification,
  resolveStrategyPlanMonitoringReady,
  notifyProjectCollaboratorActivityIfNeeded,
  formatProjectAccessGrantLabels,
  planPermissionLabel,
};
