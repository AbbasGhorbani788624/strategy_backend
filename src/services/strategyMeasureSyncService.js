const prisma = require("../prismaClient");
const {
  mapMeasurementPeriodText,
  parseMeasurementPeriodConfig,
} = require("../utils/measurePeriodUtils");
const {
  parseMeasureDesirability,
  pickKpiDesirabilityInput,
} = require("../utils/measureDesirabilityUtils");

const pickNormalizedKpi = (kpi) => ({
  metric: kpi?.metric || kpi?.name,
  formula: kpi?.formula,
  measurementPeriod: kpi?.measurementPeriod,
  unit: kpi?.unit,
  desirability: parseMeasureDesirability(pickKpiDesirabilityInput(kpi)),
});

const isKpiRow = (row) =>
  Boolean(row?.metric || row?.name) && !Array.isArray(row?.kpis);

const isArrayLikeObject = (value) =>
  value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value).some((key) => /^\d+$/.test(key));

const toArrayFromArrayLikeObject = (value) =>
  Object.keys(value)
    .filter((key) => /^\d+$/.test(key))
    .sort((a, b) => Number(a) - Number(b))
    .map((key) => value[key]);

const normalizeBscKpiTable = (input) => {
  if (!input || typeof input !== "object") {
    return [];
  }

  let table = input;

  if (!Array.isArray(table)) {
    if (Array.isArray(table.kpiTable)) {
      table = table.kpiTable;
    } else if (Array.isArray(table.kpi_table)) {
      table = table.kpi_table;
    } else if (isArrayLikeObject(table)) {
      table = toArrayFromArrayLikeObject(table);
    } else if (Array.isArray(table.rows)) {
      table = table.rows;
    } else if (Array.isArray(table.items)) {
      table = table.items;
    } else if (Array.isArray(table.kpis)) {
      return [
        {
          strategicObjective: table.strategicObjective || table.objective || null,
          kpis: table.kpis,
        },
      ];
    } else if (isKpiRow(table)) {
      return [
        {
          strategicObjective: table.strategicObjective || table.objective || null,
          kpis: [
            pickNormalizedKpi(table),
          ],
        },
      ];
    } else {
      return [];
    }
  }

  if (table.length === 0) {
    return [];
  }

  if (table.every(isKpiRow)) {
    return table.map((item) => ({
      strategicObjective: item.strategicObjective || item.objective || null,
      kpis: [pickNormalizedKpi(item)],
    }));
  }

  return table.map((row) => ({
    strategicObjective: row?.strategicObjective || row?.objective || null,
    objective: row?.objective || row?.strategicObjective || null,
    kpis: Array.isArray(row?.kpis)
      ? row.kpis.map(pickNormalizedKpi)
      : Array.isArray(row?.metrics)
        ? row.metrics.map(pickNormalizedKpi)
        : isKpiRow(row)
          ? [pickNormalizedKpi(row)]
          : [],
  }));
};

const normalizeOkrTable = (input) => normalizeBscKpiTable(input);

const countBscKpisInTable = (kpiTable) => {
  const rows = normalizeBscKpiTable(kpiTable);
  return rows.reduce((total, row) => {
    const kpis = Array.isArray(row?.kpis) ? row.kpis : [];
    return (
      total +
      kpis.filter((kpi) => Boolean(kpi?.metric || kpi?.name)).length
    );
  }, 0);
};

const countOkrKeyResultsInTable = (table) => countBscKpisInTable(table);

const syncBscMeasuresFromKpiTable = async (tx, strategyPlanId, kpiTable) => {
  const normalizedTable = normalizeBscKpiTable(kpiTable);

  await tx.strategyMeasure.deleteMany({
    where: { strategyPlanId },
  });

  const measures = [];
  let sortOrder = 0;

  for (const row of normalizedTable) {
    const objectiveTitle = row?.strategicObjective || row?.objective || null;
    const kpis = Array.isArray(row?.kpis) ? row.kpis : [];

    for (const kpi of kpis) {
      const metric = kpi?.metric || kpi?.name;
      if (!metric) continue;

      const periodConfig = parseMeasurementPeriodConfig(kpi?.measurementPeriod);

      const measure = await tx.strategyMeasure.create({
        data: {
          strategyPlanId,
          name: metric,
          description: objectiveTitle,
          formula: kpi?.formula || null,
          unit: kpi?.unit || null,
          frequency: mapMeasurementPeriodText(kpi?.measurementPeriod),
          measurementPeriodLabel: periodConfig.label,
          periodSplitBy: periodConfig.splitBy,
          monitoringDurationMonths: periodConfig.durationMonths,
          monitoringDurationDays: periodConfig.durationDays,
          desirability: kpi.desirability,
          monitoringStartDate: new Date(),
          status: "APPROVED",
        },
      });

      measures.push({ ...measure, sortOrder: sortOrder++ });
    }
  }

  return measures;
};

const syncOkrMeasuresFromTable = async (tx, strategyPlanId, table) =>
  syncBscMeasuresFromKpiTable(tx, strategyPlanId, table);

const ensureMeasuresSyncedForPlan = async (strategyPlanId) => {
  const existingCount = await prisma.strategyMeasure.count({
    where: { strategyPlanId },
  });

  if (existingCount > 0) {
    return existingCount;
  }

  const plan = await prisma.strategyPlan.findUnique({
    where: { id: strategyPlanId },
    include: {
      approvals: true,
      aiRuns: {
        where: { success: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!plan) {
    return 0;
  }

  const hasMeasuresApproval = plan.approvals.some(
    (approval) => approval.type === "MEASURES",
  );

  if (!hasMeasuresApproval) {
    return 0;
  }

  const {
    resolveKpiTableFromAiRuns,
    resolveOkrTableFromAiRuns,
  } = require("./strategyPlanService");

  await prisma.$transaction(async (tx) => {
    const sourceTable =
      plan.framework === "BSC"
        ? resolveKpiTableFromAiRuns(plan.aiRuns, { preferApproved: true })
        : resolveOkrTableFromAiRuns(plan.aiRuns, { preferApproved: true });

    const normalizedTable = normalizeBscKpiTable(sourceTable);

    if (normalizedTable.length > 0) {
      await syncBscMeasuresFromKpiTable(tx, strategyPlanId, normalizedTable);
    }
  });

  return prisma.strategyMeasure.count({
    where: { strategyPlanId },
  });
};

module.exports = {
  normalizeBscKpiTable,
  normalizeOkrTable,
  countBscKpisInTable,
  countOkrKeyResultsInTable,
  syncBscMeasuresFromKpiTable,
  syncOkrMeasuresFromTable,
  ensureMeasuresSyncedForPlan,
  pickNormalizedKpi,
};
