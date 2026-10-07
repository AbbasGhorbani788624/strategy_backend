const prisma = require("../prismaClient");
const {
  buildProjectAccessGrantedPayload,
} = require("./notificationDispatchService");
const { createBadRequestError } = require("../utils");

/** @deprecated use PROJECT_CAPABILITY — kept for call sites during transition */
const PROJECT_PERMISSION = {
  VIEW: "VIEW",
  EDIT: "EDIT",
};

const PROJECT_CAPABILITY = {
  VIEW: "VIEW",
  ACTION: "ACTION",
  VISUALIZE: "VISUALIZE",
};

const PROJECT_ACCESS_SELECT = {
  id: true,
  creatorId: true,
  companyId: true,
  status: true,
  title: true,
  accesses: {
    select: {
      userId: true,
      canView: true,
      canAction: true,
      canVisualize: true,
    },
  },
};

const TERMINAL_ANALYSIS_STATUSES = new Set(["FINAL_ANALYSIS", "ARCHIVED"]);

const normalizeCollaboratorCapabilities = ({
  canView = false,
  canAction = false,
  canVisualize = false,
} = {}) => {
  let view = Boolean(canView);
  const action = Boolean(canAction);
  const visualize = Boolean(canVisualize);
  if (action || visualize) {
    view = true;
  }
  return {
    canView: view,
    canAction: action,
    canVisualize: visualize,
  };
};

const legacyPermissionToCapabilities = (permission) => {
  if (permission === "EDIT" || permission === "VIEW") {
    return { canView: true, canAction: false, canVisualize: false };
  }
  return { canView: true, canAction: false, canVisualize: false };
};

const deprecatedPermissionLabel = (caps) => {
  if (!caps?.canView) {
    return null;
  }
  return "VIEW";
};

const ownerAccessFlags = (projectStatus) => ({
  canView: true,
  canAction: true,
  canVisualize: true,
  canMutateProjectPlan: true,
  canContinueAnalysis: !TERMINAL_ANALYSIS_STATUSES.has(projectStatus),
  canMutateAnalysisPipeline: true,
  canManageProjectAccess: true,
  isOwner: true,
});

const companyAccessFlags = () => ({
  canView: true,
  canAction: true,
  canVisualize: false,
  canMutateProjectPlan: true,
  canContinueAnalysis: false,
  canMutateAnalysisPipeline: false,
  canManageProjectAccess: false,
  isOwner: false,
});

const collaboratorAccessFlags = (row, projectStatus) => ({
  canView: Boolean(row.canView),
  canAction: Boolean(row.canAction),
  canVisualize: Boolean(row.canVisualize),
  canMutateProjectPlan: Boolean(row.canAction),
  canContinueAnalysis: false,
  canMutateAnalysisPipeline: false,
  canManageProjectAccess: false,
  isOwner: false,
});

const normalizeUser = (user) => {
  if (!user?.id) {
    return null;
  }
  return {
    id: user.id,
    role: user.role,
    companyId: user.companyId ?? null,
  };
};

const resolveMemberProjectAccess = (project, userId) => {
  if (project.creatorId === userId) {
    return {
      allowed: true,
      isOwner: true,
      capabilities: ownerAccessFlags(project.status),
    };
  }

  const row = project.accesses?.find((access) => access.userId === userId);
  if (!row || !row.canView) {
    return {
      allowed: false,
      isOwner: false,
      capabilities: null,
      reason: "NO_GRANT",
    };
  }

  return {
    allowed: true,
    isOwner: false,
    capabilities: collaboratorAccessFlags(row, project.status),
  };
};

const resolveProjectAccess = async (user, projectId) => {
  const normalized = normalizeUser(user);
  if (!normalized) {
    return { allowed: false, capabilities: null, reason: "FORBIDDEN" };
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: PROJECT_ACCESS_SELECT,
  });

  if (!project) {
    return { allowed: false, capabilities: null, reason: "NOT_FOUND" };
  }

  if (!project.companyId) {
    return { allowed: false, capabilities: null, reason: "FORBIDDEN" };
  }

  if (normalized.role === "SUPER_ADMIN") {
    return {
      allowed: true,
      isOwner: false,
      project,
      capabilities: companyAccessFlags(),
    };
  }

  if (project.companyId !== normalized.companyId) {
    return { allowed: false, capabilities: null, reason: "FORBIDDEN" };
  }

  if (normalized.role === "COMPANY") {
    return {
      allowed: true,
      isOwner: false,
      project,
      capabilities: companyAccessFlags(),
    };
  }

  if (normalized.role === "MEMBER") {
    const member = resolveMemberProjectAccess(project, normalized.id);
    if (!member.allowed) {
      return { ...member, reason: member.reason || "NO_GRANT", project: null };
    }
    return { ...member, project };
  }

  return { allowed: false, capabilities: null, reason: "FORBIDDEN" };
};

