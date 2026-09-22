//actions.mjs
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { ValidationError } from "adminjs";
import {
  extractReferenceId,
  normalizeNullableString,
  parseNullableBooleanValue,
  parseIntegerValue,
  parseDecimalValue,
} from "./component-loader.mjs";
import { prisma } from "./prisma.mjs";

const adminJsRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "node_modules",
  "adminjs",
);

let adminJsPopulatorPromise;

const getAdminJsPopulator = () => {
  adminJsPopulatorPromise ??= import(
    pathToFileURL(
      path.join(adminJsRoot, "lib/backend/utils/populator/populator.js"),
    ).href
  ).then((module) => module.default);
  return adminJsPopulatorPromise;
};

const relationIdFieldMap = {
  resumeFileId: "resumeFile",
  structureFileId: "structureFile",
  attachmentFileId: "attachmentFile",
  balanceFileId: "balanceFile",
  incomeFileId: "incomeFile",
};

const mapPayloadToData = (payload, fields) => {
  const data = {};

  for (const [key, type] of Object.entries(fields)) {
    if (key in relationIdFieldMap) continue;

    const value = payload[key];

    if (type === "string") {
      data[key] = normalizeNullableString(value);
    } else if (type === "boolean") {
      data[key] = parseNullableBooleanValue(value);
    } else if (type === "int") {
      data[key] = parseIntegerValue(value);
    } else if (type === "decimal") {
      data[key] = parseDecimalValue(value);
    } else if (type === "date") {
      data[key] = value ? new Date(value) : null;
    } else {
      data[key] = value;
    }
  }

  return data;
};

const resolveUserChildUserId = async (modelName, recordParams) => {
  const fromParams = extractReferenceId(recordParams?.userId);
  if (fromParams) {
    return fromParams;
  }

  const recordId = recordParams?.id;
  if (!recordId || !prisma[modelName]?.findUnique) {
    return null;
  }

  const row = await prisma[modelName].findUnique({
    where: { id: recordId },
    select: { userId: true },
  });

  return row?.userId ?? null;
};

const resolveCompanyChildCompanyId = async (modelName, recordParams) => {
  const fromParams = extractReferenceId(recordParams?.companyId);
  if (fromParams) {
    return fromParams;
  }

  const recordId = recordParams?.id;
  if (!recordId || !prisma[modelName]?.findUnique) {
    return null;
  }

  const row = await prisma[modelName].findUnique({
    where: { id: recordId },
    select: { companyId: true },
  });

  return row?.companyId ?? null;
};

export const enrichAdminRecordCompanyIdReference = async (
  recordJson,
  { modelName } = {},
) => {
  if (!recordJson?.params) {
    return recordJson;
  }

  const companyId =
    extractReferenceId(recordJson.params.companyId) ||
    (modelName
      ? await resolveCompanyChildCompanyId(modelName, recordJson.params)
      : null);

  if (!companyId) {
    return recordJson;
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true },
  });

  const title = company?.name ?? companyId;

  recordJson.params.companyId = companyId;
  recordJson.populated = recordJson.populated ?? {};
  recordJson.populated.companyId = {
    params: { id: companyId, name: title },
    title,
  };

  return recordJson;
};

export const enrichAdminRecordUserIdReference = async (
  recordJson,
  { modelName } = {},
) => {
  if (!recordJson?.params) {
    return recordJson;
  }

  const userId =
    extractReferenceId(recordJson.params.userId) ||
    (modelName
      ? await resolveUserChildUserId(modelName, recordJson.params)
      : null);

  if (!userId) {
    return recordJson;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true },
  });

  const title = user?.username ?? userId;

  recordJson.params.userId = userId;
  recordJson.populated = recordJson.populated ?? {};
  recordJson.populated.userId = {
    params: { id: userId, username: title },
    title,
  };

  return recordJson;
};

const applyRelationFields = (data, payload, mode = "update") => {
  const nextData = { ...data };

  for (const [idField, relationField] of Object.entries(relationIdFieldMap)) {
    delete nextData[idField];

    if (!(idField in payload)) continue;

    const relationId = extractReferenceId(payload[idField]);

    if (relationId) {
      nextData[relationField] = {
        connect: { id: relationId },
      };
    } else if (mode === "update") {
      nextData[relationField] = {
        disconnect: true,
      };
    }
  }

  return nextData;
};

