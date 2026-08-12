const prisma = require("../prismaClient");
const { createBadRequestError } = require("../utils");
const {
  createStrategyFlowError,
} = require("../utils/strategyPlanResume");
const { generateMonitoringPeriods } = require("../utils/measurePeriodUtils");

const MONITORING_MEASURE_INCLUDE = {
  strategyPlan: {
    include: {
      project: {
        select: {
          id: true,
          creatorId: true,
          companyId: true,
          accesses: { select: { userId: true } },
        },
      },
      approvals: true,
    },
  },
  owner: {
    select: {
      id: true,
      username: true,
      userInfo: { select: { firstName: true, lastName: true } },
    },
  },
  targets: { orderBy: [{ periodStart: "asc" }] },
  measurements: { orderBy: [{ periodStart: "asc" }] },
};

const loadMonitoringMeasure = (client, measureId) =>
  client.strategyMeasure.findUnique({
    where: { id: measureId },
    include: MONITORING_MEASURE_INCLUDE,
  });

const runTransactionWithRetry = async (operation, maxAttempts = 5) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const isRetryable =
        error?.code === "P2034" ||
        error?.code === "P2028" ||
        /deadlock|write conflict|retry your transaction/i.test(
          error?.message || "",
        );

      if (!isRetryable || attempt === maxAttempts) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
    }
  }

  return null;
};

const loadExistingDraftMonitoring = async (measureId) => {
  const existing = await loadMonitoringMeasure(prisma, measureId);

  if (
    existing?.monitoringStatus === "DRAFT" &&
    existing.targets.length > 0
  ) {
    return existing;
  }

  return null;
};