const assertCapability = (resolved, capability) => {
  const caps = resolved.capabilities;
  if (!caps) {
    createBadRequestError("شما به این پروژه دسترسی ندارید", 403);
  }

  if (capability === PROJECT_CAPABILITY.VIEW && !caps.canView) {
    createBadRequestError("شما به این پروژه دسترسی ندارید", 403);
  }
  if (capability === PROJECT_CAPABILITY.ACTION && !caps.canAction) {
    createBadRequestError(
      "دسترسی «اقدام» برای این پروژه به شما داده نشده است.",
      403,
    );
  }
  if (capability === PROJECT_CAPABILITY.VISUALIZE && !caps.canVisualize) {
    createBadRequestError(
      "دسترسی «تصویب مصور» برای این پروژه به شما داده نشده است.",
      403,
    );
  }
};

const assertProjectAccess = async (
  user,
  projectId,
  required = PROJECT_CAPABILITY.VIEW,
) => {
  const resolved = await resolveProjectAccess(user, projectId);

  if (!resolved.allowed) {
    if (resolved.reason === "NOT_FOUND") {
      createBadRequestError("پروژه یافت نشد", 404);
    }
    createBadRequestError("شما به این پروژه دسترسی ندارید", 403);
  }

  if (resolved.isOwner) {
    return resolved;
  }

  if (required === PROJECT_PERMISSION.EDIT) {
    createBadRequestError(
      "فقط مالک پروژه می‌تواند این عملیات را انجام دهد.",
      403,
    );
  }

  if (required === PROJECT_PERMISSION.VIEW) {
    assertCapability(resolved, PROJECT_CAPABILITY.VIEW);
    return resolved;
  }

  assertCapability(resolved, required);
  return resolved;
};

const assertProjectOwner = async (user, projectId) => {
  const resolved = await resolveProjectAccess(user, projectId);

  if (!resolved.allowed) {
    if (resolved.reason === "NOT_FOUND") {
      createBadRequestError("پروژه یافت نشد", 404);
    }
    createBadRequestError("شما به این پروژه دسترسی ندارید", 403);
  }

  if (!resolved.isOwner) {
    createBadRequestError(
      "فقط مالک پروژه می‌تواند این عملیات را انجام دهد.",
      403,
    );
  }

  return resolved;
};

const assertProjectAnalysisMutate = async (user, projectId) =>
  assertProjectOwner(user, projectId);

const assertProjectReadOnLoaded = (project, user) => {
  if (!project?.companyId) {
    createBadRequestError("پروژه به هیچ شرکتی متصل نیست", 400);
  }

  if (!user?.companyId || project.companyId !== user.companyId) {
    createBadRequestError("شما اجازه دسترسی به این پروژه را ندارید", 403);
  }

  if (user.role === "COMPANY" || user.role === "SUPER_ADMIN") {
    return;
  }

  if (user.role === "MEMBER") {
    const member = resolveMemberProjectAccess(project, user.id);
    if (!member.allowed) {
      createBadRequestError("شما به این پروژه دسترسی ندارید", 403);
    }
    return;
  }

  createBadRequestError("دسترسی غیرمجاز", 403);
};

const formatAccessForProjectResponse = (user, project) => {
  if (!user?.id || !project) {
    return {
      isOwner: false,
      permission: null,
      access: null,
    };
  }

  const status = project.status ?? null;

  if (project.creatorId === user.id) {
    const flags = ownerAccessFlags(status);
    return {
      isOwner: true,
      permission: null,
      access: flags,
    };
  }

  if (user.role === "COMPANY" || user.role === "SUPER_ADMIN") {
    return {
      isOwner: false,
      permission: "VIEW",
      access: companyAccessFlags(),
    };
  }

  const row = project.accesses?.find((a) => a.userId === user.id);
  if (row && row.canView) {
    const caps = collaboratorAccessFlags(row, status);
    return {
      isOwner: false,
      permission: deprecatedPermissionLabel(caps),
      access: caps,
    };
  }

  return { isOwner: false, permission: null, access: null };
};

const parseColleaguesPayload = (body) => {
  if (Array.isArray(body?.colleagues) && body.colleagues.length >= 0) {
    const map = new Map();
    for (const item of body.colleagues) {
      if (!item?.userId) {
        createBadRequestError("شناسه همکار نامعتبر است.", 400);
      }

      let caps;
      if (
        item.canView !== undefined ||
        item.canAction !== undefined ||
        item.canVisualize !== undefined
      ) {
        caps = normalizeCollaboratorCapabilities({
          canView: item.canView,
          canAction: item.canAction,
          canVisualize: item.canVisualize,
        });
      } else if (item.permission) {
        caps = legacyPermissionToCapabilities(item.permission);
      } else {
        caps = { canView: true, canAction: false, canVisualize: false };
      }

      if (!caps.canView && !caps.canAction && !caps.canVisualize) {
        createBadRequestError(
          "هر همکار باید حداقل یکی از دسترسی‌های مشاهده، اقدام یا تصویب مصور را داشته باشد.",
          400,
        );
      }

      map.set(item.userId, caps);
    }
    return [...map.entries()].map(([userId, capabilities]) => ({
      userId,
      capabilities,
    }));
  }

  if (Array.isArray(body?.colleagueIds)) {
    const ids = [...new Set(body.colleagueIds.filter(Boolean))];
    return ids.map((userId) => ({
      userId,
      capabilities: { canView: true, canAction: false, canVisualize: false },
    }));
  }

  createBadRequestError("لیست همکاران نامعتبر است.", 400);
};

