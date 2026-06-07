const toNullableString = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return String(value).trim();
};

const toNullableInt = (value) => {
  if (value === undefined || value === null || value === "") return null;

  const parsed = Number(value);
  if (Number.isNaN(parsed)) return null;

  return Math.trunc(parsed);
};

const toNullableDecimal = (value) => {
  if (value === undefined || value === null || value === "") return null;

  const parsed = Number(value);
  if (Number.isNaN(parsed)) return null;

  return parsed;
};

const toNullableBoolean = (value) => {
  if (value === undefined || value === null || value === "") return null;

  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;

  return null;
};

const normalizeProductService = (item, index) => {
  return {
    id: item?.id || null,
    name: item?.name?.trim() || "",
    revenueCenter: item?.revenueCenter?.trim?.() || item?.revenueCenter || null,
    type: item?.type?.trim?.() || item?.type || null,
    revenueSharePercent:
      item?.revenueSharePercent?.trim?.() || item?.revenueSharePercent || null,
    distinctiveFeatures: item?.distinctiveFeatures?.trim?.() || null,
    startYear:
      item?.startYear === "" ||
      item?.startYear === undefined ||
      item?.startYear === null
        ? null
        : Number(item.startYear),
    marketPosition:
      item?.marketPosition?.trim?.() || item?.marketPosition || null,
    isExported:
      item?.isExported === undefined || item?.isExported === null
        ? false
        : Boolean(item.isExported),
    sortOrder:
      item?.sortOrder === undefined || item?.sortOrder === null
        ? index
        : Number(item.sortOrder),
  };
};

const validateProductServices = (records) => {
  const errors = [];

  if (!Array.isArray(records)) {
    return ["productServices باید آرایه باشد."];
  }

  records.forEach((item, index) => {
    if (!item?.name || !String(item.name).trim()) {
      errors.push(`ردیف ${index + 1}: نام محصول/خدمت الزامی است.`);
    }

    if (
      item?.startYear !== null &&
      item?.startYear !== undefined &&
      item?.startYear !== ""
    ) {
      const year = Number(item.startYear);

      if (Number.isNaN(year) || !Number.isInteger(year) || year < 0) {
        errors.push(`ردیف ${index + 1}: سال شروع معتبر نیست.`);
      }
    }
  });

  return errors;
};

const serializeProductService = (record) => {
  return {
    id: record.id,
    companyId: record.companyId,
    name: record.name,
    revenueCenter: record.revenueCenter,
    type: record.type,
    revenueSharePercent: record.revenueSharePercent,
    distinctiveFeatures: record.distinctiveFeatures,
    startYear: record.startYear,
    marketPosition: record.marketPosition,
    isExported: record.isExported,
    sortOrder: record.sortOrder,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
};

module.exports = {
  toNullableString,
  toNullableInt,
  toNullableDecimal,
  toNullableBoolean,
  normalizeProductService,
  validateProductServices,
  serializeProductService,
};