const loadMeasureForUser = async (measureId, user) => {
  const measure = await prisma.strategyMeasure.findUnique({
    where: { id: measureId },
    include: {
      strategyPlan: {
        include: {
          project: {
            select: {
              id: true,
              creatorId: true,
              companyId: true,
              accesses: {
                select: { userId: true },
              },
            },
          },
          approvals: true,
        },
      },
      owner: {
        select: {
          id: true,
          username: true,
          userInfo: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      targets: {
        orderBy: [{ periodStart: "asc" }],
      },
      measurements: {
        orderBy: [{ periodStart: "asc" }],
      },
    },
  });

  if (!measure) {
    if (String(measureId).startsWith("temp_")) {
      createBadRequestError(
        "شناسه سنجه نامعتبر است. ابتدا GET /api/strategy-plans/:strategyPlanId/measures را صدا بزنید و از id واقعی (UUID) استفاده کنید",
        404,
      );
    }
    createBadRequestError("سنجه استراتژی یافت نشد", 404);
  }

  assertMeasureAccess(measure, user);
  assertMeasureReadyForMonitoring(measure);

  return measure;
};

const assertMeasureAccess = (measure, user) => {
  const plan = measure.strategyPlan;

  if (!user.companyId || plan.companyId !== user.companyId) {
    createBadRequestError("شما اجازه دسترسی به این سنجه را ندارید", 403);
  }

  if (user.role === "COMPANY") {
    return;
  }

  if (user.role === "MEMBER") {
    const project = plan.project;
    const isCreator = project?.creatorId === user.id;
    const hasAccess = project?.accesses?.some(
      (access) => access.userId === user.id,
    );

    if (!isCreator && !hasAccess) {
      createBadRequestError("شما به این سنجه دسترسی ندارید", 403);
    }
    return;
  }

  createBadRequestError("دسترسی غیرمجاز", 403);
};

const assertMeasureReadyForMonitoring = (measure) => {
  const hasMeasuresApproval = measure.strategyPlan.approvals?.some(
    (approval) => approval.type === "MEASURES",
  );

  if (!hasMeasuresApproval) {
    createBadRequestError(
      "برنامه استراتژی هنوز در مرحله تایید نهایی سنجه‌ها نیست",
      400,
    );
  }

  if (measure.status !== "APPROVED") {
    createBadRequestError("سنجه هنوز برای پایش آماده نیست", 400);
  }

  if (
    measure.strategyPlan.state !== "READY_FOR_MONITORING" &&
    measure.strategyPlan.state !== "MONITORING"
  ) {
    createStrategyFlowError(
      "INVALID_STATE_TRANSITION",
      `عملیات پایش در وضعیت فعلی (${measure.strategyPlan.state}) مجاز نیست.`,
      400,
      { state: measure.strategyPlan.state },
    );
  }
};

const assertMonitoringEditable = (measure) => {
  if (measure.monitoringStatus === "LOCKED") {
    createBadRequestError("Planning قفل شده و قابل ویرایش نیست", 400);
  }
};

const assertMonitoringLocked = (measure) => {
  if (measure.monitoringStatus !== "LOCKED") {
    createBadRequestError("Planning هنوز قفل نشده است", 400);
  }
};

const formatMeasureListItem = (measure) => ({
  id: measure.id,
  name: measure.name,
  metric: measure.name,
  unit: measure.unit,
  frequency: measure.frequency,
  formula: measure.formula,
  description: measure.description,
  strategicObjective: measure.description,
  status: measure.status,
  monitoringStatus: measure.monitoringStatus,
  finalTarget:
    measure.finalTarget !== null && measure.finalTarget !== undefined
      ? Number(measure.finalTarget)
      : null,
  ownerId: measure.ownerId,
});

const formatOwner = (owner) => {
  if (!owner) return null;

  const fullName = [owner.userInfo?.firstName, owner.userInfo?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    id: owner.id,
    name: fullName || owner.username,
    username: owner.username,
  };
};

const formatMonitoringResponse = (measure) => {
  const measurementMap = new Map(
    measure.measurements.map((item) => [
      `${item.periodStart.toISOString()}_${item.periodEnd.toISOString()}`,
      item,
    ]),
  );

  return {
    monitoringId: measure.id,
    measureId: measure.id,
    status: measure.monitoringStatus,
    measure: {
      id: measure.id,
      name: measure.name,
      unit: measure.unit,
      frequency: measure.frequency,
      formula: measure.formula,
      description: measure.description,
    },
    startDate: measure.monitoringStartDate,
    duration: measure.monitoringDurationMonths,
    owner: formatOwner(measure.owner),
    finalTarget:
      measure.finalTarget !== null && measure.finalTarget !== undefined
        ? Number(measure.finalTarget)
        : null,
    periods: measure.targets.map((target) => {
      const measurementKey = `${target.periodStart.toISOString()}_${target.periodEnd.toISOString()}`;
      const measurement = measurementMap.get(measurementKey);

      return {
        id: target.id,
        label: target.periodLabel,
        periodStart: target.periodStart,
        periodEnd: target.periodEnd,
        targetValue:
          target.targetValue !== null && target.targetValue !== undefined
            ? Number(target.targetValue)
            : null,
        actualValue:
          measurement?.actualValue !== null &&
          measurement?.actualValue !== undefined
            ? Number(measurement.actualValue)
            : null,
      };
    }),
  };
};

const startMonitoringService = async (user, measureId) => {
  let measure = await loadMeasureForUser(measureId, user);

  if (measure.monitoringStatus === "LOCKED") {
    createBadRequestError("Planning این سنجه قبلاً قفل شده است", 400);
  }

  if (measure.monitoringStatus === "DRAFT" && measure.targets.length > 0) {
    return formatMonitoringResponse(measure);
  }

  const startDate = measure.monitoringStartDate || new Date();
  const durationMonths = measure.monitoringDurationMonths || 6;
  const periods = generateMonitoringPeriods({
    startDate,
    durationMonths,
    frequency: measure.frequency || "MONTHLY",
  });

  try {
    measure = await runTransactionWithRetry(async () =>
      prisma.$transaction(async (tx) => {
        const current = await tx.strategyMeasure.findUnique({
          where: { id: measureId },
          select: {
            id: true,
            monitoringStatus: true,
            strategyPlanId: true,
            strategyPlan: {
              select: { state: true },
            },
            targets: {
              select: { id: true },
            },
          },
        });

        if (!current) {
          createBadRequestError("سنجه استراتژی یافت نشد", 404);
        }

        if (
          current.monitoringStatus === "DRAFT" &&
          current.targets.length > 0
        ) {
          return loadMonitoringMeasure(tx, measureId);
        }

        await tx.strategyMeasureTarget.deleteMany({
          where: { measureId },
        });

        await tx.strategyMeasureMeasurement.deleteMany({
          where: { measureId },
        });

        await tx.strategyMeasure.update({
          where: { id: measureId },
          data: {
            monitoringStatus: "DRAFT",
            monitoringStartDate: startDate,
            monitoringDurationMonths: durationMonths,
          },
        });

        if (periods.length > 0) {
          await tx.strategyMeasureTarget.createMany({
            data: periods.map((period) => ({
              measureId,
              periodStart: period.periodStart,
              periodEnd: period.periodEnd,
              periodLabel: period.periodLabel,
              targetValue: null,
            })),
          });
        }

        if (current.strategyPlan.state === "READY_FOR_MONITORING") {
          await tx.strategyPlan.updateMany({
            where: {
              id: current.strategyPlanId,
              state: "READY_FOR_MONITORING",
            },
            data: { state: "MONITORING" },
          });
        }

        return loadMonitoringMeasure(tx, measureId);
      }),
    );
  } catch (error) {
    const isConflict =
      error?.code === "P2034" ||
      error?.code === "P2028" ||
      /deadlock|write conflict|retry your transaction/i.test(
        error?.message || "",
      );

    if (isConflict) {
      const existing = await loadExistingDraftMonitoring(measureId);
      if (existing) {
        return formatMonitoringResponse(existing);
      }
    }

    throw error;
  }

  return formatMonitoringResponse(measure);
};

const getMonitoringService = async (user, monitoringId) => {
  const measure = await loadMeasureForUser(monitoringId, user);

  if (!measure.monitoringStatus) {
    createBadRequestError("Monitoring برای این سنجه شروع نشده است", 404);
  }

  return formatMonitoringResponse(measure);
};

const updateMonitoringPlanningService = async (
  user,
  monitoringId,
  { ownerId, finalTarget, periods },
) => {
  const measure = await loadMeasureForUser(monitoringId, user);
  assertMonitoringEditable(measure);

  if (!measure.monitoringStatus) {
    createBadRequestError("ابتدا Monitoring را شروع کنید", 400);
  }

  if (ownerId) {
    const owner = await prisma.user.findFirst({
      where: {
        id: ownerId,
        companyId: user.companyId,
      },
    });

    if (!owner) {
      createBadRequestError("مسئول انتخاب‌شده معتبر نیست", 400);
    }
  }

  if (finalTarget === null || finalTarget === undefined || Number.isNaN(Number(finalTarget))) {
    createBadRequestError("finalTarget الزامی است", 400);
  }

  if (!Array.isArray(periods) || periods.length === 0) {
    createBadRequestError("لیست periodها الزامی است", 400);
  }

  const targetMap = new Map(measure.targets.map((target) => [target.id, target]));

  for (const periodInput of periods) {
    if (!periodInput?.periodId) {
      createBadRequestError("periodId برای هر period الزامی است", 400);
    }

    if (!targetMap.has(periodInput.periodId)) {
      createBadRequestError(`period با شناسه ${periodInput.periodId} یافت نشد`, 400);
    }

    if (
      periodInput.targetValue === null ||
      periodInput.targetValue === undefined ||
      Number.isNaN(Number(periodInput.targetValue))
    ) {
      createBadRequestError("targetValue برای همه periodها الزامی است", 400);
    }
  }

  if (periods.length !== measure.targets.length) {
    createBadRequestError("باید برای همه periodها Target ارسال شود", 400);
  }

  const updatedMeasure = await prisma.$transaction(async (tx) => {
    await tx.strategyMeasure.update({
      where: { id: monitoringId },
      data: {
        ownerId: ownerId || null,
        finalTarget,
      },
    });

    for (const periodInput of periods) {
      await tx.strategyMeasureTarget.update({
        where: { id: periodInput.periodId },
        data: {
          targetValue: periodInput.targetValue,
        },
      });
    }

    return tx.strategyMeasure.findUnique({
      where: { id: monitoringId },
      include: {
        strategyPlan: {
          include: {
            project: {
              select: {
                id: true,
                creatorId: true,
                companyId: true,
                accesses: { select: { userId: true } },
              },
            },
            approvals: true,
          },
        },
        owner: {
          select: {
            id: true,
            username: true,
            userInfo: { select: { firstName: true, lastName: true } },
          },
        },
        targets: { orderBy: [{ periodStart: "asc" }] },
        measurements: { orderBy: [{ periodStart: "asc" }] },
      },
    });
  });

  return formatMonitoringResponse(updatedMeasure);
};

const confirmMonitoringService = async (user, monitoringId) => {
  const measure = await loadMeasureForUser(monitoringId, user);
  assertMonitoringEditable(measure);

  if (!measure.monitoringStatus) {
    createBadRequestError("ابتدا Monitoring را شروع کنید", 400);
  }

  if (!measure.ownerId) {
    createBadRequestError("مسئول KPI باید تعیین شده باشد", 400);
  }

  if (measure.finalTarget === null || measure.finalTarget === undefined) {
    createBadRequestError("Target نهایی باید تعیین شده باشد", 400);
  }

  const missingTarget = measure.targets.find(
    (target) => target.targetValue === null || target.targetValue === undefined,
  );

  if (missingTarget) {
    createBadRequestError("همه periodها باید Target داشته باشند", 400);
  }

  const updatedMeasure = await prisma.strategyMeasure.update({
    where: { id: monitoringId },
    data: {
      monitoringStatus: "LOCKED",
    },
    include: {
      strategyPlan: {
        include: {
          project: {
            select: {
              id: true,
              creatorId: true,
              companyId: true,
              accesses: { select: { userId: true } },
            },
          },
          approvals: true,
        },
      },
      owner: {
        select: {
          id: true,
          username: true,
          userInfo: { select: { firstName: true, lastName: true } },
        },
      },
      targets: { orderBy: [{ periodStart: "asc" }] },
      measurements: { orderBy: [{ periodStart: "asc" }] },
    },
  });

  return formatMonitoringResponse(updatedMeasure);
};

const recordPeriodMeasurementService = async (
  user,
  monitoringId,
  periodId,
  actualValue,
) => {
  const measure = await loadMeasureForUser(monitoringId, user);
  assertMonitoringLocked(measure);

  const target = measure.targets.find((item) => item.id === periodId);
  if (!target) {
    createBadRequestError("period یافت نشد", 404);
  }

  if (
    actualValue === null ||
    actualValue === undefined ||
    Number.isNaN(Number(actualValue))
  ) {
    createBadRequestError("actualValue الزامی است", 400);
  }

  await prisma.strategyMeasureMeasurement.upsert({
    where: {
      measureId_periodStart_periodEnd: {
        measureId: monitoringId,
        periodStart: target.periodStart,
        periodEnd: target.periodEnd,
      },
    },
    create: {
      measureId: monitoringId,
      periodStart: target.periodStart,
      periodEnd: target.periodEnd,
      actualValue,
      submittedById: user.id,
    },
    update: {
      actualValue,
      submittedById: user.id,
      submittedAt: new Date(),
    },
  });

  const updatedMeasure = await prisma.strategyMeasure.findUnique({
    where: { id: monitoringId },
    include: {
      strategyPlan: {
        include: {
          project: {
            select: {
              id: true,
              creatorId: true,
              companyId: true,
              accesses: { select: { userId: true } },
            },
          },
          approvals: true,
        },
      },
      owner: {
        select: {
          id: true,
          username: true,
          userInfo: { select: { firstName: true, lastName: true } },
        },
      },
      targets: { orderBy: [{ periodStart: "asc" }] },
      measurements: { orderBy: [{ periodStart: "asc" }] },
    },
  });

  return formatMonitoringResponse(updatedMeasure);
};

const listStrategyPlanMeasuresService = async (user, strategyPlanId, query = {}) => {
  const plan = await prisma.strategyPlan.findUnique({
    where: { id: strategyPlanId },
    include: {
      project: {
        select: {
          id: true,
          creatorId: true,
          companyId: true,
          accesses: { select: { userId: true } },
        },
      },
      approvals: true,
    },
  });

  if (!plan) {
    createBadRequestError("برنامه استراتژی یافت نشد", 404);
  }

  assertMeasureAccess({ strategyPlan: plan }, user);

  const hasMeasuresApproval = plan.approvals.some(
    (approval) => approval.type === "MEASURES",
  );

  if (!hasMeasuresApproval) {
    createBadRequestError("برنامه استراتژی هنوز تایید نهایی نشده است", 400);
  }

  const { ensureMeasuresSyncedForPlan } = require("./strategyMeasureSyncService");
  await ensureMeasuresSyncedForPlan(strategyPlanId);

  const { parseListQuery, buildPaginationMeta } = require("../utils/listQueryUtils");
  const { page, limit, skip, search } = parseListQuery(query, {
    defaultLimit: 20,
    maxLimit: 100,
  });

  const where = {
    strategyPlanId,
    ...(query.monitoringStatus
      ? { monitoringStatus: query.monitoringStatus }
      : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { description: { contains: search } },
          ],
        }
      : {}),
  };

  const [measures, totalItems] = await Promise.all([
    prisma.strategyMeasure.findMany({
      where,
      orderBy: { createdAt: "asc" },
      skip,
      take: limit,
    }),
    prisma.strategyMeasure.count({ where }),
  ]);

  return {
    items: measures.map(formatMeasureListItem),
    pagination: buildPaginationMeta({ totalItems, page, limit }),
  };
};

module.exports = {
  startMonitoringService,
  getMonitoringService,
  updateMonitoringPlanningService,
  confirmMonitoringService,
  recordPeriodMeasurementService,
  listStrategyPlanMeasuresService,
  formatMeasureListItem,
};