export const buildCompanyChildActions = (
  modelName,
  fields,
  isOneToOne = false,
) => {
  return {
    new: {
      handler: async (request, response, context) => {
        const { resource, h, currentAdmin } = context;

        if (request.method !== "post") {
          return {
            record: resource.build({}),
          };
        }

        const payload = request.payload || {};
        const companyId = extractReferenceId(payload.companyId);

        try {
          if (!companyId) {
            throw new ValidationError({
              companyId: {
                message: "انتخاب شرکت الزامی است",
              },
            });
          }

          if (isOneToOne) {
            const existing = await prisma[modelName].findUnique({
              where: { companyId },
            });

            if (existing) {
              throw new ValidationError({
                companyId: {
                  message: "برای این شرکت قبلاً این اطلاعات ثبت شده است",
                },
              });
            }
          }

          let data = mapPayloadToData(payload, fields);
          data = applyRelationFields(data, payload, "create");

          const created = await prisma[modelName].create({
            data: {
              ...data,
              company: {
                connect: {
                  id: companyId,
                },
              },
            },
          });

          return {
            record: resource.build(created).toJSON(currentAdmin),
            redirectUrl: h.resourceUrl({
              resourceId: resource.id(),
            }),
            notice: {
              message: "با موفقیت ایجاد شد",
              type: "success",
            },
          };
        } catch (error) {
          if (error instanceof ValidationError) {
            const record = resource.build(payload);
            return {
              record: {
                ...record.toJSON(currentAdmin),
                errors: error.propertyErrors,
              },
              notice: {
                message: "خطا در اعتبارسنجی",
                type: "error",
              },
            };
          }

          throw error;
        }
      },
    },

    edit: {
      handler: async (request, response, context) => {
        const { record, resource, h, currentAdmin } = context;

        if (request.method?.toLowerCase() !== "post") {
          const recordJson = record.toJSON(currentAdmin);
          await enrichAdminRecordCompanyIdReference(recordJson, { modelName });
          return {
            record: recordJson,
          };
        }

        const payload = request.payload || {};
        const companyId = extractReferenceId(payload.companyId);

        try {
          if (!companyId) {
            throw new ValidationError({
              companyId: {
                message: "انتخاب شرکت الزامی است",
              },
            });
          }

          let data = mapPayloadToData(payload, fields);
          data = applyRelationFields(data, payload, "update");

          const updated = await prisma[modelName].update({
            where: {
              id: record.params.id,
            },
            data: {
              ...data,
              company: {
                connect: {
                  id: companyId,
                },
              },
            },
          });

          return {
            record: resource.build(updated).toJSON(currentAdmin),
            redirectUrl: h.resourceUrl({
              resourceId: resource.id(),
            }),
            notice: {
              message: "با موفقیت ویرایش شد",
              type: "success",
            },
          };
        } catch (error) {
          if (error instanceof ValidationError) {
            const merged = {
              ...record.params,
              ...payload,
            };

            const rebuilt = resource.build(merged);

            return {
              record: {
                ...rebuilt.toJSON(currentAdmin),
                errors: error.propertyErrors,
              },
              notice: {
                message: "خطا در اعتبارسنجی",
                type: "error",
              },
            };
          }

          throw error;
        }
      },
    },
  };
};

export const buildUserChildActions = (
  modelName,
  fields,
  isOneToOne = false,
) => {
  return {
    new: {
      handler: async (request, response, context) => {
        const { resource, h, currentAdmin } = context;

        if (request.method !== "post") {
          return {
            record: resource.build({}),
          };
        }

        const payload = request.payload || {};
        const userId = extractReferenceId(payload.userId);

        try {
          if (!userId) {
            throw new ValidationError({
              userId: {
                message: "انتخاب کاربر الزامی است",
              },
            });
          }

          if (isOneToOne) {
            const existing = await prisma[modelName].findUnique({
              where: { userId },
            });

            if (existing) {
              throw new ValidationError({
                userId: {
                  message: "برای این کاربر قبلاً این اطلاعات ثبت شده است",
                },
              });
            }
          }

          let data = mapPayloadToData(payload, fields);
          data = applyRelationFields(data, payload, "create");

          const created = await prisma[modelName].create({
            data: {
              ...data,
              user: {
                connect: {
                  id: userId,
                },
              },
            },
          });

          return {
            record: resource.build(created).toJSON(currentAdmin),
            redirectUrl: h.resourceUrl({
              resourceId: resource.id(),
            }),
            notice: {
              message: "با موفقیت ایجاد شد",
              type: "success",
            },
          };
        } catch (error) {
          if (error instanceof ValidationError) {
            const record = resource.build(payload);

            return {
              record: {
                ...record.toJSON(currentAdmin),
                errors: error.propertyErrors,
              },
              notice: {
                message: "خطا در اعتبارسنجی",
                type: "error",
              },
            };
          }

          throw error;
        }
      },
    },

    edit: {
      handler: async (request, response, context) => {
        const { record, resource, h, currentAdmin } = context;

        if (request.method?.toLowerCase() !== "post") {
          const userId = await resolveUserChildUserId(modelName, record.params);
          if (userId) {
            record.params.userId = userId;
          }

          const populator = await getAdminJsPopulator();
          await populator([record], context);

          const recordJson = record.toJSON(currentAdmin);
          await enrichAdminRecordUserIdReference(recordJson, { modelName });
          return {
            record: recordJson,
          };
        }

        const payload = request.payload || {};
        const userId = extractReferenceId(payload.userId);

        try {
          if (!userId) {
            throw new ValidationError({
              userId: {
                message: "انتخاب کاربر الزامی است",
              },
            });
          }

          let data = mapPayloadToData(payload, fields);
          data = applyRelationFields(data, payload, "update");

          const updated = await prisma[modelName].update({
            where: {
              id: record.params.id,
            },
            data: {
              ...data,
              user: {
                connect: {
                  id: userId,
                },
              },
            },
          });

          return {
            record: resource.build(updated).toJSON(currentAdmin),
            redirectUrl: h.resourceUrl({
              resourceId: resource.id(),
            }),
            notice: {
              message: "با موفقیت ویرایش شد",
              type: "success",
            },
          };
        } catch (error) {
          if (error instanceof ValidationError) {
            const merged = {
              ...record.params,
              ...payload,
            };

            const rebuilt = resource.build(merged);

            return {
              record: {
                ...rebuilt.toJSON(currentAdmin),
                errors: error.propertyErrors,
              },
              notice: {
                message: "خطا در اعتبارسنجی",
                type: "error",
              },
            };
          }

          throw error;
        }
      },
    },
  };
};