const capabilitiesEqual = (a, b) =>
  a.canView === b.canView &&
  a.canAction === b.canAction &&
  a.canVisualize === b.canVisualize;

const grantProjectCollaboratorsService = async (
  projectId,
  body,
  currentUserId,
) => {
  if (!projectId) {
    createBadRequestError("شناسه پروژه الزامی است.", 400);
  }

  const colleagues = parseColleaguesPayload(body);
  const colleagueIds = colleagues.map((c) => c.userId);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      title: true,
      creatorId: true,
      companyId: true,
      accesses: {
        select: {
          userId: true,
          canView: true,
          canAction: true,
          canVisualize: true,
        },
      },
      creator: {
        select: { id: true, username: true },
      },
    },
  });

  if (!project) {
    createBadRequestError("پروژه یافت نشد.", 404);
  }

  if (project.creatorId !== currentUserId) {
    createBadRequestError(
      "فقط مالک پروژه می‌تواند دسترسی‌ها را مدیریت کند.",
      403,
    );
  }

  if (!project.companyId) {
    createBadRequestError("این پروژه به هیچ شرکتی متصل نیست.", 400);
  }

  const validColleagues = await prisma.user.findMany({
    where: {
      id: { in: colleagueIds },
      companyId: project.companyId,
    },
    select: { id: true },
  });

  const validIdSet = new Set(validColleagues.map((u) => u.id));
  if (validIdSet.size !== colleagueIds.length) {
    createBadRequestError(
      "بعضی از کاربران انتخاب‌شده عضو شرکت این پروژه نیستند.",
      400,
    );
  }

  if (colleagueIds.includes(project.creatorId)) {
    createBadRequestError("مالک پروژه نیازی به ثبت در لیست دسترسی ندارد.", 400);
  }

  const desiredByUser = new Map(
    colleagues.map((c) => [c.userId, c.capabilities]),
  );
  const currentByUser = new Map(
    project.accesses.map((a) => [
      a.userId,
      {
        canView: a.canView,
        canAction: a.canAction,
        canVisualize: a.canVisualize,
      },
    ]),
  );

  const toRemove = [...currentByUser.keys()].filter(
    (id) => !desiredByUser.has(id),
  );
  const toAdd = [...desiredByUser.keys()].filter(
    (id) => !currentByUser.has(id),
  );
  const toUpdate = [...desiredByUser.keys()].filter(
    (id) =>
      currentByUser.has(id) &&
      !capabilitiesEqual(currentByUser.get(id), desiredByUser.get(id)),
  );

  const grantedByName = project.creator?.username || "مدیر پروژه";

  await prisma.$transaction(async (tx) => {
    if (toRemove.length) {
      await tx.projectAccess.deleteMany({
        where: { projectId, userId: { in: toRemove } },
      });
    }

    for (const userId of toUpdate) {
      const caps = desiredByUser.get(userId);
      await tx.projectAccess.update({
        where: { projectId_userId: { projectId, userId } },
        data: {
          canView: caps.canView,
          canAction: caps.canAction,
          canVisualize: caps.canVisualize,
          grantedByUserId: currentUserId,
        },
      });
    }

    if (toAdd.length) {
      await tx.projectAccess.createMany({
        data: toAdd.map((userId) => {
          const caps = desiredByUser.get(userId);
          return {
            projectId,
            userId,
            canView: caps.canView,
            canAction: caps.canAction,
            canVisualize: caps.canVisualize,
            grantedByUserId: currentUserId,
          };
        }),
        skipDuplicates: true,
      });
    }

    if (toAdd.length) {
      await tx.notification.createMany({
        data: toAdd.map((userId) => {
          const caps = desiredByUser.get(userId);
          return buildProjectAccessGrantedPayload({
            userId,
            projectId,
            projectTitle: project.title,
            capabilities: caps,
            grantedByUsername: grantedByName,
          });
        }),
      });
    }
  });

  return {
    message: "دسترسی‌های پروژه با موفقیت بروزرسانی شد.",
    colleagues: colleagues.map(({ userId, capabilities }) => ({
      userId,
      ...capabilities,
    })),
    accessUserIds: colleagueIds,
  };
};

module.exports = {
  PROJECT_PERMISSION,
  PROJECT_CAPABILITY,
  PROJECT_ACCESS_SELECT,
  normalizeCollaboratorCapabilities,
  legacyPermissionToCapabilities,
  resolveProjectAccess,
  assertProjectAccess,
  assertProjectOwner,
  assertProjectAnalysisMutate,
  assertProjectReadOnLoaded,
  formatAccessForProjectResponse,
  grantProjectCollaboratorsService,
  parseColleaguesPayload,
  resolveMemberProjectAccess,
};
