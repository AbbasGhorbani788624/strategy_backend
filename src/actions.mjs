import { ValidationError } from "adminjs";
import {
  extractReferenceId,
  normalizeNullableString,
  parseNullableBooleanValue,
  parseIntegerValue,
  parseDecimalValue,
} from "./component-loader.mjs";
import { prisma } from "./prisma.mjs";

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

        if (request.method !== "post") {
          return {
            record: record.toJSON(currentAdmin),
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
