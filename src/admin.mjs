import "dotenv/config";
import express from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { actions, ValidationError } from "adminjs";
import AdminJS from "adminjs";
import AdminJSExpress from "@adminjs/express";
import { Database, Resource, getModelByName } from "@adminjs/prisma";
import { PrismaClient } from "@prisma/client";
import {
  buildOptionsTextFromRecord,
  componentLoader,
  fillOptionsTextAfterLoad,
  parseBooleanValue,
  parseIntegerValue,
  parseOptionsText,
  questionTypeValues,
  validateQuestionOptions,
  Components,
} from "./component-loader.mjs";
import {
  companyBalanceSheetActions,
  companyBasicInfoActions,
  companyIncomeStatementActions,
  companyLicenseCertificateActions,
  companyManagerActions,
  companyMarketActions,
  companyMembershipActions,
  companyProductServiceActions,
  companyResourceCapabilityActions,
  companyShareholderActions,
  keyCustomerActions,
  organizationUnitActions,
  revenueCenterActions,
} from "./child-actions-map.mjs";

import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import uploadFeature from "@adminjs/upload";
import { validateProfileFieldKey } from "./profileFieldKey.mjs";
import { COMPANY_PROFILE_FIELD_OPTIONS } from "./companyProfileFieldKeys.mjs";

AdminJS.registerAdapter({
  Database,
  Resource,
});

const prisma = new PrismaClient();

const app = express();

const PORT = Number(process.env.ADMIN_PORT || 3000);
const ADMIN_ROOT_PATH = process.env.ADMIN_ROOT_PATH || "/admin";

const ADMIN_COOKIE_SECRET =
  process.env.ADMIN_COOKIE_SECRET || "unsafe-admin-cookie-secret";

const ADMIN_SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET || "unsafe-admin-session-secret";

const companyProfileNavigation = {
  name: "پروفایل شرکت",
  icon: "Building",
};
const followUpStatusValues = [
  { value: "PENDING", label: "در انتظار" },
  { value: "ANSWERED", label: "پاسخ داده شده" },
];
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.join(__dirname, "..");

const UPLOADS_ROOT = path.join(PROJECT_ROOT, "uploads");
const UPLOADS_FILES_ROOT = path.join(UPLOADS_ROOT, "file");
const ADMIN_UPLOAD_TMP = path.join(PROJECT_ROOT, "tmp", "admin-uploads");

await fs.mkdir(UPLOADS_ROOT, { recursive: true });
await fs.mkdir(UPLOADS_FILES_ROOT, { recursive: true });
await fs.mkdir(ADMIN_UPLOAD_TMP, { recursive: true });

process.env.TMP = ADMIN_UPLOAD_TMP;
process.env.TEMP = ADMIN_UPLOAD_TMP;
process.env.TMPDIR = ADMIN_UPLOAD_TMP;

app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

const prismaResource = (modelName, options = {}) => {
  const { actions, features, ...restOptions } = options;

  const resourceOptions = {
    resource: {
      model: getModelByName(modelName),
      client: prisma,
    },
    options: {
      ...restOptions,
      actions: {
        new: {
          isAccessible: true,
          before: async (request) => {
            if (request.payload?.password && modelName === "User") {
              request.payload.password = await bcrypt.hash(
                request.payload.password,
                10,
              );
            }

            if (actions?.new?.before) {
              return actions.new.before(request);
            }

            return request;
          },
        },
        edit: {
          isAccessible: true,
          before: async (request) => {
            if (request.payload?.password && modelName === "User") {
              if (request.payload.password) {
                request.payload.password = await bcrypt.hash(
                  request.payload.password,
                  10,
                );
              } else {
                delete request.payload.password;
              }
            }

            if (actions?.edit?.before) {
              return actions.edit.before(request);
            }

            return request;
          },
        },
        delete: {
          isAccessible: true,
        },
        bulkDelete: {
          isAccessible: true,
        },
        show: {
          isAccessible: true,
        },
        list: {
          isAccessible: true,
        },
        ...(actions || {}),
      },
    },
    ...(features ? { features } : {}),
  };

  return resourceOptions;
};

function validateAdminProfileFieldPayload(request) {
  if (request.method !== "post") {
    return;
  }

  const { profileFieldKey } = request.payload || {};

  try {
    validateProfileFieldKey(profileFieldKey);
  } catch (error) {
    throw new ValidationError({
      profileFieldKey: {
        message: error.message,
      },
    });
  }
}

const buildOptionsFromParams = (params) => {
  const options = [];

  Object.keys(params).forEach((key) => {
    const match = key.match(/^options\.(\d+)\.(label|value)$/);

    if (!match) return;

    const index = Number(match[1]);
    const field = match[2];

    if (!options[index]) {
      options[index] = {};
    }

    options[index][field] = params[key];
  });

  return options.filter(Boolean);
};

const formatFileSize = (bytes) => {
  if (!bytes) return "-";

  const units = ["B", "KB", "MB", "GB"];
  let size = Number(bytes);
  let unit = 0;

  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }

  return `${size.toFixed(2)} ${units[unit]}`;
};

export const companyBasicInfoResource = prismaResource("CompanyBasicInfo", {
  navigation: companyProfileNavigation,

  properties: {
    companyId: {
      reference: "Company",
      isVisible: {
        list: true,
        filter: false,
        show: true,
        edit: true,
      },
    },
  },

  actions: {
    ...companyBasicInfoActions,
  },
});

export const companyManagerResource = prismaResource("CompanyManager", {
  navigation: companyProfileNavigation,

  properties: {
    companyId: {
      reference: "Company",
      isVisible: {
        list: true,
        filter: false,
        show: true,
        edit: true,
      },
    },

    resumeFileId: {
      reference: "FileAttachment",
      isVisible: {
        list: true,
        filter: false,
        show: true,
        edit: true,
      },
    },
  },

  actions: {
    ...companyManagerActions,
  },
});

export const organizationUnitResource = prismaResource("OrganizationUnit", {
  navigation: companyProfileNavigation,

  properties: {
    companyId: {
      reference: "Company",
      isVisible: {
        list: true,
        show: true,
        edit: true,
        filter: false,
      },
    },

    structureFileId: {
      reference: "FileAttachment",
      isVisible: {
        list: true,
        show: true,
        edit: true,
        filter: false,
      },
    },
  },

  actions: {
    ...organizationUnitActions,
  },
});

export const companyLicenseCertificateResource = prismaResource(
  "CompanyLicenseCertificate",
  {
    navigation: companyProfileNavigation,

    properties: {
      companyId: {
        reference: "Company",
        isVisible: {
          list: true,
          show: true,
          edit: true,
          filter: false,
        },
      },

      attachmentFileId: {
        reference: "FileAttachment",
        isVisible: {
          list: true,
          show: true,
          edit: true,
          filter: false,
        },
      },
    },

    actions: {
      ...companyLicenseCertificateActions,
    },
  },
);

export const companyBalanceSheetResource = prismaResource(
  "CompanyBalanceSheet",
  {
    navigation: companyProfileNavigation,

    properties: {
      companyId: {
        reference: "Company",
        isVisible: {
          list: true,
          show: true,
          edit: true,
          filter: false,
        },
      },

      balanceFileId: {
        reference: "FileAttachment",
        isVisible: {
          list: true,
          show: true,
          edit: true,
          filter: false,
        },
      },
    },

    actions: {
      ...companyBalanceSheetActions,
    },
  },
);

export const companyIncomeStatementResource = prismaResource(
  "CompanyIncomeStatement",
  {
    navigation: companyProfileNavigation,

    properties: {
      companyId: {
        reference: "Company",
        isVisible: {
          list: true,
          show: true,
          edit: true,
          filter: false,
        },
      },

      incomeFileId: {
        reference: "FileAttachment",
        isVisible: {
          list: true,
          show: true,
          edit: true,
          filter: false,
        },
      },
    },

    actions: {
      ...companyIncomeStatementActions,
    },
  },
);

export const revenueCenterResource = prismaResource("RevenueCenter", {
  navigation: companyProfileNavigation,

  properties: {
    companyId: {
      reference: "Company",
      isVisible: {
        list: true,
        show: true,
        edit: true,
        filter: false,
      },
    },
  },

  actions: {
    ...revenueCenterActions,
  },
});

export const companyShareholderResource = prismaResource("CompanyShareholder", {
  navigation: companyProfileNavigation,

  properties: {
    companyId: {
      reference: "Company",
      isVisible: {
        list: true,
        show: true,
        edit: true,
        filter: false,
      },
    },
  },

  actions: {
    ...companyShareholderActions,
  },
});

export const companyMembershipResource = prismaResource("CompanyMembership", {
  navigation: companyProfileNavigation,

  properties: {
    companyId: {
      reference: "Company",
      isVisible: {
        list: true,
        show: true,
        edit: true,
        filter: false,
      },
    },
  },

  actions: {
    ...companyMembershipActions,
  },
});

export const companyProductServiceResource = prismaResource(
  "CompanyProductService",
  {
    navigation: companyProfileNavigation,

    properties: {
      companyId: {
        reference: "Company",
        isVisible: {
          list: true,
          show: true,
          edit: true,
          filter: false,
        },
      },
    },

    actions: {
      ...companyProductServiceActions,
    },
  },
);

export const companyMarketResource = prismaResource("CompanyMarket", {
  navigation: companyProfileNavigation,

  properties: {
    companyId: {
      reference: "Company",
      isVisible: {
        list: true,
        show: true,
        edit: true,
        filter: false,
      },
    },
  },

  actions: {
    ...companyMarketActions,
  },
});

export const keyCustomerResource = prismaResource("KeyCustomer", {
  navigation: companyProfileNavigation,

  properties: {
    companyId: {
      reference: "Company",
      isVisible: {
        list: true,
        show: true,
        edit: true,
        filter: false,
      },
    },
  },

  actions: {
    ...keyCustomerActions,
  },
});

export const companyResourceCapabilityResource = prismaResource(
  "CompanyResourceCapability",
  {
    navigation: companyProfileNavigation,

    properties: {
      companyId: {
        reference: "Company",
        isVisible: {
          list: true,
          show: true,
          edit: true,
          filter: false,
        },
      },
    },

    actions: {
      ...companyResourceCapabilityActions,
    },
  },
);

const fileAttachmentResource = {
  resource: {
    model: getModelByName("FileAttachment"),
    client: prisma,
  },
  options: {
    navigation: {
      name: "مدیریت فایل‌ها",
      icon: "Attachment",
    },

    properties: {
      id: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
        },
      },
      owner: {
        isVisible: {
          list: true,
          show: true,
          edit: false,
          filter: false,
        },
      },

      uploadFile: {
        isVisible: {
          list: false,
          filter: false,
          show: false,
          edit: true,
        },
      },

      uploadKey: {
        isVisible: {
          list: false,
          filter: false,
          show: false,
          edit: false,
        },
      },

      filePath: {
        isVisible: {
          list: true,
          show: true,
          edit: false,
          filter: false,
        },

        components: {
          list: Components.DownloadFile,
          show: Components.DownloadFile,
        },
      },

      originalName: {
        isVisible: {
          list: true,
          show: true,
          edit: false,
          filter: false,
        },
      },

      fileName: {
        isTitle: true,
        isVisible: {
          list: false,
          show: true,
          edit: false,
          filter: false,
        },
      },

      extension: {
        isVisible: {
          list: true,
          show: true,
          edit: false,
          filter: true,
        },
      },

      mimeType: {
        isVisible: {
          list: false,
          show: true,
          edit: false,
          filter: true,
        },
      },

      size: {
        isVisible: {
          list: true,
          show: true,
          edit: false,
          filter: false,
        },
      },

      uploadedById: {
        isVisible: {
          list: false,
          show: true,
          edit: false,
          filter: true,
        },
      },

      uploadedBy: {
        isVisible: {
          list: false,
          show: false,
          edit: false,
          filter: false,
        },
      },

      createdAt: {
        isVisible: {
          list: true,
          show: true,
          edit: false,
          filter: true,
        },
      },

      updatedAt: {
        isVisible: {
          list: false,
          show: true,
          edit: false,
          filter: true,
        },
      },
    },

    actions: {
      list: {
        after: async (response) => {
          if (!response.records.length) {
            return response;
          }

          const fileIds = response.records.map((record) => record.params.id);

          const [
            managers,
            organizationUnits,
            licenses,
            balanceSheets,
            incomeStatements,
          ] = await Promise.all([
            prisma.companyManager.findMany({
              where: {
                resumeFileId: {
                  in: fileIds,
                },
              },
              select: {
                resumeFileId: true,
                fullName: true,
              },
            }),

            prisma.organizationUnit.findMany({
              where: {
                structureFileId: {
                  in: fileIds,
                },
              },
              select: {
                structureFileId: true,
                unitName: true,
              },
            }),

            prisma.companyLicenseCertificate.findMany({
              where: {
                attachmentFileId: {
                  in: fileIds,
                },
              },
              select: {
                attachmentFileId: true,
                title: true,
              },
            }),

            prisma.companyBalanceSheet.findMany({
              where: {
                balanceFileId: {
                  in: fileIds,
                },
              },
              select: {
                balanceFileId: true,
                title: true,
              },
            }),

            prisma.companyIncomeStatement.findMany({
              where: {
                incomeFileId: {
                  in: fileIds,
                },
              },
              select: {
                incomeFileId: true,
                title: true,
              },
            }),
          ]);

          const ownerMap = Object.create(null);

          for (const manager of managers) {
            ownerMap[manager.resumeFileId] = `رزومه مدیر: ${manager.fullName}`;
          }

          for (const item of organizationUnits) {
            ownerMap[item.structureFileId] = `چارت سازمانی: ${item.unitName}`;
          }

          for (const item of licenses) {
            ownerMap[item.attachmentFileId] = `گواهی / مجوز: ${item.title}`;
          }

          for (const item of balanceSheets) {
            ownerMap[item.balanceFileId] = `ترازنامه: ${item.title}`;
          }

          for (const item of incomeStatements) {
            ownerMap[item.incomeFileId] = `صورت سود و زیان: ${item.title}`;
          }

          for (const record of response.records) {
            record.params.owner = ownerMap[record.params.id] || "-";
          }

          return response;
        },
      },
      new: {
        before: async (request, context) => {
          if (request.method !== "post") return request;

          const uploadedFile = request.payload?.uploadFile;

          if (uploadedFile) {
            request.payload.originalName = uploadedFile.name;

            request.payload.extension = path
              .extname(uploadedFile.name)
              .replace(".", "")
              .toLowerCase();

            request.payload.fileName = uploadedFile.name;
          }

          if (!request.payload.originalName) {
            request.payload.originalName = "unknown";
          }

          if (!request.payload.fileName) {
            request.payload.fileName = "unknown";
          }

          request.payload.filePath = "";

          return request;
        },

        after: async (response) => {
          const recordId = response.record?.params?.id;
          const uploadKey = response.record?.params?.uploadKey;

          if (recordId && uploadKey) {
            const filePath = `/uploads/${uploadKey}`;

            await prisma.fileAttachment.update({
              where: {
                id: recordId,
              },
              data: {
                filePath,
              },
            });
          }

          return response;
        },
      },

      edit: {
        before: async (request) => {
          if (request.method !== "post") return request;

          const uploadedFile = request.payload?.uploadFile;

          if (uploadedFile) {
            request.payload.originalName = uploadedFile.name;

            request.payload.extension = path
              .extname(uploadedFile.name)
              .replace(".", "")
              .toLowerCase();

            request.payload.fileName = uploadedFile.name;
          }

          return request;
        },

        after: async (response) => {
          const recordId = response.record?.params?.id;
          const uploadKey = response.record?.params?.uploadKey;

          if (recordId && uploadKey) {
            const filePath = `/uploads/${uploadKey}`;

            await prisma.fileAttachment.update({
              where: {
                id: recordId,
              },
              data: {
                filePath,
              },
            });
          }

          return response;
        },
      },
    },
  },

  features: [
    uploadFeature({
      componentLoader,

      provider: {
        local: {
          bucket: UPLOADS_ROOT,
          opts: {
            baseUrl: "/uploads",
          },
        },
      },

      properties: {
        key: "uploadKey",
        file: "uploadFile",
        mimeType: "mimeType",
        size: "size",
        filename: "fileName",
      },

      uploadPath: (record, filename) => {
        return `file/${Date.now()}-${filename}`;
      },

      validation: {
        maxSize: 5 * 1024 * 1024,
      },
    }),
  ],
};

const admin = new AdminJS({
  rootPath: ADMIN_ROOT_PATH,
  componentLoader,
  branding: {
    companyName: "Strategy Proposal Admin",
    softwareBrothers: false,
    withMadeWithLove: false,
  },

  locale: {
    language: "fa",
    translations: {
      labels: {
        ProjectComment: "کامنت ها",
        User: "کاربران",
        Company: "شرکت‌ها",
        Project: "پروژه‌ها",
        AnalysisForm: "فرم‌های تحلیل",
        FormQuestion: "سوالات فرم تحلیل",
        FormGoal: "اهداف فرم تحلیل",
        ProjectGoal: "اهداف پروژه",
        ChatMessage: "پیام‌های چت",
        Notification: "اعلان‌ها",
        RefreshToken: "رفرش توکن‌ها",
        ProjectAccess: "دسترسی پروژه",
        ProfileViewAccess: "دسترسی مشاهده پروفایل",
        CompanyAdminData: "داده‌های ادمین شرکت",
        ProjectRatingHistory: "امتیازدهی پروژه",
        MultiAnalysisForm: "فرم تحلیل چندگانه",
        MultiAnalysisRequiredForm: "فرم‌های موردنیاز تحلیل چندگانه",
        MultiAnalysisGoal: "اهداف تحلیل چندگانه",
        ProjectMultiGoal: "اهداف چندگانه پروژه",
        MultiAnalysisProjectSource: "منابع پروژه چندگانه",
        FollowUpForm: "فرم‌های پیگیری",
        FollowUpFormQuestion: "سوالات فرم پیگیری",
        FollowUpRequest: "درخواست‌های پیگیری",
        PromptDefinition: "تعریف پرامپت",
        PromptSegmentDefinition: "سگمنت‌های پرامپت",
        PromptVersion: "نسخه‌های پرامپت",
        PromptVersionSegmentValue: "مقادیر سگمنت نسخه پرامپت",
      },
      buttons: {
        save: "ذخیره",
        addNewItem: "افزودن",
        filter: "فیلتر",
        applyChanges: "اعمال تغییرات",
        resetFilter: "حذف فیلتر",
        confirmRemovalMany: "تایید حذف",
        confirmRemovalMany_plural: "تایید حذف",
        logout: "خروج",
        login: "ورود",
      },
      actions: {
        new: "ایجاد",
        edit: "ویرایش",
        show: "نمایش",
        delete: "حذف",
        bulkDelete: "حذف گروهی",
        list: "لیست",
      },
      messages: {
        successfullyBulkDeleted: "موارد انتخاب‌شده با موفقیت حذف شدند",
        successfullyBulkDeleted_plural: "موارد انتخاب‌شده با موفقیت حذف شدند",
        successfullyDeleted: "با موفقیت حذف شد",
        successfullyUpdated: "با موفقیت ویرایش شد",
        successfullyCreated: "با موفقیت ایجاد شد",
      },
    },
  },
  resources: [
    prismaResource("Company", {
      navigation: {
        name: "مدیریت شرکت‌ها",
        icon: "Building",
      },
      properties: {
        name: { isTitle: true },
        userLimit: {
          type: "number",
          help: "حداکثر تعداد کاربران مجاز برای این شرکت",
        },
      },
      listProperties: ["id", "name", "industry", "userLimit", "createdAt"],
      editProperties: ["name", "industry", "userLimit"],
    }),
    companyBasicInfoResource,
    companyManagerResource,
    organizationUnitResource,
    companyLicenseCertificateResource,
    companyBalanceSheetResource,
    companyIncomeStatementResource,
    revenueCenterResource,
    companyShareholderResource,
    companyMembershipResource,
    companyProductServiceResource,
    companyMarketResource,
    keyCustomerResource,
    companyResourceCapabilityResource,
    fileAttachmentResource,
    prismaResource("ProjectComment", {
      navigation: {
        name: "پروژه‌ها",
        icon: "MessageSquare",
      },

      properties: {
        id: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: false,
          },
        },

        user: {
          reference: "User",
          isVisible: {
            list: false,
            filter: true,
            show: false,
            edit: false,
          },
        },
        project: {
          reference: "Project",
          isVisible: {
            list: false,
            filter: true,
            show: false,
            edit: false,
          },
        },
        content: {
          type: "textarea",
          isVisible: {
            list: false,
            filter: false,
            show: true,
            edit: true,
          },
        },

        projectId: {
          isVisible: false,
        },

        userId: {
          isVisible: false,
        },

        projectName: {
          type: "string",
          isVirtual: true,
          label: "پروژه",
          isVisible: {
            list: true,
            show: true,
            edit: false,
            filter: false,
          },
        },

        username: {
          type: "string",
          isVirtual: true,
          label: "کاربر",
          isVisible: {
            list: true,
            show: true,
            edit: false,
            filter: false,
          },
        },

        createdAt: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: false,
          },
        },

        updatedAt: {
          isVisible: {
            list: false,
            filter: true,
            show: true,
            edit: false,
          },
        },
      },

      listProperties: ["id", "projectName", "username", "createdAt"],

      showProperties: [
        "id",
        "projectName",
        "username",
        "content",
        "createdAt",
        "updatedAt",
      ],

      editProperties: ["content"],

      filterProperties: ["user", "project", "createdAt", "updatedAt"],
      actions: {
        list: {
          after: async (response) => {
            if (!response.records?.length) {
              return response;
            }

            const projectIds = [
              ...new Set(
                response.records
                  .map((record) => record.params.project)
                  .filter(Boolean),
              ),
            ];

            const userIds = [
              ...new Set(
                response.records
                  .map((record) => record.params.user)
                  .filter(Boolean),
              ),
            ];

            const [projects, users] = await Promise.all([
              prisma.project.findMany({
                where: {
                  id: {
                    in: projectIds,
                  },
                },
                select: {
                  id: true,
                  title: true,
                },
              }),

              prisma.user.findMany({
                where: {
                  id: {
                    in: userIds,
                  },
                },
                select: {
                  id: true,
                  username: true,
                },
              }),
            ]);

            const projectMap = Object.fromEntries(
              projects.map((project) => [project.id, project.title]),
            );

            const userMap = Object.fromEntries(
              users.map((user) => [user.id, user.username]),
            );

            response.records.forEach((record) => {
              record.params.projectName =
                projectMap[record.params.project] || "—";

              record.params.username = userMap[record.params.user] || "—";
            });

            return response;
          },
        },

        show: {
          after: async (response) => {
            if (!response.record) {
              return response;
            }

            const record = response.record;

            const [project, user] = await Promise.all([
              record.params.project
                ? prisma.project.findUnique({
                    where: {
                      id: record.params.project,
                    },
                    select: {
                      title: true,
                    },
                  })
                : null,

              record.params.user
                ? prisma.user.findUnique({
                    where: {
                      id: record.params.user,
                    },
                    select: {
                      username: true,
                    },
                  })
                : null,
            ]);

            record.params.projectName = project?.title || "—";
            record.params.username = user?.username || "—";

            return response;
          },
        },
      },
    }),
    prismaResource("User", {
      navigation: {
        name: "مدیریت کاربران",
        icon: "User",
      },

      properties: {
        id: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: false,
          },
        },

        username: {
          isTitle: true,
          isRequired: true,
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: true,
          },
        },

        password: {
          isVisible: {
            list: false,
            filter: false,
            show: false,
            edit: true,
          },
        },

        email: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: true,
          },
        },

        phoneNumber: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: true,
          },
        },

        role: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: true,
          },
        },

        companyId: {
          reference: "Company",
          isVisible: {
            list: false,
            filter: false,
            show: false,
            edit: true,
          },
        },

        company: {
          reference: "Company",
          isVisible: {
            list: false,
            filter: true,
            show: false,
            edit: false,
          },
        },

        companyName: {
          type: "string",
          isVirtual: true,
          label: "شرکت",
          isVisible: {
            list: true,
            filter: false,
            show: true,
            edit: false,
          },
        },

        createdAt: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: false,
          },
        },

        updatedAt: {
          isVisible: {
            list: false,
            filter: true,
            show: true,
            edit: false,
          },
        },

        company: {
          isVisible: false,
        },
      },

      listProperties: ["id", "username", "role", "companyName", "createdAt"],

      filterProperties: ["username", "role", "createdAt", "company"],

      showProperties: [
        "id",
        "username",
        "role",
        "companyName",
        "createdAt",
        "updatedAt",
      ],

      editProperties: ["username", "password", "role", "companyId"],

      actions: {
        list: {
          after: async (response) => {
            if (!response.records?.length) return response;

            const companyIds = [
              ...new Set(
                response.records.map((r) => r.params.company).filter(Boolean),
              ),
            ];

            const companies = await prisma.company.findMany({
              where: {
                id: {
                  in: companyIds,
                },
              },
              select: {
                id: true,
                name: true,
              },
            });

            const companyMap = Object.fromEntries(
              companies.map((c) => [c.id, c.name]),
            );

            response.records.forEach((record) => {
              record.params.companyName =
                companyMap[record.params.company] ?? "—";
            });

            return response;
          },
        },
        show: {
          after: async (response) => {
            if (!response.record) return response;

            const companyId = response.record.params.company;

            if (companyId) {
              const company = await prisma.company.findUnique({
                where: {
                  id: companyId,
                },
                select: {
                  name: true,
                },
              });

              response.record.params.companyName = company?.name ?? "—";
            } else {
              response.record.params.companyName = "—";
            }

            return response;
          },
        },
        new: {
          handler: async (request, response, context) => {
            const { resource, h, currentAdmin } = context;

            if (request.method === "get") {
              return {
                resource: resource.decorate().toJSON(currentAdmin),
                record: null,
              };
            }

            const payload = request.payload ?? {};

            const username = payload.username;
            const password = payload.password;
            const email = payload.email;
            const phoneNumber = payload.phoneNumber;
            const role = payload.role;
            const companyId = payload.companyId;
            const profile = payload.profile;
            const progress = payload.progress;
            const profileCompleted = payload.profileCompleted;

            const errors = {};

            if (!username || !String(username).trim()) {
              errors.username = { message: "نام کاربری الزامی است." };
            }

            if (!password || !String(password).trim()) {
              errors.password = { message: "رمز عبور الزامی است." };
            }

            if (!role || !String(role).trim()) {
              errors.role = { message: "نقش کاربر الزامی است." };
            }

            if (Object.keys(errors).length > 0) {
              throw new ValidationError(errors);
            }

            try {
              const hashedPassword = await bcrypt.hash(String(password), 10);

              const data = {
                username: String(username).trim(),
                password: hashedPassword,
                email: email ? String(email).trim() : null,
                phoneNumber: phoneNumber ? String(phoneNumber).trim() : null,
                role: String(role).trim(),
                profile: profile ?? null,
                progress: progress ?? null,
                profileCompleted:
                  profileCompleted === true ||
                  profileCompleted === "true" ||
                  profileCompleted === "on",
              };

              if (companyId && String(companyId).trim()) {
                data.company = {
                  connect: {
                    id: String(companyId).trim(),
                  },
                };
              }

              const created = await prisma.user.create({
                data,
              });

              const record = await resource.findOne(created.id);

              return {
                record: record?.toJSON(currentAdmin),
                notice: {
                  message: "کاربر با موفقیت ایجاد شد.",
                  type: "success",
                },
                redirectUrl: h.recordActionUrl({
                  resourceId: resource.id(),
                  recordId: created.id,
                  actionName: "show",
                }),
              };
            } catch (error) {
              console.error("USER_CREATE_ERROR:", error);

              if (error instanceof ValidationError) {
                throw error;
              }

              throw new ValidationError({
                companyId: {
                  message:
                    "شرکت واردشده معتبر نیست یا ایجاد ارتباط با شرکت ممکن نشد.",
                },
              });
            }
          },
        },

        edit: {
          handler: async (request, response, context) => {
            const { record, resource, h, currentAdmin } = context;

            if (!record) {
              throw new Error("Record not found");
            }

            if (request.method === "get") {
              return {
                record: record.toJSON(currentAdmin),
                resource: resource.decorate().toJSON(currentAdmin),
              };
            }

            const payload = request.payload ?? {};

            const username = payload.username;
            const password = payload.password;
            const email = payload.email;
            const phoneNumber = payload.phoneNumber;
            const role = payload.role;
            const companyId = payload.companyId;
            const profile = payload.profile;
            const progress = payload.progress;
            const profileCompleted = payload.profileCompleted;

            const errors = {};

            if (!username || !String(username).trim()) {
              errors.username = { message: "نام کاربری الزامی است." };
            }

            if (!role || !String(role).trim()) {
              errors.role = { message: "نقش کاربر الزامی است." };
            }

            if (Object.keys(errors).length > 0) {
              throw new ValidationError(errors);
            }

            try {
              const data = {
                username: String(username).trim(),
                email: email ? String(email).trim() : null,
                phoneNumber: phoneNumber ? String(phoneNumber).trim() : null,
                role: String(role).trim(),
                profile: profile ?? null,
                progress: progress ?? null,
                profileCompleted:
                  profileCompleted === true ||
                  profileCompleted === "true" ||
                  profileCompleted === "on",
              };

              if (password && String(password).trim()) {
                const passwordValue = String(password).trim();

                if (
                  passwordValue.startsWith("$2a$") ||
                  passwordValue.startsWith("$2b$") ||
                  passwordValue.startsWith("$2y$")
                ) {
                  data.password = passwordValue;
                } else {
                  data.password = await bcrypt.hash(passwordValue, 10);
                }
              }

              if (companyId && String(companyId).trim()) {
                data.company = {
                  connect: {
                    id: String(companyId).trim(),
                  },
                };
              } else {
                data.company = {
                  disconnect: true,
                };
              }

              const updated = await prisma.user.update({
                where: {
                  id: String(record.param("id")),
                },
                data,
              });

              const refreshed = await resource.findOne(updated.id);

              return {
                record: refreshed?.toJSON(currentAdmin),
                notice: {
                  message: "کاربر با موفقیت ویرایش شد.",
                  type: "success",
                },
                redirectUrl: h.recordActionUrl({
                  resourceId: resource.id(),
                  recordId: updated.id,
                  actionName: "show",
                }),
              };
            } catch (error) {
              console.error("USER_UPDATE_ERROR:", error);

              if (error instanceof ValidationError) {
                throw error;
              }

              throw new ValidationError({
                companyId: {
                  message:
                    "شرکت واردشده معتبر نیست یا به‌روزرسانی ارتباط با شرکت ممکن نشد.",
                },
              });
            }
          },
        },
      },
    }),
    prismaResource("CompanyAdminData", {
      navigation: {
        name: "مدیریت کاربران",
        icon: "Database",
      },

      properties: {
        id: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: false,
          },
        },

        company: {
          reference: "Company",
          isVisible: {
            list: false,
            filter: true,
            show: false,
            edit: false,
          },
        },

        dataText: {
          type: "textarea",
          position: 2,
          isVisible: {
            list: false,
            filter: false,
            show: true,
            edit: true,
          },
          props: {
            rows: 20,
          },
          description: "متن ساده را وارد کنید",
        },

        data: {
          type: "mixed",
          isVisible: {
            list: false,
            filter: false,
            show: false,
            edit: false,
          },
        },
        companyId: {
          reference: "Company",
          label: "شرکت",
          isVisible: {
            list: false,
            filter: false,
            show: true,
            edit: true,
          },
        },

        company: {
          reference: "Company",
          isVisible: {
            list: false,
            filter: true,
            show: false,
            edit: false,
          },
        },

        companyName: {
          type: "string",
          isVirtual: true,
          label: "نام شرکت",
          isVisible: {
            list: true,
            filter: false,
            show: false,
            edit: false,
          },
        },

        createdAt: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: false,
          },
        },

        updatedAt: {
          isVisible: {
            list: false,
            filter: true,
            show: true,
            edit: false,
          },
        },
      },
      filterProperties: ["company", "createdAt"],
      listProperties: ["id", "companyName", "createdAt"],
      editProperties: ["companyId", "dataText"],
      showProperties: [
        "id",
        "companyName",
        "dataText",
        "createdAt",
        "updatedAt",
      ],
      actions: {
        new: {
          handler: async (request, response, context) => {
            const { resource, h, currentAdmin } = context;

            if (request.method !== "post") {
              return {
                record: resource.build({}),
              };
            }

            try {
              const companyId = String(request.payload?.companyId || "").trim();
              const dataText = String(request.payload?.dataText || "");

              if (!companyId) {
                throw new ValidationError({
                  companyId: {
                    message: "شناسه شرکت الزامی است",
                  },
                });
              }

              // بررسی وجود شرکت
              const companyExists = await prisma.company.findUnique({
                where: { id: companyId },
              });

              if (!companyExists) {
                throw new ValidationError({
                  companyId: {
                    message: "شرکتی با این شناسه پیدا نشد",
                  },
                });
              }

              const created = await prisma.companyAdminData.create({
                data: {
                  companyId,
                  data: {
                    text: dataText,
                  },
                },
              });

              const record = resource.build({
                ...created,
                dataText: created?.data?.text || "",
              });

              return {
                record: record.toJSON(currentAdmin),
                redirectUrl: h.resourceUrl({
                  resourceId: resource._decorated?.id() || resource.id(),
                }),
                notice: {
                  message: "اطلاعات با موفقیت ایجاد شد",
                  type: "success",
                },
              };
            } catch (error) {
              if (error instanceof ValidationError) {
                return {
                  record: resource.build(request.payload).toJSON(currentAdmin),
                  notice: {
                    message: "خطای اعتبارسنجی",
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
            const { record, resource, currentAdmin, h } = context;

            if (!record) {
              throw new Error("رکورد پیدا نشد");
            }

            if (request.method !== "post") {
              const raw = record.params?.data;

              record.params.dataText =
                raw?.text || record.params["data.text"] || "";

              return {
                record: record.toJSON(currentAdmin),
              };
            }

            try {
              const companyId = String(request.payload?.companyId || "").trim();
              const dataText = String(request.payload?.dataText || "");

              if (!companyId) {
                throw new ValidationError({
                  companyId: {
                    message: "شناسه شرکت الزامی است",
                  },
                });
              }

              const companyExists = await prisma.company.findUnique({
                where: { id: companyId },
              });

              if (!companyExists) {
                throw new ValidationError({
                  companyId: {
                    message: "شرکتی با این شناسه پیدا نشد",
                  },
                });
              }

              const updated = await prisma.companyAdminData.update({
                where: {
                  id: record.params.id,
                },
                data: {
                  companyId,
                  data: {
                    text: dataText,
                  },
                },
              });

              const updatedRecord = resource.build({
                ...updated,
                dataText: updated?.data?.text || "",
              });

              return {
                record: updatedRecord.toJSON(currentAdmin),
                redirectUrl: h.recordActionUrl({
                  resourceId: resource._decorated?.id() || resource.id(),
                  recordId: record.params.id,
                  actionName: "show",
                }),
                notice: {
                  message: "اطلاعات با موفقیت ویرایش شد",
                  type: "success",
                },
              };
            } catch (error) {
              if (error instanceof ValidationError) {
                return {
                  record: resource
                    .build({
                      ...record.params,
                      ...request.payload,
                    })
                    .toJSON(currentAdmin),
                  notice: {
                    message: "خطای اعتبارسنجی",
                    type: "error",
                  },
                };
              }

              throw error;
            }
          },
        },

        show: {
          after: async (response) => {
            if (!response.record) return response;

            const companyId = response.record.params.company;

            if (companyId) {
              const company = await prisma.company.findUnique({
                where: { id: companyId },
                select: { name: true },
              });

              response.record.params.companyName = company?.name ?? "—";
            } else {
              response.record.params.companyName = "—";
            }

            const rawData = response.record.params.data;

            response.record.params.dataText =
              rawData?.text || response.record.params["data.text"] || "";

            return response;
          },
        },

        list: {
          after: async (response) => {
            if (!response.records?.length) return response;

            // dataText
            response.records = response.records.map((record) => {
              const rawData = record.params.data;
              record.params.dataText =
                rawData?.text || record.params["data.text"] || "";
              return record;
            });

            // fetch اسم شرکت‌ها
            const companyIds = [
              ...new Set(
                response.records.map((r) => r.params.company).filter(Boolean),
              ),
            ];

            const companyMap = {};

            if (companyIds.length > 0) {
              const companies = await prisma.company.findMany({
                where: { id: { in: companyIds } },
                select: { id: true, name: true },
              });

              companies.forEach((c) => {
                companyMap[c.id] = c.name;
              });
            }

            response.records = response.records.map((record) => {
              const companyId = record.params.company;
              const name = companyId ? (companyMap[companyId] ?? "—") : "—";

              record.populated = record.populated ?? {};
              record.populated["companyId"] = {
                params: { id: companyId, name },
                title: name,
              };

              record.params["companyName"] = name;
              return record;
            });

            return response;
          },
        },
      },
    }),
    prismaResource("ProfileViewAccess", {
      navigation: {
        name: "دسترسی‌ها",
        icon: "View",
      },
      properties: {
        userId: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },
        companyId: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },
        section: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },
      },
      listProperties: ["id", "userId", "companyId", "section"],
      editProperties: ["userId", "companyId", "section"],
    }),
    prismaResource("ProjectAccess", {
      navigation: {
        name: "دسترسی‌ها",
        icon: "Lock",
      },
      properties: {
        projectId: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },
        userId: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },
      },
      listProperties: ["id", "projectId", "userId", "createdAt"],
      editProperties: ["projectId", "userId"],
    }),
    prismaResource("Project", {
      navigation: {
        name: "پروژه‌ها",
        icon: "Folder",
      },
      properties: {
        title: {
          isTitle: true,
        },

        formResponses: { type: "mixed" },
        initialAnalysis: { type: "textarea" },
        riskAnalysis: { type: "textarea" },
        finalAnalysis: { type: "textarea" },

        averageRating: {
          isVisible: { list: true, filter: false, show: true, edit: false },
        },

        ratingCount: {
          isVisible: { list: true, filter: false, show: true, edit: false },
        },

        // hasRating: {
        //   isVisible: { list: true, filter: false, show: true, edit: false },
        // },

        createdAt: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },

        updatedAt: {
          isVisible: { list: false, filter: true, show: true, edit: false },
        },
        companyId: {
          isVisible: false,
        },

        formId: {
          isVisible: false,
        },

        multiAnalysisFormId: {
          isVisible: false,
        },

        promptVersionId: {
          isVisible: false,
        },

        username: {
          type: "string",
          isVirtual: true,
          label: "نام کاربری",
          isVisible: {
            list: true,
            filter: false,
            show: true,
            edit: false,
          },
        },

        companyName: {
          type: "string",
          isVirtual: true,
          label: "نام شرکت",
          isVisible: {
            list: true,
            filter: false,
            show: true,
            edit: false,
          },
        },

        formName: {
          type: "string",
          isVirtual: true,
          label: "فرم",
          isVisible: {
            list: true,
            filter: false,
            show: true,
            edit: false,
          },
        },
        riskPercentage: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: true,
          },
        },

        keyStrategicInsights: {
          type: "textarea",
          isVisible: {
            list: false,
            filter: false,
            show: true,
            edit: true,
          },
        },
        creator: {
          reference: "User",
          isVisible: {
            list: false,
            filter: true,
            show: false,
            edit: false,
          },
        },
        creatorId: {
          reference: "User",
          isVisible: {
            list: false,
            filter: false,
            show: false,
            edit: true,
          },
        },
      },

      filterProperties: ["title", "creator", "mode", "status", "createdAt"],
      showProperties: [
        "id",
        "title",
        "username",
        "companyName",
        "formName",
        "mode",
        "status",
        "createdAt",
        "updatedAt",

        "initialAnalysis",
        "riskAnalysis",
        "finalAnalysis",

        "riskPercentage",
        "keyStrategicInsights",

        "averageRating",
        "ratingCount",
      ],

      editProperties: [
        "title",
        "mode",
        "status",
        "formResponses",
        "creatorId",
        "initialAnalysis",
        "riskAnalysis",
        "finalAnalysis",
        "riskPercentage",
        "keyStrategicInsights",
      ],

      listProperties: [
        "id",
        "title",
        "username",
        "companyName",
        "formName",
        "mode",
        "status",
        "averageRating",
        "ratingCount",
        // "hasRating",
        "createdAt",
      ],

      actions: {
        list: {
          before: async (request) => {
            console.log("QUERY");
            console.dir(request.query, { depth: null });

            return request;
          },
          after: async (response) => {
            if (!response.records?.length) return response;

            const creatorIds = [
              ...new Set(
                response.records.map((r) => r.params.creator).filter(Boolean),
              ),
            ];

            const companyIds = [
              ...new Set(
                response.records.map((r) => r.params.company).filter(Boolean),
              ),
            ];

            const formIds = [
              ...new Set(
                response.records.map((r) => r.params.form).filter(Boolean),
              ),
            ];

            const [creators, companies, forms] = await Promise.all([
              prisma.user.findMany({
                where: { id: { in: creatorIds } },
                select: { id: true, username: true },
              }),

              prisma.company.findMany({
                where: { id: { in: companyIds } },
                select: { id: true, name: true },
              }),

              prisma.analysisForm.findMany({
                where: { id: { in: formIds } },
                select: { id: true, title: true },
              }),
            ]);

            const creatorMap = Object.fromEntries(
              creators.map((u) => [u.id, u.username]),
            );

            const companyMap = Object.fromEntries(
              companies.map((c) => [c.id, c.name]),
            );

            const formMap = Object.fromEntries(
              forms.map((f) => [f.id, f.title]),
            );

            response.records.forEach((record) => {
              record.params.username = creatorMap[record.params.creator] || "—";

              record.params.companyName =
                companyMap[record.params.company] || "—";

              record.params.formName = formMap[record.params.form] || "—";
            });

            return response;
          },
        },

        show: {
          after: async (response) => {
            if (!response.record) return response;

            const record = response.record;

            const [creator, company, form] = await Promise.all([
              record.params.creator
                ? prisma.user.findUnique({
                    where: { id: record.params.creator },
                    select: { username: true },
                  })
                : null,

              record.params.company
                ? prisma.company.findUnique({
                    where: { id: record.params.company },
                    select: { name: true },
                  })
                : null,

              record.params.form
                ? prisma.analysisForm.findUnique({
                    where: { id: record.params.form },
                    select: { title: true },
                  })
                : null,
            ]);

            record.params.username = creator?.username || "—";
            record.params.companyName = company?.name || "—";
            record.params.formName = form?.title || "—";

            return response;
          },
        },
      },
    }),
    prismaResource("ProjectRatingHistory", {
      navigation: {
        name: "پروژه‌ها",
        icon: "Star",
      },

      properties: {
        id: {
          isVisible: false,
        },

        projectId: {
          label: "پروژه",
          reference: "Project",
          isRequired: true,
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: true,
          },
        },

        project: {
          reference: "Project",
          label: "پروژه",
        },

        rater: {
          reference: "User",
          label: "امتیازدهنده",
        },

        score: {
          label: "امتیاز",
          isRequired: true,
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: true,
          },
        },

        createdAt: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: false,
          },
        },
      },

      listProperties: ["project", "rater", "score", "createdAt"],
      showProperties: ["project", "rater", "score", "createdAt"],
      editProperties: ["projectId", "score"],

      filterProperties: ["project", "rater", "score", "createdAt"],
      actions: {
        list: {
          after: async (response) => {
            return response;
          },
        },
        new: {
          handler: async (request, response, context) => {
            const { resource, h, currentAdmin } = context;

            if (request.method === "get") {
              return {
                resource: resource.decorate().toJSON(currentAdmin),
                record: null,
              };
            }

            const payload = request.payload ?? {};
            const { projectId, score } = payload;
            const numericScore = Number.parseInt(score, 10);

            const errors = {};
            if (!projectId) {
              errors.projectId = { message: "انتخاب پروژه الزامی است." };
            }
            if (
              !Number.isInteger(numericScore) ||
              numericScore < 1 ||
              numericScore > 5
            ) {
              errors.score = { message: "امتیاز باید عددی بین ۱ تا ۵ باشد." };
            }

            if (Object.keys(errors).length > 0) {
              throw new ValidationError(errors);
            }

            try {
              const createdHistory = await prisma.$transaction(async (tx) => {
                const history = await tx.projectRatingHistory.upsert({
                  where: {
                    projectId_raterId: {
                      projectId: String(projectId),
                      raterId: currentAdmin.id,
                    },
                  },
                  update: {
                    score: numericScore,
                  },
                  create: {
                    projectId: String(projectId),
                    raterId: currentAdmin.id,
                    score: numericScore,
                  },
                });

                const stats = await tx.projectRatingHistory.aggregate({
                  where: { projectId: String(projectId) },
                  _avg: { score: true },
                  _count: { score: true },
                });

                await tx.project.update({
                  where: { id: String(projectId) },
                  data: {
                    averageRating: stats._avg.score || 0,
                    ratingCount: stats._count.score || 0,
                    hasRating: (stats._count.score || 0) > 0,
                  },
                });

                return history;
              });

              const record = await resource.findOne(createdHistory.id);

              return {
                record: record?.toJSON(currentAdmin),
                notice: {
                  message: "امتیاز با موفقیت ثبت و آمار پروژه بروزرسانی شد.",
                  type: "success",
                },
                redirectUrl: h.resourceActionUrl({
                  resourceId: resource.id(),
                  actionName: "list",
                }),
              };
            } catch (error) {
              console.error("RATING_CREATE_ERROR:", error);
              throw new ValidationError({
                projectId: { message: "خطا در ثبت اطلاعات در دیتابیس." },
              });
            }
          },
        },

        edit: {
          handler: async (request, response, context) => {
            const { record, resource, h, currentAdmin } = context;

            if (!record) throw new Error("رکورد پیدا نشد.");

            if (request.method === "get") {
              return {
                record: record.toJSON(currentAdmin),
                resource: resource.decorate().toJSON(currentAdmin),
              };
            }

            const payload = request.payload ?? {};
            const numericScore = Number.parseInt(payload.score, 10);

            if (
              !Number.isInteger(numericScore) ||
              numericScore < 1 ||
              numericScore > 5
            ) {
              throw new ValidationError({
                score: { message: "امتیاز باید عددی بین ۱ تا ۵ باشد." },
              });
            }

            try {
              await prisma.$transaction(async (tx) => {
                await tx.projectRatingHistory.update({
                  where: { id: record.id() },
                  data: {
                    score: numericScore,
                  },
                });

                const pId = record.param("projectId");
                const stats = await tx.projectRatingHistory.aggregate({
                  where: { projectId: pId },
                  _avg: { score: true },
                  _count: { score: true },
                });

                await tx.project.update({
                  where: { id: pId },
                  data: {
                    averageRating: stats._avg.score || 0,
                    ratingCount: stats._count.score || 0,
                    hasRating: (stats._count.score || 0) > 0,
                  },
                });
              });

              const refreshed = await resource.findOne(record.id());

              return {
                record: refreshed?.toJSON(currentAdmin),
                notice: {
                  message: "ویرایش با موفقیت انجام شد.",
                  type: "success",
                },
                redirectUrl: h.resourceActionUrl({
                  resourceId: resource.id(),
                  actionName: "list",
                }),
              };
            } catch (error) {
              console.error("RATING_UPDATE_ERROR:", error);
              throw new ValidationError({
                score: { message: "خطا در بروزرسانی امتیاز." },
              });
            }
          },
        },
      },
    }),
    prismaResource("AnalysisCategory", {
      navigation: {
        name: "دسته‌بندی تحلیل‌ها",
        icon: "FolderTree",
      },

      properties: {
        title: {
          isTitle: true,
        },

        createdAt: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: false,
          },
        },

        updatedAt: {
          isVisible: {
            list: false,
            filter: true,
            show: true,
            edit: false,
          },
        },
      },

      listProperties: ["id", "title", "createdAt"],

      filterProperties: ["title", "createdAt"],

      showProperties: ["id", "title", "description", "createdAt", "updatedAt"],

      editProperties: ["title", "description"],
    }),

    prismaResource("AnalysisForm", {
      navigation: {
        name: "تحلیل های تکی",
        icon: "FileText",
      },

      properties: {
        title: {
          isTitle: true,
        },

        categoryId: {
          reference: "AnalysisCategory",
        },

        temperature: {
          type: "number",
        },

        createdAt: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: false,
          },
        },

        updatedAt: {
          isVisible: {
            list: false,
            filter: true,
            show: true,
            edit: false,
          },
        },
      },

      listProperties: [
        "id",
        "title",
        "categoryId",
        "isActive",
        "order",
        "temperature",
        "createdAt",
      ],

      filterProperties: [
        "title",
        "categoryId",
        "isActive",
        "order",
        "temperature",
        "createdAt",
      ],

      showProperties: [
        "id",
        "title",
        "categoryId",
        "info",
        "order",
        "isActive",
        "temperature",
        "createdAt",
        "updatedAt",
      ],

      editProperties: [
        "title",
        "categoryId",
        "info",
        "order",
        "isActive",
        "temperature",
      ],
    }),
    prismaResource("FormQuestionCategory", {
      navigation: {
        name: "دسته بندی سوالات",
        icon: "FolderTree",
      },

      properties: {
        id: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: false,
          },
        },

        title: {
          isTitle: true,
          isRequired: true,
        },

        formId: {
          reference: "AnalysisForm",
          isRequired: true,

          isVisible: {
            list: false,
            filter: false,
            show: true,
            edit: true,
          },
        },

        form: {
          reference: "AnalysisForm",

          isVisible: {
            list: false,
            filter: true,
            show: false,
            edit: false,
          },
        },

        parentId: {
          reference: "FormQuestionCategory",

          isVisible: {
            list: false,
            filter: false,
            show: true,
            edit: true,
          },
        },

        parent: {
          reference: "FormQuestionCategory",

          isVisible: {
            list: false,
            filter: true,
            show: false,
            edit: false,
          },
        },

        order: {
          type: "number",
          isRequired: true,
        },

        isActive: {
          type: "boolean",
        },

        formTitle: {
          type: "string",
          isVirtual: true,
          label: "فرم تحلیل",

          isVisible: {
            list: true,
            show: true,
            edit: false,
            filter: false,
          },
        },

        parentTitle: {
          type: "string",
          isVirtual: true,
          label: "دسته والد",

          isVisible: {
            list: true,
            show: true,
            edit: false,
            filter: false,
          },
        },

        children: {
          isVisible: false,
        },

        questions: {
          isVisible: false,
        },

        createdAt: {
          isVisible: {
            list: false,
            filter: false,
            show: true,
            edit: false,
          },
        },

        updatedAt: {
          isVisible: {
            list: false,
            filter: false,
            show: true,
            edit: false,
          },
        },
      },

      listProperties: [
        "id",
        "formTitle",
        "parentTitle",
        "title",
        "order",
        "isActive",
      ],

      filterProperties: ["form", "parent", "title", "isActive"],

      showProperties: [
        "id",
        "formTitle",
        "parentTitle",
        "title",
        "order",
        "isActive",
        "createdAt",
        "updatedAt",
      ],

      editProperties: ["formId", "parentId", "title", "order", "isActive"],

      actions: {
        list: {
          after: async (response) => {
            if (!response.records?.length) return response;

            const formIds = [
              ...new Set(
                response.records.map((r) => r.params.form).filter(Boolean),
              ),
            ];

            const parentIds = [
              ...new Set(
                response.records.map((r) => r.params.parent).filter(Boolean),
              ),
            ];

            const forms = await prisma.analysisForm.findMany({
              where: {
                id: {
                  in: formIds,
                },
              },
              select: {
                id: true,
                title: true,
              },
            });

            const parents = await prisma.formQuestionCategory.findMany({
              where: {
                id: {
                  in: parentIds,
                },
              },
              select: {
                id: true,
                title: true,
              },
            });

            const formMap = Object.fromEntries(
              forms.map((f) => [f.id, f.title]),
            );

            const parentMap = Object.fromEntries(
              parents.map((p) => [p.id, p.title]),
            );

            response.records.forEach((record) => {
              record.params.formTitle = formMap[record.params.form] || "—";

              record.params.parentTitle =
                parentMap[record.params.parent] || "ریشه";
            });

            return response;
          },
        },

        show: {
          after: async (response) => {
            if (!response.record) return response;

            const form = await prisma.analysisForm.findUnique({
              where: {
                id: response.record.params.form,
              },
              select: {
                title: true,
              },
            });

            response.record.params.formTitle = form?.title || "—";

            if (response.record.params.parent) {
              const parent = await prisma.formQuestionCategory.findUnique({
                where: {
                  id: response.record.params.parent,
                },
                select: {
                  title: true,
                },
              });

              response.record.params.parentTitle = parent?.title || "—";
            } else {
              response.record.params.parentTitle = "ریشه";
            }

            return response;
          },
        },

        new: {
          handler: async (request, response, context) => {
            const { resource, h, currentAdmin } = context;

            if (request.method === "get") {
              return {
                resource: resource.decorate().toJSON(currentAdmin),
                record: null,
              };
            }

            const payload = request.payload ?? {};

            const formId = String(payload.formId || "");
            const parentId = String(payload.parentId || "");
            const title = String(payload.title || "").trim();
            const order = parseIntegerValue(payload.order);
            const isActive = parseBooleanValue(payload.isActive);

            const errors = {};

            if (!formId) {
              errors.formId = {
                message: "فرم الزامی است.",
              };
            }

            if (!title) {
              errors.title = {
                message: "عنوان دسته بندی الزامی است.",
              };
            }

            if (order === null) {
              errors.order = {
                message: "ترتیب باید عدد صحیح باشد.",
              };
            }

            if (Object.keys(errors).length) {
              throw new ValidationError(errors);
            }

            try {
              const created = await prisma.formQuestionCategory.create({
                data: {
                  title,
                  order,
                  isActive,

                  form: {
                    connect: {
                      id: formId,
                    },
                  },

                  ...(parentId && {
                    parent: {
                      connect: {
                        id: parentId,
                      },
                    },
                  }),
                },
              });

              const record = await resource.findOne(created.id);

              return {
                record: record?.toJSON(currentAdmin),

                notice: {
                  message: "دسته بندی با موفقیت ایجاد شد.",
                  type: "success",
                },

                redirectUrl: h.recordActionUrl({
                  resourceId: resource.id(),
                  recordId: created.id,
                  actionName: "show",
                }),
              };
            } catch (error) {
              console.error("CATEGORY_CREATE_ERROR:", error);

              if (error instanceof ValidationError) {
                throw error;
              }

              throw new ValidationError({
                formId: {
                  message: "خطا در ایجاد دسته بندی.",
                },
              });
            }
          },
        },

        edit: {
          handler: async (request, response, context) => {
            const { record, resource, h, currentAdmin } = context;

            if (request.method === "get") {
              return {
                record: record?.toJSON(currentAdmin),
                resource: resource.decorate().toJSON(currentAdmin),
              };
            }

            const payload = request.payload ?? {};

            const formId = String(payload.formId || "");
            const parentId = String(payload.parentId || "");
            const title = String(payload.title || "").trim();
            const order = parseIntegerValue(payload.order);
            const isActive = parseBooleanValue(payload.isActive);

            const errors = {};

            if (!formId) {
              errors.formId = {
                message: "فرم الزامی است.",
              };
            }

            if (!title) {
              errors.title = {
                message: "عنوان دسته بندی الزامی است.",
              };
            }

            if (order === null) {
              errors.order = {
                message: "ترتیب باید عدد صحیح باشد.",
              };
            }

            if (Object.keys(errors).length) {
              throw new ValidationError(errors);
            }

            // اگر parent انتخاب شده، وجودش بررسی شود
            if (parentId) {
              if (parentId === record.params.id) {
                throw new ValidationError({
                  parentId: {
                    message: "دسته بندی نمی‌تواند والد خودش باشد.",
                  },
                });
              }

              const parent = await prisma.formQuestionCategory.findUnique({
                where: {
                  id: parentId,
                },
                select: {
                  formId: true,
                },
              });

              if (!parent) {
                throw new ValidationError({
                  parentId: {
                    message: "دسته بندی والد معتبر نیست.",
                  },
                });
              }

              if (parent.formId !== formId) {
                throw new ValidationError({
                  parentId: {
                    message: "دسته بندی والد باید متعلق به همین فرم باشد.",
                  },
                });
              }
            }

            try {
              await prisma.formQuestionCategory.update({
                where: {
                  id: record.params.id,
                },
                data: {
                  title,
                  order,
                  isActive,

                  form: {
                    connect: {
                      id: formId,
                    },
                  },

                  parent: parentId
                    ? {
                        connect: {
                          id: parentId,
                        },
                      }
                    : {
                        disconnect: true,
                      },
                },
              });

              const updatedRecord = await resource.findOne(record.params.id);

              return {
                record: updatedRecord?.toJSON(currentAdmin),

                notice: {
                  message: "دسته بندی با موفقیت ویرایش شد.",
                  type: "success",
                },

                redirectUrl: h.recordActionUrl({
                  resourceId: resource.id(),
                  recordId: record.params.id,
                  actionName: "show",
                }),
              };
            } catch (error) {
              console.error("CATEGORY_EDIT_ERROR:", error);

              if (error instanceof ValidationError) {
                throw error;
              }

              throw new ValidationError({
                formId: {
                  message: "خطا در ویرایش دسته بندی.",
                },
              });
            }
          },
        },
      },
    }),
    prismaResource("FormQuestion", {
      navigation: {
        name: "سوالات",
        icon: "HelpCircle",
      },

      properties: {
        id: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: false,
          },
        },

        formId: {
          reference: "AnalysisForm",
          isRequired: true,
        },

        form: {
          reference: "AnalysisForm",
          isVisible: {
            list: false,
            filter: true,
            show: false,
            edit: false,
          },
        },

        categoryId: {
          reference: "FormQuestionCategory",
          isRequired: true,
        },

        category: {
          reference: "FormQuestionCategory",
          isVisible: {
            list: false,
            filter: true,
            show: false,
            edit: false,
          },
        },

        label: {
          isTitle: true,
          isRequired: true,
        },

        type: {
          availableValues: questionTypeValues,
          isRequired: true,
        },

        weight: {
          type: "number",
          isRequired: false,
        },

        required: {
          type: "boolean",
        },

        order: {
          type: "number",
          isRequired: true,
        },

        formTitle: {
          type: "string",
          isVirtual: true,
          label: "فرم",
        },

        categoryTitle: {
          type: "string",
          isVirtual: true,
          label: "دسته بندی",
        },

        options: {
          isVisible: false,
        },

        createdAt: {
          isVisible: false,
        },

        updatedAt: {
          isVisible: false,
        },
      },

      listProperties: [
        "id",
        "formTitle",
        "categoryTitle",
        "label",
        "type",
        "weight",
        "required",
        "order",
      ],
      filterProperties: ["form", "category", "label", "type", "required"],
      showProperties: [
        "id",
        "formTitle",
        "categoryTitle",
        "label",
        "type",
        "weight",
        "required",
        "order",
      ],

      editProperties: [
        "formId",
        "categoryId",
        "label",
        "type",
        "weight",
        "required",
        "order",
      ],
      actions: {
        list: {
          after: async (response) => {
            if (!response.records?.length) return response;
            const formIds = [
              ...new Set(
                response.records.map((r) => r.params.form).filter(Boolean),
              ),
            ];
            const categoryIds = [
              ...new Set(
                response.records.map((r) => r.params.category).filter(Boolean),
              ),
            ];
            const forms = await prisma.analysisForm.findMany({
              where: { id: { in: formIds } },
              select: { id: true, title: true },
            });
            const categories = await prisma.formQuestionCategory.findMany({
              where: { id: { in: categoryIds } },
              select: { id: true, title: true },
            });
            const formMap = Object.fromEntries(
              forms.map((f) => [f.id, f.title]),
            );
            const categoryMap = Object.fromEntries(
              categories.map((c) => [c.id, c.title]),
            );
            response.records.forEach((record) => {
              record.params.formTitle = formMap[record.params.form] || "—";
              record.params.categoryTitle =
                categoryMap[record.params.category] || "—";
            });
            return response;
          },
        },
        new: {
          handler: async (request, response, context) => {
            const { resource, h, currentAdmin } = context;

            if (request.method === "get") {
              return {
                resource: resource.decorate().toJSON(currentAdmin),
                record: null,
              };
            }

            const payload = request.payload ?? {};

            const formId = String(payload.formId || "");
            const categoryId = String(payload.categoryId || "");
            const label = String(payload.label || "").trim();
            const type = String(payload.type || "");
            const required = parseBooleanValue(payload.required);
            const order = parseIntegerValue(payload.order);

            const weight =
              payload.weight === "" ||
              payload.weight === undefined ||
              payload.weight === null
                ? null
                : parseIntegerValue(payload.weight);

            const errors = {};

            if (!formId) {
              errors.formId = { message: "فرم الزامی است." };
            }

            if (!categoryId) {
              errors.categoryId = { message: "دسته بندی الزامی است." };
            }

            if (!label) {
              errors.label = { message: "عنوان سوال الزامی است." };
            }

            if (!type) {
              errors.type = { message: "نوع سوال الزامی است." };
            }

            if (order === null) {
              errors.order = {
                message: "ترتیب باید یک عدد صحیح باشد.",
              };
            }

            if (weight !== null && (weight < 0 || weight > 100)) {
              errors.weight = {
                message: "وزن باید بین 0 تا 100 باشد.",
              };
            }

            if (Object.keys(errors).length) {
              throw new ValidationError(errors);
            }

            const category = await prisma.formQuestionCategory.findUnique({
              where: { id: categoryId },
              select: {
                id: true,
                formId: true,
              },
            });

            if (!category) {
              throw new ValidationError({
                categoryId: {
                  message: "دسته بندی انتخاب شده معتبر نیست.",
                },
              });
            }

            if (category.formId !== formId) {
              throw new ValidationError({
                categoryId: {
                  message: "دسته بندی انتخاب شده متعلق به فرم انتخاب شده نیست.",
                },
              });
            }

            if (weight !== null) {
              const aggregate = await prisma.formQuestion.aggregate({
                where: {
                  formId,
                  categoryId,
                  weight: {
                    not: null,
                  },
                },
                _sum: {
                  weight: true,
                },
              });

              const currentWeight = aggregate._sum.weight || 0;

              if (currentWeight + weight > 100) {
                throw new ValidationError({
                  weight: {
                    message: `جمع وزن سوالات این دسته‌بندی نمی‌تواند بیشتر از 100 باشد. (مجموع فعلی: ${currentWeight})`,
                  },
                });
              }
            }

            try {
              const created = await prisma.formQuestion.create({
                data: {
                  label,
                  type,
                  weight,
                  required,
                  order,

                  form: {
                    connect: {
                      id: formId,
                    },
                  },

                  category: {
                    connect: {
                      id: categoryId,
                    },
                  },
                },
              });

              const record = await resource.findOne(created.id);

              return {
                record: record?.toJSON(currentAdmin),

                notice: {
                  message: "سوال با موفقیت ایجاد شد.",
                  type: "success",
                },

                redirectUrl: h.recordActionUrl({
                  resourceId: resource.id(),
                  recordId: created.id,
                  actionName: "show",
                }),
              };
            } catch (error) {
              console.error("FORM_QUESTION_CREATE_ERROR:", error);

              if (error instanceof ValidationError) {
                throw error;
              }

              throw new ValidationError({
                formId: {
                  message: "خطا در ایجاد سوال.",
                },
              });
            }
          },
        },

        edit: {
          handler: async (request, response, context) => {
            const { record, resource, h, currentAdmin } = context;

            if (request.method === "get") {
              return {
                record: record?.toJSON(currentAdmin),
                resource: resource.decorate().toJSON(currentAdmin),
              };
            }

            const payload = request.payload ?? {};

            const formId = String(payload.formId || "");
            const categoryId = String(payload.categoryId || "");
            const label = String(payload.label || "").trim();
            const type = String(payload.type || "");
            const required = parseBooleanValue(payload.required);
            const order = parseIntegerValue(payload.order);

            const weight =
              payload.weight === "" ||
              payload.weight === undefined ||
              payload.weight === null
                ? null
                : parseIntegerValue(payload.weight);

            const errors = {};

            if (!formId) {
              errors.formId = { message: "فرم الزامی است." };
            }

            if (!categoryId) {
              errors.categoryId = { message: "دسته بندی الزامی است." };
            }

            if (!label) {
              errors.label = { message: "عنوان سوال الزامی است." };
            }

            if (!type) {
              errors.type = { message: "نوع سوال الزامی است." };
            }

            if (order === null) {
              errors.order = {
                message: "ترتیب باید یک عدد صحیح باشد.",
              };
            }

            if (weight !== null && (weight < 0 || weight > 100)) {
              errors.weight = {
                message: "وزن باید بین 0 تا 100 باشد.",
              };
            }

            if (Object.keys(errors).length) {
              throw new ValidationError(errors);
            }

            const category = await prisma.formQuestionCategory.findUnique({
              where: {
                id: categoryId,
              },
              select: {
                formId: true,
              },
            });

            if (!category) {
              throw new ValidationError({
                categoryId: {
                  message: "دسته بندی معتبر نیست.",
                },
              });
            }

            if (category.formId !== formId) {
              throw new ValidationError({
                categoryId: {
                  message: "دسته بندی متعلق به فرم انتخاب شده نیست.",
                },
              });
            }

            if (weight !== null) {
              const aggregate = await prisma.formQuestion.aggregate({
                where: {
                  formId,
                  categoryId,
                  weight: {
                    not: null,
                  },
                  NOT: {
                    id: record.params.id,
                  },
                },
                _sum: {
                  weight: true,
                },
              });
              const totalWeight = (aggregate._sum.weight || 0) + weight;

              if (totalWeight > 100) {
                throw new ValidationError({
                  weight: {
                    message: `جمع وزن سوالات نمی‌تواند بیشتر از 100 باشد. (مجموع جدید: ${totalWeight})`,
                  },
                });
              }
            }

            try {
              await prisma.formQuestion.update({
                where: {
                  id: record.params.id,
                },
                data: {
                  label,
                  type,
                  weight,
                  required,
                  order,

                  form: {
                    connect: {
                      id: formId,
                    },
                  },

                  category: {
                    connect: {
                      id: categoryId,
                    },
                  },
                },
              });

              const updatedRecord = await resource.findOne(record.params.id);

              return {
                record: updatedRecord?.toJSON(currentAdmin),

                notice: {
                  message: "سوال با موفقیت ویرایش شد.",
                  type: "success",
                },

                redirectUrl: h.recordActionUrl({
                  resourceId: resource.id(),
                  recordId: record.params.id,
                  actionName: "show",
                }),
              };
            } catch (error) {
              console.error("FORM_QUESTION_EDIT_ERROR:", error);

              if (error instanceof ValidationError) {
                throw error;
              }

              throw new ValidationError({
                formId: {
                  message: "خطا در ویرایش سوال.",
                },
              });
            }
          },
        },

        show: {
          after: async (response) => {
            if (!response.record) return response;

            const formId = response.record.params.form;
            const categoryId = response.record.params.category;

            const [form, category] = await Promise.all([
              prisma.analysisForm.findUnique({
                where: {
                  id: formId,
                },
                select: {
                  title: true,
                },
              }),

              prisma.formQuestionCategory.findUnique({
                where: {
                  id: categoryId,
                },
                select: {
                  title: true,
                },
              }),
            ]);

            response.record.params.formTitle = form?.title || "—";

            response.record.params.categoryTitle = category?.title || "—";

            return response;
          },
        },
      },
    }),
    prismaResource("FormQuestionOption", {
      navigation: {
        name: "گزینه های سوالات",
        icon: "HelpCircle",
      },

      properties: {
        id: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },
        questionId: {
          reference: "FormQuestion",
          isRequired: true,

          isVisible: {
            list: false,
            filter: false,
            show: true,
            edit: true,
          },
        },
        question: {
          reference: "FormQuestion",
          isVisible: { list: false, filter: true, show: false, edit: false },
        },
        label: { isTitle: true, isRequired: true },
        value: { isRequired: true },
        score: {
          availableValues: [
            { value: 1, label: "1" },
            { value: 2, label: "2" },
            { value: 3, label: "3" },
            { value: 4, label: "4" },
            { value: 5, label: "5" },
          ],

          isRequired: false,
        },
        order: { type: "number", isRequired: true },
        questionTitle: {
          type: "string",
          isVirtual: true,
          label: "سوال",

          isVisible: {
            list: true,
            show: true,
            edit: false,
            filter: false,
          },
        },
        createdAt: { isVisible: false },
        updatedAt: { isVisible: false },
      },
      listProperties: [
        "id",
        "questionTitle",
        "label",
        "value",
        "score",
        "order",
      ],
      filterProperties: ["question", "label", "score"],
      showProperties: [
        "id",
        "questionTitle",
        "label",
        "value",
        "score",
        "order",
      ],
      editProperties: ["questionId", "label", "value", "score", "order"],
      actions: {
        list: {
          after: async (response) => {
            if (!response.records?.length) return response;

            const questionIds = [
              ...new Set(
                response.records.map((r) => r.params.question).filter(Boolean),
              ),
            ];

            const questions = await prisma.formQuestion.findMany({
              where: {
                id: {
                  in: questionIds,
                },
              },
              select: {
                id: true,
                label: true,
              },
            });

            const map = Object.fromEntries(
              questions.map((q) => [q.id, q.label]),
            );

            response.records.forEach((record) => {
              record.params.questionTitle = map[record.params.question] || "—";
            });

            return response;
          },
        },
        show: {
          after: async (response) => {
            if (!response.record) return response;

            const question = await prisma.formQuestion.findUnique({
              where: {
                id: response.record.params.question,
              },
              select: {
                label: true,
              },
            });

            response.record.params.questionTitle = question?.label || "—";

            return response;
          },
        },
        new: {
          handler: async (request, response, context) => {
            const { resource, h, currentAdmin } = context;

            if (request.method === "get") {
              return {
                resource: resource.decorate().toJSON(currentAdmin),
                record: null,
              };
            }

            const payload = request.payload ?? {};

            const questionId = String(payload.questionId || "");
            const label = String(payload.label || "").trim();
            const value = String(payload.value || "").trim();

            const score =
              payload.score === "" ||
              payload.score === undefined ||
              payload.score === null
                ? null
                : parseIntegerValue(payload.score);

            const order = parseIntegerValue(payload.order);

            const errors = {};

            if (!questionId) {
              errors.questionId = {
                message: "سوال الزامی است.",
              };
            }

            if (!label) {
              errors.label = {
                message: "عنوان گزینه الزامی است.",
              };
            }

            if (!value) {
              errors.value = {
                message: "مقدار گزینه الزامی است.",
              };
            }

            if (order === null) {
              errors.order = {
                message: "ترتیب باید عدد صحیح باشد.",
              };
            }

            if (score !== null && ![1, 2, 3, 4, 5].includes(score)) {
              errors.score = {
                message: "نمره باید عددی بین 1 تا 5 باشد.",
              };
            }

            const question = await prisma.formQuestion.findUnique({
              where: {
                id: questionId,
              },
              select: {
                weight: true,
              },
            });

            if (!question) {
              errors.questionId = {
                message: "سوال انتخاب شده معتبر نیست.",
              };
            } else {
              if (question.weight !== null && score === null) {
                errors.score = {
                  message: "برای سوالات دارای وزن، نمره گزینه الزامی است.",
                };
              }

              if (question.weight === null && score !== null) {
                errors.score = {
                  message: "برای سوالات بدون وزن نباید نمره وارد شود.",
                };
              }
            }

            if (Object.keys(errors).length) {
              throw new ValidationError(errors);
            }

            try {
              const created = await prisma.formQuestionOption.create({
                data: {
                  label,
                  value,
                  score,
                  order,

                  question: {
                    connect: {
                      id: questionId,
                    },
                  },
                },
              });

              const record = await resource.findOne(created.id);

              return {
                record: record?.toJSON(currentAdmin),

                notice: {
                  message: "گزینه با موفقیت ایجاد شد.",
                  type: "success",
                },

                redirectUrl: h.recordActionUrl({
                  resourceId: resource.id(),
                  recordId: created.id,
                  actionName: "show",
                }),
              };
            } catch (error) {
              console.error(error);

              if (error instanceof ValidationError) {
                throw error;
              }

              throw new ValidationError({
                questionId: {
                  message: "خطا در ایجاد گزینه.",
                },
              });
            }
          },
        },
        edit: {
          handler: async (request, response, context) => {
            const { record, resource, h, currentAdmin } = context;

            if (request.method === "get") {
              return {
                record: record?.toJSON(currentAdmin),
                resource: resource.decorate().toJSON(currentAdmin),
              };
            }

            const payload = request.payload ?? {};

            const questionId = String(payload.questionId || "");
            const label = String(payload.label || "").trim();
            const value = String(payload.value || "").trim();

            const score =
              payload.score === "" ||
              payload.score === undefined ||
              payload.score === null
                ? null
                : parseIntegerValue(payload.score);

            const order = parseIntegerValue(payload.order);

            const errors = {};

            if (!questionId) {
              errors.questionId = {
                message: "سوال الزامی است.",
              };
            }

            if (!label) {
              errors.label = {
                message: "عنوان گزینه الزامی است.",
              };
            }

            if (!value) {
              errors.value = {
                message: "مقدار گزینه الزامی است.",
              };
            }

            if (order === null) {
              errors.order = {
                message: "ترتیب باید عدد صحیح باشد.",
              };
            }

            if (score !== null && ![1, 2, 3, 4, 5].includes(score)) {
              errors.score = {
                message: "نمره باید عددی بین 1 تا 5 باشد.",
              };
            }

            const question = await prisma.formQuestion.findUnique({
              where: {
                id: questionId,
              },
              select: {
                weight: true,
              },
            });

            if (!question) {
              errors.questionId = {
                message: "سوال انتخاب شده معتبر نیست.",
              };
            } else {
              if (question.weight !== null && score === null) {
                errors.score = {
                  message: "برای سوالات دارای وزن، نمره گزینه الزامی است.",
                };
              }

              if (question.weight === null && score !== null) {
                errors.score = {
                  message: "برای سوالات بدون وزن نباید نمره وارد شود.",
                };
              }
            }

            if (Object.keys(errors).length) {
              throw new ValidationError(errors);
            }

            try {
              await prisma.formQuestionOption.update({
                where: {
                  id: record.params.id,
                },
                data: {
                  label,
                  value,
                  score,
                  order,

                  question: {
                    connect: {
                      id: questionId,
                    },
                  },
                },
              });

              const updatedRecord = await resource.findOne(record.params.id);

              return {
                record: updatedRecord?.toJSON(currentAdmin),

                notice: {
                  message: "گزینه با موفقیت ویرایش شد.",
                  type: "success",
                },

                redirectUrl: h.recordActionUrl({
                  resourceId: resource.id(),
                  recordId: record.params.id,
                  actionName: "show",
                }),
              };
            } catch (error) {
              console.error(error);

              if (error instanceof ValidationError) {
                throw error;
              }

              throw new ValidationError({
                questionId: {
                  message: "خطا در ویرایش گزینه.",
                },
              });
            }
          },
        },
      },
    }),

    prismaResource("FormCategoryGroup", {
      properties: {
        id: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: false,
          },
        },

        formId: {
          reference: "AnalysisForm",
          isRequired: true,

          isVisible: {
            list: false,
            filter: false,
            show: true,
            edit: true,
          },
        },

        form: {
          reference: "AnalysisForm",

          isVisible: {
            list: false,
            filter: true,
            show: false,
            edit: false,
          },
        },

        title: {
          isTitle: true,
          isRequired: true,
        },

        order: {
          type: "number",
          isRequired: true,
        },

        formTitle: {
          type: "string",
          isVirtual: true,
          label: "فرم تحلیل",

          isVisible: {
            list: true,
            show: true,
            edit: false,
            filter: false,
          },
        },

        categories: {
          isVisible: false,
        },

        createdAt: {
          isVisible: {
            list: false,
            filter: false,
            show: true,
            edit: false,
          },
        },

        updatedAt: {
          isVisible: {
            list: false,
            filter: false,
            show: true,
            edit: false,
          },
        },
      },
      listProperties: ["id", "formTitle", "title", "order"],
      filterProperties: ["form", "title"],
      showProperties: [
        "id",
        "formTitle",
        "title",
        "order",
        "createdAt",
        "updatedAt",
      ],
      editProperties: ["formId", "title", "order"],

      actions: {
        list: {
          after: async (response) => {
            if (!response.records?.length) return response;

            const formIds = [
              ...new Set(
                response.records.map((r) => r.params.form).filter(Boolean),
              ),
            ];

            const forms = await prisma.analysisForm.findMany({
              where: {
                id: {
                  in: formIds,
                },
              },
              select: {
                id: true,
                title: true,
              },
            });

            const formMap = Object.fromEntries(
              forms.map((item) => [item.id, item.title]),
            );

            response.records.forEach((record) => {
              record.params.formTitle = formMap[record.params.form] || "—";
            });

            return response;
          },
        },

        show: {
          after: async (response) => {
            if (!response.record) return response;

            const form = await prisma.analysisForm.findUnique({
              where: {
                id: response.record.params.form,
              },
              select: {
                title: true,
              },
            });

            response.record.params.formTitle = form?.title || "—";

            return response;
          },
        },

        new: {
          handler: async (request, response, context) => {
            const { resource, h, currentAdmin } = context;

            if (request.method === "get") {
              return {
                resource: resource.decorate().toJSON(currentAdmin),
                record: null,
              };
            }

            const payload = request.payload ?? {};

            const formId = String(payload.formId || "");
            const title = String(payload.title || "").trim();
            const order = parseIntegerValue(payload.order);

            const errors = {};

            if (!formId) {
              errors.formId = {
                message: "فرم الزامی است.",
              };
            }

            if (!title) {
              errors.title = {
                message: "عنوان گروه الزامی است.",
              };
            }

            if (order === null) {
              errors.order = {
                message: "ترتیب باید عدد صحیح باشد.",
              };
            }

            if (Object.keys(errors).length) {
              throw new ValidationError(errors);
            }

            try {
              const created = await prisma.formCategoryGroup.create({
                data: {
                  title,
                  order,

                  form: {
                    connect: {
                      id: formId,
                    },
                  },
                },
              });

              const record = await resource.findOne(created.id);

              return {
                record: record?.toJSON(currentAdmin),

                notice: {
                  message: "گروه دسته‌بندی با موفقیت ایجاد شد.",
                  type: "success",
                },

                redirectUrl: h.recordActionUrl({
                  resourceId: resource.id(),
                  recordId: created.id,
                  actionName: "show",
                }),
              };
            } catch (error) {
              console.error("CATEGORY_GROUP_CREATE_ERROR:", error);

              if (error instanceof ValidationError) {
                throw error;
              }

              throw new ValidationError({
                formId: {
                  message: "خطا در ایجاد گروه.",
                },
              });
            }
          },
        },

        edit: {
          handler: async (request, response, context) => {
            const { record, resource, h, currentAdmin } = context;

            if (request.method === "get") {
              return {
                record: record?.toJSON(currentAdmin),
                resource: resource.decorate().toJSON(currentAdmin),
              };
            }

            const payload = request.payload ?? {};

            const formId = String(payload.formId || "");
            const title = String(payload.title || "").trim();
            const order = parseIntegerValue(payload.order);

            const errors = {};

            if (!formId) {
              errors.formId = {
                message: "فرم الزامی است.",
              };
            }

            if (!title) {
              errors.title = {
                message: "عنوان گروه الزامی است.",
              };
            }

            if (order === null) {
              errors.order = {
                message: "ترتیب باید عدد صحیح باشد.",
              };
            }

            if (Object.keys(errors).length) {
              throw new ValidationError(errors);
            }

            try {
              await prisma.formCategoryGroup.update({
                where: {
                  id: record.params.id,
                },
                data: {
                  title,
                  order,

                  form: {
                    connect: {
                      id: formId,
                    },
                  },
                },
              });

              const updatedRecord = await resource.findOne(record.params.id);

              return {
                record: updatedRecord?.toJSON(currentAdmin),

                notice: {
                  message: "گروه دسته‌بندی با موفقیت ویرایش شد.",
                  type: "success",
                },

                redirectUrl: h.recordActionUrl({
                  resourceId: resource.id(),
                  recordId: record.params.id,
                  actionName: "show",
                }),
              };
            } catch (error) {
              console.error("CATEGORY_GROUP_EDIT_ERROR:", error);

              if (error instanceof ValidationError) {
                throw error;
              }

              throw new ValidationError({
                formId: {
                  message: "خطا در ویرایش گروه.",
                },
              });
            }
          },
        },
      },
    }),
    prismaResource("FormCategoryGroupItem", {
      properties: {
        id: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: false,
          },
        },

        groupId: {
          reference: "FormCategoryGroup",
          isRequired: true,

          isVisible: {
            list: false,
            filter: false,
            show: true,
            edit: true,
          },
        },

        group: {
          reference: "FormCategoryGroup",

          isVisible: {
            list: false,
            filter: true,
            show: false,
            edit: false,
          },
        },

        categoryId: {
          reference: "FormQuestionCategory",
          isRequired: true,

          isVisible: {
            list: false,
            filter: false,
            show: true,
            edit: true,
          },
        },

        category: {
          reference: "FormQuestionCategory",

          isVisible: {
            list: false,
            filter: true,
            show: false,
            edit: false,
          },
        },

        groupTitle: {
          type: "string",
          isVirtual: true,
          label: "گروه",

          isVisible: {
            list: true,
            show: true,
            edit: false,
            filter: false,
          },
        },

        categoryTitle: {
          type: "string",
          isVirtual: true,
          label: "دسته بندی",

          isVisible: {
            list: true,
            show: true,
            edit: false,
            filter: false,
          },
        },
      },
      listProperties: ["id", "groupTitle", "categoryTitle"],
      filterProperties: ["group", "category"],
      showProperties: ["id", "groupTitle", "categoryTitle"],
      editProperties: ["groupId", "categoryId"],
      actions: {
        list: {
          after: async (response) => {
            if (!response.records?.length) return response;

            const groupIds = [
              ...new Set(
                response.records.map((r) => r.params.group).filter(Boolean),
              ),
            ];

            const categoryIds = [
              ...new Set(
                response.records.map((r) => r.params.category).filter(Boolean),
              ),
            ];

            const [groups, categories] = await Promise.all([
              prisma.formCategoryGroup.findMany({
                where: {
                  id: {
                    in: groupIds,
                  },
                },
                select: {
                  id: true,
                  title: true,
                },
              }),

              prisma.formQuestionCategory.findMany({
                where: {
                  id: {
                    in: categoryIds,
                  },
                },
                select: {
                  id: true,
                  title: true,
                },
              }),
            ]);

            const groupMap = Object.fromEntries(
              groups.map((g) => [g.id, g.title]),
            );

            const categoryMap = Object.fromEntries(
              categories.map((c) => [c.id, c.title]),
            );

            response.records.forEach((record) => {
              record.params.groupTitle = groupMap[record.params.group] || "—";

              record.params.categoryTitle =
                categoryMap[record.params.category] || "—";
            });

            return response;
          },
        },
        show: {
          after: async (response) => {
            if (!response.record) return response;

            const [group, category] = await Promise.all([
              prisma.formCategoryGroup.findUnique({
                where: {
                  id: response.record.params.group,
                },
                select: {
                  title: true,
                },
              }),

              prisma.formQuestionCategory.findUnique({
                where: {
                  id: response.record.params.category,
                },
                select: {
                  title: true,
                },
              }),
            ]);

            response.record.params.groupTitle = group?.title || "—";

            response.record.params.categoryTitle = category?.title || "—";

            return response;
          },
        },
        new: {
          handler: async (request, response, context) => {
            const { resource, h, currentAdmin } = context;

            if (request.method === "get") {
              return {
                resource: resource.decorate().toJSON(currentAdmin),
                record: null,
              };
            }

            const payload = request.payload ?? {};

            const groupId = String(payload.groupId || "");
            const categoryId = String(payload.categoryId || "");

            const errors = {};

            if (!groupId) {
              errors.groupId = {
                message: "گروه الزامی است.",
              };
            }

            if (!categoryId) {
              errors.categoryId = {
                message: "دسته بندی الزامی است.",
              };
            }

            if (Object.keys(errors).length) {
              throw new ValidationError(errors);
            }

            const [group, category] = await Promise.all([
              prisma.formCategoryGroup.findUnique({
                where: {
                  id: groupId,
                },
                select: {
                  id: true,
                  formId: true,
                },
              }),

              prisma.formQuestionCategory.findUnique({
                where: {
                  id: categoryId,
                },
                select: {
                  id: true,
                  formId: true,
                },
              }),
            ]);

            if (!group) {
              throw new ValidationError({
                groupId: {
                  message: "گروه انتخاب شده معتبر نیست.",
                },
              });
            }

            if (!category) {
              throw new ValidationError({
                categoryId: {
                  message: "دسته بندی انتخاب شده معتبر نیست.",
                },
              });
            }

            if (group.formId !== category.formId) {
              throw new ValidationError({
                categoryId: {
                  message: "گروه و دسته بندی باید متعلق به یک فرم باشند.",
                },
              });
            }

            const exists = await prisma.formCategoryGroupItem.findUnique({
              where: {
                groupId_categoryId: {
                  groupId,
                  categoryId,
                },
              },
            });

            if (exists) {
              throw new ValidationError({
                categoryId: {
                  message: "این دسته بندی قبلاً به این گروه اضافه شده است.",
                },
              });
            }

            try {
              const created = await prisma.formCategoryGroupItem.create({
                data: {
                  group: {
                    connect: {
                      id: groupId,
                    },
                  },

                  category: {
                    connect: {
                      id: categoryId,
                    },
                  },
                },
              });

              const record = await resource.findOne(created.id);

              return {
                record: record?.toJSON(currentAdmin),

                notice: {
                  message: "دسته بندی با موفقیت به گروه اضافه شد.",
                  type: "success",
                },

                redirectUrl: h.recordActionUrl({
                  resourceId: resource.id(),
                  recordId: created.id,
                  actionName: "show",
                }),
              };
            } catch (error) {
              console.error("FORM_CATEGORY_GROUP_ITEM_CREATE_ERROR:", error);

              if (error instanceof ValidationError) {
                throw error;
              }

              throw new ValidationError({
                groupId: {
                  message: "خطا در ایجاد رکورد.",
                },
              });
            }
          },
        },
        edit: {
          handler: async (request, response, context) => {
            const { record, resource, h, currentAdmin } = context;

            if (request.method === "get") {
              return {
                record: record?.toJSON(currentAdmin),
                resource: resource.decorate().toJSON(currentAdmin),
              };
            }

            const payload = request.payload ?? {};

            const groupId = String(payload.groupId || "");
            const categoryId = String(payload.categoryId || "");

            const errors = {};

            if (!groupId) {
              errors.groupId = {
                message: "گروه الزامی است.",
              };
            }

            if (!categoryId) {
              errors.categoryId = {
                message: "دسته بندی الزامی است.",
              };
            }

            if (Object.keys(errors).length) {
              throw new ValidationError(errors);
            }

            const [group, category] = await Promise.all([
              prisma.formCategoryGroup.findUnique({
                where: {
                  id: groupId,
                },
                select: {
                  id: true,
                  formId: true,
                },
              }),

              prisma.formQuestionCategory.findUnique({
                where: {
                  id: categoryId,
                },
                select: {
                  id: true,
                  formId: true,
                },
              }),
            ]);

            if (!group) {
              throw new ValidationError({
                groupId: {
                  message: "گروه انتخاب شده معتبر نیست.",
                },
              });
            }

            if (!category) {
              throw new ValidationError({
                categoryId: {
                  message: "دسته بندی انتخاب شده معتبر نیست.",
                },
              });
            }

            if (group.formId !== category.formId) {
              throw new ValidationError({
                categoryId: {
                  message: "گروه و دسته بندی باید متعلق به یک فرم باشند.",
                },
              });
            }

            const exists = await prisma.formCategoryGroupItem.findFirst({
              where: {
                groupId,
                categoryId,

                NOT: {
                  id: record.params.id,
                },
              },
            });

            if (exists) {
              throw new ValidationError({
                categoryId: {
                  message: "این دسته بندی قبلاً در این گروه ثبت شده است.",
                },
              });
            }

            try {
              await prisma.formCategoryGroupItem.update({
                where: {
                  id: record.params.id,
                },

                data: {
                  group: {
                    connect: {
                      id: groupId,
                    },
                  },

                  category: {
                    connect: {
                      id: categoryId,
                    },
                  },
                },
              });

              const updatedRecord = await resource.findOne(record.params.id);

              return {
                record: updatedRecord?.toJSON(currentAdmin),

                notice: {
                  message: "رکورد با موفقیت ویرایش شد.",
                  type: "success",
                },

                redirectUrl: h.recordActionUrl({
                  resourceId: resource.id(),
                  recordId: record.params.id,
                  actionName: "show",
                }),
              };
            } catch (error) {
              console.error("FORM_CATEGORY_GROUP_ITEM_EDIT_ERROR:", error);

              if (error instanceof ValidationError) {
                throw error;
              }

              throw new ValidationError({
                groupId: {
                  message: "خطا در ویرایش رکورد.",
                },
              });
            }
          },
        },
      },
    }),
    prismaResource("FeaturedAnalysis", {
      navigation: {
        name: "تحلیل های منتخب",
        icon: "Star",
      },

      properties: {
        analysisFormId: {
          reference: "AnalysisForm",
        },
        analysisForm: {
          reference: "AnalysisForm",
          label: "فرم تحلیل",
        },
      },

      editProperties: ["analysisFormId"],
      listProperties: ["analysisForm", "createdAt"],

      showProperties: ["id", "analysisForm", "createdAt"],
      actions: {
        new: {
          handler: async (request, response, context) => {
            const { resource, h, currentAdmin } = context;

            if (request.method === "post") {
              const { analysisFormId } = request.payload;

              try {
                const record = await prisma.featuredAnalysis.create({
                  data: {
                    analysisForm: {
                      connect: { id: analysisFormId },
                    },
                  },
                });

                return {
                  redirectUrl: h.resourceUrl({
                    resourceId: resource._decorated?.id() || resource.id(),
                  }),
                  notice: {
                    message: "رکورد با موفقیت ایجاد شد",
                    type: "success",
                  },
                  record: { params: record, errors: {}, populated: {} },
                };
              } catch (error) {
                return {
                  record: {
                    params: request.payload,
                    errors: { analysisFormId: { message: error.message } },
                    populated: {},
                  },
                };
              }
            }

            // GET request — return empty record for the form
            return {
              record: { params: {}, errors: {}, populated: {} },
            };
          },
        },

        edit: {
          handler: async (request, response, context) => {
            const { resource, record, h } = context;

            if (request.method === "post") {
              const { analysisFormId } = request.payload;

              try {
                const updated = await prisma.featuredAnalysis.update({
                  where: { id: record.params.id },
                  data: {
                    analysisForm: {
                      connect: { id: analysisFormId },
                    },
                  },
                });

                return {
                  redirectUrl: h.resourceUrl({
                    resourceId: resource._decorated?.id() || resource.id(),
                  }),
                  notice: {
                    message: "رکورد با موفقیت ویرایش شد",
                    type: "success",
                  },
                  record: { params: updated, errors: {}, populated: {} },
                };
              } catch (error) {
                return {
                  record: {
                    params: request.payload,
                    errors: { analysisFormId: { message: error.message } },
                    populated: {},
                  },
                };
              }
            }

            return {
              record: { params: record.params, errors: {}, populated: {} },
            };
          },
        },
      },
    }),
    prismaResource("FormGoal", {
      navigation: {
        name: "فرم‌های تحلیل",
        icon: "Target",
      },

      properties: {
        id: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: false,
          },
        },

        formId: {
          reference: "AnalysisForm",
          isRequired: true,
          isVisible: {
            list: false,
            filter: false,
            show: false,
            edit: true,
          },
        },

        form: {
          reference: "AnalysisForm",
          isVisible: {
            list: false,
            filter: true,
            show: false,
            edit: false,
          },
        },

        title: {
          isRequired: true,
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: true,
          },
          position: 2,
        },

        projects: {
          isVisible: false,
        },

        createdAt: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: false,
          },
        },

        updatedAt: {
          isVisible: {
            list: false,
            filter: true,
            show: true,
            edit: false,
          },
        },
        formTitle: {
          type: "string",
          isVirtual: true,
          label: "فرم تحلیل",
          isVisible: {
            list: true,
            show: true,
            edit: false,
            filter: false,
          },
        },
      },

      listProperties: ["id", "formTitle", "title", "createdAt"],
      filterProperties: ["id", "form", "title", "createdAt"],
      showProperties: ["id", "formTitle", "title", "createdAt", "updatedAt"],
      editProperties: ["formId", "title"],

      actions: {
        list: {
          after: async (response) => {
            if (!response.records?.length) {
              return response;
            }

            const formIds = [
              ...new Set(
                response.records
                  .map((record) => record.params.form)
                  .filter(Boolean),
              ),
            ];

            const forms = await prisma.analysisForm.findMany({
              where: {
                id: {
                  in: formIds,
                },
              },
              select: {
                id: true,
                title: true,
              },
            });

            const formMap = Object.fromEntries(
              forms.map((form) => [form.id, form.title]),
            );

            response.records.forEach((record) => {
              record.params.formTitle = formMap[record.params.form] || "—";
            });

            return response;
          },
        },
        show: {
          after: async (response) => {
            if (!response.record) {
              return response;
            }

            const form = await prisma.analysisForm.findUnique({
              where: {
                id: response.record.params.form,
              },
              select: {
                title: true,
              },
            });

            response.record.params.formTitle = form?.title || "—";

            return response;
          },
        },

        new: {
          handler: async (request, response, context) => {
            const { resource, h, currentAdmin } = context;

            if (request.method === "get") {
              return {
                resource: resource.decorate().toJSON(currentAdmin),
                record: null,
              };
            }

            const payload = request.payload ?? {};
            const formId = payload.formId;
            const title = payload.title;

            const errors = {};

            if (!formId) {
              errors.formId = { message: "فرم الزامی است" };
            }

            if (!title || !String(title).trim()) {
              errors.title = { message: "عنوان الزامی است" };
            }

            if (Object.keys(errors).length > 0) {
              throw new ValidationError(errors);
            }

            try {
              const created = await prisma.formGoal.create({
                data: {
                  title: String(title).trim(),
                  form: {
                    connect: {
                      id: String(formId),
                    },
                  },
                },
              });

              const record = await resource.findOne(created.id);

              return {
                record: record?.toJSON(currentAdmin),
                notice: {
                  message: "رکورد با موفقیت ایجاد شد",
                  type: "success",
                },
                redirectUrl: h.resourceUrl({
                  resourceId: resource.id(),
                }),
              };
            } catch (error) {
              console.error("FORM_GOAL_CREATE_ERROR:", error);

              throw new ValidationError({
                formId: {
                  message:
                    "فرم انتخاب‌شده معتبر نیست یا ایجاد ارتباط با آن ممکن نشد",
                },
              });
            }
          },
        },

        edit: {
          handler: async (request, response, context) => {
            const { record, resource, h, currentAdmin } = context;

            if (!record) {
              throw new Error("Record not found");
            }

            if (request.method === "get") {
              return {
                record: record.toJSON(currentAdmin),
                resource: resource.decorate().toJSON(currentAdmin),
              };
            }

            const payload = request.payload ?? {};
            const formId = payload.formId;
            const title = payload.title;

            const errors = {};

            if (!formId) {
              errors.formId = { message: "فرم الزامی است" };
            }

            if (!title || !String(title).trim()) {
              errors.title = { message: "عنوان الزامی است" };
            }

            if (Object.keys(errors).length > 0) {
              throw new ValidationError(errors);
            }

            try {
              const updated = await prisma.formGoal.update({
                where: {
                  id: record.param("id"),
                },
                data: {
                  title: String(title).trim(),
                  form: {
                    connect: {
                      id: String(formId),
                    },
                  },
                },
              });

              const refreshed = await resource.findOne(updated.id);

              return {
                record: refreshed?.toJSON(currentAdmin),
                notice: {
                  message: "رکورد با موفقیت ویرایش شد",
                  type: "success",
                },
                redirectUrl: h.recordActionUrl({
                  resourceId: resource.id(),
                  recordId: updated.id,
                  actionName: "show",
                }),
              };
            } catch (error) {
              console.error("FORM_GOAL_UPDATE_ERROR:", error);

              throw new ValidationError({
                formId: {
                  message:
                    "فرم انتخاب‌شده معتبر نیست یا به‌روزرسانی ارتباط با آن ممکن نشد",
                },
              });
            }
          },
        },
      },
    }),
    prismaResource("MultiAnalysisRequiredForm", {
      navigation: {
        name: "تحلیل چندگانه",
        icon: "List",
      },

      properties: {
        id: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },

        multiAnalysisForm: {
          reference: "MultiAnalysisForm",
          isRequired: true,
          isVisible: { list: true, filter: true, show: true, edit: true },
          position: 1,
        },

        form: {
          reference: "AnalysisForm",
          isRequired: true,
          isVisible: { list: true, filter: true, show: true, edit: true },
          position: 2,
        },

        multiAnalysisFormId: {
          isVisible: false,
        },

        formId: {
          isVisible: false,
        },

        order: {
          isRequired: true,
          position: 3,
        },

        createdAt: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },

        updatedAt: {
          isVisible: { list: false, filter: true, show: true, edit: false },
        },
      },

      listProperties: ["id", "multiAnalysisForm", "form", "order", "createdAt"],

      filterProperties: [
        "id",
        "multiAnalysisForm",
        "form",
        "order",
        "createdAt",
      ],

      showProperties: [
        "id",
        "multiAnalysisForm",
        "form",
        "order",
        "createdAt",
        "updatedAt",
      ],

      editProperties: ["multiAnalysisForm", "form", "order"],
    }),
    prismaResource("MultiAnalysisForm", {
      navigation: {
        name: "تحلیل چندگانه",
        icon: "Layers",
      },

      properties: {
        title: {
          isTitle: true,
        },
        temperature: {
          type: "number",
        },
        createdAt: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: false,
          },
        },
        updatedAt: {
          isVisible: {
            list: false,
            filter: true,
            show: true,
            edit: false,
          },
        },
      },

      listProperties: [
        "id",
        "title",
        "description",
        "isActive",
        "order",
        "temperature",
        "createdAt",
      ],

      filterProperties: [
        "title",
        "isActive",
        "order",
        "temperature",
        "createdAt",
      ],

      showProperties: [
        "id",
        "title",
        "description",
        "isActive",
        "order",
        "temperature",
        "createdAt",
        "updatedAt",
      ],

      editProperties: [
        "title",
        "description",
        "isActive",
        "order",
        "temperature",
      ],
    }),
    prismaResource("MultiAnalysisGoal", {
      navigation: {
        name: "تحلیل چندگانه",
        icon: "Target",
      },

      properties: {
        id: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: false,
          },
        },

        multiAnalysisFormId: {
          reference: "MultiAnalysisForm",
          isRequired: true,
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: true,
          },
          position: 1,
        },

        title: {
          isRequired: true,
          position: 2,
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: true,
          },
        },

        createdAt: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: false,
          },
        },

        updatedAt: {
          isVisible: {
            list: false,
            filter: true,
            show: true,
            edit: false,
          },
        },

        multiAnalysisFormTitle: {
          type: "string",
          isVirtual: true,
          label: "فرم تحلیل چندگانه",
          isVisible: {
            list: true,
            show: true,
            edit: false,
            filter: false,
          },
        },
        multiAnalysisForm: {
          reference: "MultiAnalysisForm",
          isVisible: {
            list: false,
            filter: true,
            show: false,
            edit: false,
          },
        },
      },

      listProperties: ["id", "multiAnalysisFormTitle", "title", "createdAt"],
      filterProperties: ["id", "multiAnalysisForm", "title", "createdAt"],
      showProperties: [
        "id",
        "multiAnalysisFormTitle",
        "title",
        "createdAt",
        "updatedAt",
      ],

      editProperties: ["multiAnalysisFormId", "title"],

      actions: {
        list: {
          after: async (response) => {
            if (!response.records?.length) {
              return response;
            }

            const formIds = [
              ...new Set(
                response.records
                  .map((record) => record.params.multiAnalysisForm)
                  .filter(Boolean),
              ),
            ];

            const forms = await prisma.multiAnalysisForm.findMany({
              where: {
                id: {
                  in: formIds,
                },
              },
              select: {
                id: true,
                title: true,
              },
            });

            const formMap = Object.fromEntries(
              forms.map((form) => [form.id, form.title]),
            );

            response.records.forEach((record) => {
              record.params.multiAnalysisFormTitle =
                formMap[record.params.multiAnalysisForm] || "—";
            });

            return response;
          },
        },

        show: {
          after: async (response) => {
            if (!response.record) {
              return response;
            }

            const form = await prisma.multiAnalysisForm.findUnique({
              where: {
                id: response.record.params.multiAnalysisForm,
              },
              select: {
                title: true,
              },
            });

            response.record.params.multiAnalysisFormTitle = form?.title || "—";

            return response;
          },
        },
        new: {
          handler: async (request, response, context) => {
            const { resource, h, currentAdmin } = context;
            if (request.method === "get") {
              return {
                resource: resource.decorate().toJSON(currentAdmin),
                record: null,
              };
            }

            const payload = request.payload ?? {};

            const multiAnalysisFormId = String(
              payload.multiAnalysisFormId ?? "",
            ).trim();

            const title = String(payload.title ?? "").trim();

            const errors = {};

            if (!multiAnalysisFormId) {
              errors.multiAnalysisFormId = {
                message: "انتخاب فرم تحلیل چندگانه الزامی است.",
              };
            }

            if (!title) {
              errors.title = {
                message: "عنوان هدف الزامی است.",
              };
            }

            if (Object.keys(errors).length > 0) {
              throw new ValidationError(errors);
            }

            try {
              const created = await prisma.multiAnalysisGoal.create({
                data: {
                  title,

                  multiAnalysisForm: {
                    connect: {
                      id: multiAnalysisFormId,
                    },
                  },
                },
              });

              const record = await resource.findOne(created.id);

              return {
                record: record?.toJSON(currentAdmin),

                notice: {
                  message: "هدف تحلیل چندگانه با موفقیت ایجاد شد.",
                  type: "success",
                },

                redirectUrl: h.recordActionUrl({
                  resourceId: resource.id(),
                  recordId: created.id,
                  actionName: "show",
                }),
              };
            } catch (error) {
              console.error("MULTI_ANALYSIS_GOAL_CREATE_ERROR:", error);

              if (error instanceof ValidationError) {
                throw error;
              }

              throw new ValidationError({
                multiAnalysisFormId: {
                  message:
                    "فرم تحلیل چندگانه انتخاب‌شده معتبر نیست یا ایجاد ارتباط با آن ممکن نشد.",
                },
              });
            }
          },
        },
        edit: {
          handler: async (request, response, context) => {
            const { record, resource, h, currentAdmin } = context;

            if (!record) {
              throw new Error("Record not found");
            }

            if (request.method === "get") {
              return {
                record: record.toJSON(currentAdmin),
                resource: resource.decorate().toJSON(currentAdmin),
              };
            }

            const payload = request.payload ?? {};

            const multiAnalysisFormId = String(
              payload.multiAnalysisFormId ?? "",
            ).trim();

            const title = String(payload.title ?? "").trim();

            const errors = {};

            if (!multiAnalysisFormId) {
              errors.multiAnalysisFormId = {
                message: "انتخاب فرم تحلیل چندگانه الزامی است.",
              };
            }

            if (!title) {
              errors.title = {
                message: "عنوان هدف الزامی است.",
              };
            }

            if (Object.keys(errors).length > 0) {
              throw new ValidationError(errors);
            }

            try {
              const updated = await prisma.multiAnalysisGoal.update({
                where: {
                  id: String(record.param("id")),
                },

                data: {
                  title,

                  multiAnalysisForm: {
                    connect: {
                      id: multiAnalysisFormId,
                    },
                  },
                },
              });

              const refreshed = await resource.findOne(updated.id);

              return {
                record: refreshed?.toJSON(currentAdmin),

                notice: {
                  message: "هدف تحلیل چندگانه با موفقیت ویرایش شد.",
                  type: "success",
                },

                redirectUrl: h.recordActionUrl({
                  resourceId: resource.id(),
                  recordId: updated.id,
                  actionName: "show",
                }),
              };
            } catch (error) {
              console.error("MULTI_ANALYSIS_GOAL_UPDATE_ERROR:", error);

              if (error instanceof ValidationError) {
                throw error;
              }

              throw new ValidationError({
                multiAnalysisFormId: {
                  message:
                    "فرم تحلیل چندگانه انتخاب‌شده معتبر نیست یا به‌روزرسانی ارتباط با آن ممکن نشد.",
                },
              });
            }
          },
        },
      },
    }),
    prismaResource("FollowUpForm", {
      navigation: {
        name: "پیگیری‌ها",
        icon: "Clipboard",
      },

      properties: {
        id: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },

        title: {
          isVisible: { list: true, filter: true, show: true, edit: true },
          isRequired: true,
        },

        description: {
          type: "textarea",
          isVisible: { list: true, filter: true, show: true, edit: true },
        },

        isActive: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },

        order: {
          isVisible: { list: true, filter: true, show: true, edit: true },
          isRequired: true,
        },

        createdAt: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },

        updatedAt: {
          isVisible: { list: false, filter: true, show: true, edit: false },
        },
      },

      listProperties: [
        "id",
        "title",
        "description",
        "isActive",
        "order",
        "createdAt",
      ],

      editProperties: ["title", "description", "isActive", "order"],

      showProperties: [
        "id",
        "title",
        "description",
        "isActive",
        "order",
        "createdAt",
        "updatedAt",
      ],

      filterProperties: [
        "id",
        "title",
        "description",
        "isActive",
        "order",
        "createdAt",
        "updatedAt",
      ],

      actions: {
        new: {
          handler: async (request, response, context) => {
            const { resource, h, currentAdmin } = context;

            if (request.method === "get") {
              return {
                resource: resource.decorate().toJSON(currentAdmin),
                record: resource.build({}).toJSON(currentAdmin),
              };
            }

            const payload = { ...(request.payload || {}) };

            const title = String(payload.title || "").trim();

            const description =
              payload.description !== undefined && payload.description !== null
                ? String(payload.description).trim()
                : "";

            const isActive = parseBooleanValue(payload.isActive);

            const order = parseIntegerValue(payload.order);

            const errors = {};

            if (!title) {
              errors.title = {
                message: "عنوان فرم الزامی است.",
              };
            }

            if (order === null) {
              errors.order = {
                message: "ترتیب باید یک عدد صحیح باشد.",
              };
            }

            if (Object.keys(errors).length > 0) {
              throw new ValidationError(errors);
            }

            const data = {
              title,
              description,
              isActive,
              order,
            };

            const created = await prisma.followUpForm.create({
              data,
            });

            const record = await resource.findOne(created.id);
            const recordJson = record?.toJSON(currentAdmin);

            return {
              record: recordJson,
              notice: {
                message: "فرم پیگیری با موفقیت ایجاد شد.",
                type: "success",
              },
              redirectUrl: h.recordActionUrl({
                resourceId: resource.id(),
                recordId: created.id,
                actionName: "show",
              }),
            };
          },
        },

        edit: {
          handler: async (request, response, context) => {
            const { record, resource, h, currentAdmin } = context;

            if (!record) {
              throw new Error("Record not found");
            }

            if (request.method === "get") {
              return {
                record: record.toJSON(currentAdmin),
                resource: resource.decorate().toJSON(currentAdmin),
              };
            }

            const recordId = String(record.param("id"));

            const payload = { ...(request.payload || {}) };

            const title = String(payload.title || "").trim();

            const description =
              payload.description !== undefined && payload.description !== null
                ? String(payload.description).trim()
                : "";

            const isActive = parseBooleanValue(payload.isActive);

            const order = parseIntegerValue(payload.order);

            const errors = {};

            if (!title) {
              errors.title = {
                message: "عنوان فرم الزامی است.",
              };
            }

            if (order === null) {
              errors.order = {
                message: "ترتیب باید یک عدد صحیح باشد.",
              };
            }

            if (Object.keys(errors).length > 0) {
              throw new ValidationError(errors);
            }

            const data = {
              title,
              description,
              isActive,
              order,
            };

            const updated = await prisma.followUpForm.update({
              where: {
                id: recordId,
              },
              data,
            });

            const refreshed = await resource.findOne(updated.id);
            const refreshedJson = refreshed?.toJSON(currentAdmin);

            return {
              record: refreshedJson,
              notice: {
                message: "فرم پیگیری با موفقیت ویرایش شد.",
                type: "success",
              },
              redirectUrl: h.recordActionUrl({
                resourceId: resource.id(),
                recordId: updated.id,
                actionName: "show",
              }),
            };
          },
        },
      },
    }),
    prismaResource("FollowUpFormQuestion", {
      navigation: {
        name: "پیگیری‌ها",
        icon: "HelpCircle",
      },

      properties: {
        id: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },

        formId: {
          reference: "FollowUpForm",
          isRequired: true,
          position: 1,
          isVisible: { list: true, filter: true, show: true, edit: true },
        },

        form: {
          reference: "FollowUpForm",
          isVisible: {
            list: false,
            filter: true,
            show: false,
            edit: false,
          },
        },

        label: {
          isRequired: true,
          position: 2,
          isVisible: { list: true, filter: true, show: true, edit: true },
        },

        type: {
          isRequired: true,
          position: 3,
          availableValues: questionTypeValues,
          isVisible: { list: true, filter: true, show: true, edit: true },
        },

        optionsText: {
          type: "textarea",
          position: 4,
          props: {
            rows: 10,
            placeholder: `[
  {
    "label": "گزینه اول",
    "value": "option_1"
  },
  {
    "label": "گزینه دوم",
    "value": "option_2"
  }
]`,
          },
          description: "فقط برای RADIO و CHECKBOX",
          isVisible: { list: false, filter: false, show: true, edit: true },
        },

        options: {
          type: "mixed",
          isVisible: { list: false, filter: false, show: false, edit: false },
        },

        required: {
          position: 5,
          isVisible: { list: true, filter: true, show: true, edit: true },
        },

        order: {
          position: 6,
          isRequired: true,
          isVisible: { list: true, filter: true, show: true, edit: true },
        },

        createdAt: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },

        updatedAt: {
          isVisible: { list: false, filter: true, show: true, edit: false },
        },
      },

      listProperties: ["id", "formId", "label", "type", "required", "order"],

      editProperties: [
        "formId",
        "label",
        "type",
        "optionsText",
        "required",
        "order",
      ],

      showProperties: [
        "id",
        "formId",
        "label",
        "type",
        "optionsText",
        "required",
        "order",
        "createdAt",
        "updatedAt",
      ],

      filterProperties: [
        "id",
        "form",
        "label",
        "type",
        "required",
        "order",
        "createdAt",
        "updatedAt",
      ],

      actions: {
        new: {
          handler: async (request, response, context) => {
            const { resource, h, currentAdmin } = context;

            if (request.method === "get") {
              return {
                resource: resource.decorate().toJSON(currentAdmin),
                record: resource.build({}).toJSON(currentAdmin),
              };
            }

            const payload = { ...(request.payload || {}) };

            delete payload.form;

            const formId = String(payload.formId || "").trim();
            const label = String(payload.label || "").trim();
            const type = String(payload.type || "").trim();
            const required = parseBooleanValue(payload.required);
            const order = parseIntegerValue(payload.order);
            const optionsText = payload.optionsText;

            const errors = {};

            if (!formId) {
              errors.formId = {
                message: "انتخاب فرم الزامی است.",
              };
            }

            if (!label) {
              errors.label = {
                message: "عنوان سوال الزامی است.",
              };
            }

            if (!type) {
              errors.type = {
                message: "نوع سوال الزامی است.",
              };
            }

            if (order === null) {
              errors.order = {
                message: "ترتیب باید یک عدد صحیح باشد.",
              };
            }

            if (Object.keys(errors).length > 0) {
              throw new ValidationError(errors);
            }

            const formExists = await prisma.followUpForm.findUnique({
              where: {
                id: formId,
              },
            });

            if (!formExists) {
              throw new ValidationError({
                formId: {
                  message: "فرم پیگیری انتخاب‌شده وجود ندارد.",
                },
              });
            }

            const parsedOptions = parseOptionsText(optionsText);

            validateQuestionOptions({
              type,
              options: parsedOptions,
            });

            const data = {
              label,
              type,
              options: parsedOptions,
              required,
              order,
              form: {
                connect: {
                  id: formId,
                },
              },
            };

            const created = await prisma.followUpFormQuestion.create({
              data,
            });

            const record = await resource.findOne(created.id);
            const recordJson = record?.toJSON(currentAdmin);

            return {
              record: recordJson
                ? buildOptionsTextFromRecord(recordJson)
                : null,
              notice: {
                message: "سوال فرم پیگیری با موفقیت ایجاد شد.",
                type: "success",
              },
              redirectUrl: h.recordActionUrl({
                resourceId: resource.id(),
                recordId: created.id,
                actionName: "show",
              }),
            };
          },
        },

        edit: {
          before: async (request) => {
            if (request.method === "post") {
              const parsedOptions = parseOptionsText(
                request.payload?.optionsText,
              );

              request.payload.options = parsedOptions;

              delete request.payload.optionsText;
            }

            return request;
          },

          after: async (response, request) => {
            if (request.method === "get" && response.record) {
              response.record.params.optionsText = JSON.stringify(
                buildOptionsFromParams(response.record.params),
                null,
                2,
              );
            }

            return response;
          },
        },

        show: {
          after: fillOptionsTextAfterLoad,
        },

        list: {
          after: async (response) => {
            if (response.records) {
              response.records = response.records.map((record) => {
                return buildOptionsTextFromRecord(record);
              });
            }

            return response;
          },
        },
      },
    }),
    prismaResource("FollowUpRequest", {
      navigation: {
        name: "درخواست‌های پیگیری",
        icon: "MessageSquare",
      },

      properties: {
        id: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },

        title: {
          isTitle: true,
          isVisible: { list: true, filter: true, show: true, edit: false },
        },

        status: {
          availableValues: [
            { value: "PENDING", label: "در انتظار" },
            { value: "ANSWERED", label: "پاسخ داده شده" },
          ],
          isVisible: { list: true, filter: true, show: true, edit: false },
          position: 2,
        },

        projectId: {
          reference: "Project",
          isVisible: {
            list: false,
            filter: false,
            show: true,
            edit: false,
          },
        },

        project: {
          reference: "Project",
          isVisible: {
            list: true,
            show: true,
            filter: true,
            edit: false,
          },
        },

        user: {
          reference: "User",
          isVisible: {
            list: true,
            show: true,
            filter: true,
            edit: false,
          },
        },

        userId: {
          reference: "User",
          isVisible: {
            list: false,
            filter: false,
            show: true,
            edit: false,
          },
        },

        formId: {
          reference: "FollowUpForm",
          isVisible: {
            list: false,
            filter: false,
            show: true,
            edit: false,
          },
        },

        form: {
          reference: "FollowUpForm",
          isVisible: {
            list: false,
            filter: true,
            show: false,
            edit: false,
          },
        },

        responses: {
          type: "mixed",
          isVisible: { list: false, filter: false, show: true, edit: false },
        },

        adminAnswer: {
          type: "textarea",
          isVisible: { list: false, filter: false, show: true, edit: true },
          props: {
            rows: 10,
            placeholder: "پاسخ خود را به کاربر بنویسید...",
          },
        },

        answeredAt: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },

        answeredById: {
          reference: "User",
          isVisible: { list: true, filter: true, show: true, edit: false },
        },

        createdAt: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },
      },

      listProperties: ["id", "title", "status", "project", "user", "createdAt"],

      filterProperties: [
        "status",
        "project",
        "user",
        "form",
        "title",
        "createdAt",
      ],
      showProperties: [
        "id",
        "title",
        "status",
        "projectId",
        "project",
        "userId",
        "formId",
        "responses",
        "adminAnswer",
        "answeredAt",
        "answeredById",
        "createdAt",
      ],

      editProperties: ["adminAnswer"], // فقط پاسخ

      actions: {
        edit: {
          handler: async (request, response, context) => {
            const { record, resource, h, currentAdmin } = context;
            if (!record) throw new Error("Record not found");

            if (request.method === "get") {
              return {
                record: record.toJSON(currentAdmin),
                resource: resource.decorate().toJSON(currentAdmin),
              };
            }

            const payload = { ...(request.payload || {}) };
            const adminAnswer = String(payload.adminAnswer || "").trim();
            const recordId = String(record.param("id"));

            if (!adminAnswer) {
              throw new ValidationError({
                adminAnswer: { message: "لطفاً پاسخ خود را وارد کنید." },
              });
            }

            try {
              // 1. به‌روزرسانی درخواست پیگیری
              const updated = await prisma.followUpRequest.update({
                where: { id: recordId },
                data: {
                  adminAnswer,
                  status: "ANSWERED",
                  answeredAt: new Date(),
                  answeredById: currentAdmin.id,
                },
                include: {
                  user: true,
                  project: true,
                },
              });

              await prisma.notification.create({
                data: {
                  userId: updated.userId,
                  type: "FOLLOW_UP_ANSWERED",
                  title: "پاسخ به درخواست پیگیری",
                  message: `ادمین به درخواست پیگیری شما با عنوان «${updated.title}» پاسخ داده است.`,
                  referenceId: updated.id,
                  referenceType: "FollowUpRequest",
                },
              });

              const refreshed = await resource.findOne(updated.id);

              return {
                record: refreshed?.toJSON(currentAdmin),
                notice: {
                  message:
                    "✅ پاسخ با موفقیت ثبت شد و وضعیت به 'پاسخ داده شده' تغییر کرد.",
                  type: "success",
                },
                redirectUrl: h.recordActionUrl({
                  resourceId: resource.id(),
                  recordId: updated.id,
                  actionName: "show",
                }),
              };
            } catch (error) {
              console.error("FOLLOWUP_ANSWER_ERROR:", error);
              throw new ValidationError({
                adminAnswer: { message: "خطا در ثبت پاسخ. دوباره تلاش کنید." },
              });
            }
          },
        },
      },
    }),
    prismaResource("Notification", {
      navigation: {
        name: "اعلان‌ها",
        icon: "Bell",
      },
      properties: {
        userId: {
          isVisible: { list: true, filter: false, show: true, edit: true },
        },

        user: {
          reference: "User",
          isVisible: {
            list: false,
            filter: true,
            show: false,
            edit: true,
          },
        },
        referenceId: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },
        referenceType: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },
        createdAt: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },
        updatedAt: {
          isVisible: { list: false, filter: true, show: true, edit: false },
        },

        username: {
          type: "string",
          isVirtual: true,
          label: "کاربر",
          isVisible: {
            list: true,
            show: true,
            edit: false,
            filter: false,
          },
        },
      },
      listProperties: [
        "id",
        "username",
        "type",
        "title",
        "isRead",
        "referenceId",
        "createdAt",
      ],
      showProperties: [
        "id",
        "username",
        "type",
        "title",
        "message",
        "isRead",
        "referenceId",
        "referenceType",
        "createdAt",
      ],
      editProperties: [
        "user",
        "type",
        "title",
        "message",
        "isRead",
        "referenceId",
        "referenceType",
      ],
      filterProperties: [
        "user",
        "type",
        "title",
        "isRead",
        "referenceId",
        "createdAt",
      ],
      actions: {
        list: {
          after: async (response) => {
            if (!response.records?.length) {
              return response;
            }

            const userIds = [
              ...new Set(
                response.records
                  .map((record) => record.params.user)
                  .filter(Boolean),
              ),
            ];

            const users = await prisma.user.findMany({
              where: {
                id: {
                  in: userIds,
                },
              },
              select: {
                id: true,
                username: true,
              },
            });

            const userMap = Object.fromEntries(
              users.map((user) => [user.id, user.username]),
            );

            response.records.forEach((record) => {
              record.params.username = userMap[record.params.user] || "—";
            });

            return response;
          },
        },

        show: {
          after: async (response) => {
            if (!response.record) {
              return response;
            }

            const userId = response.record.params.user;

            if (!userId) {
              response.record.params.username = "—";
              return response;
            }

            const user = await prisma.user.findUnique({
              where: {
                id: userId,
              },
              select: {
                username: true,
              },
            });

            response.record.params.username = user?.username || "—";

            return response;
          },
        },
      },
    }),
    prismaResource("RefreshToken", {
      navigation: {
        name: "امنیت",
        icon: "Key",
      },
      properties: {
        tokenHash: {
          isVisible: { list: false, filter: false, show: true, edit: false },
        },
        userId: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },
        expiresAt: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },
        revoked: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },
        createdAt: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },
        updatedAt: {
          isVisible: { list: false, filter: true, show: true, edit: false },
        },
      },
      listProperties: ["id", "userId", "expiresAt", "revoked", "createdAt"],
      editProperties: ["userId", "expiresAt", "revoked"],
    }),
    prismaResource("PromptDefinition", {
      navigation: {
        name: "پرامپت‌ها",
        icon: "Terminal",
      },

      titleProperty: "title",

      properties: {
        id: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },

        title: {
          isVisible: { list: true, filter: true, show: true, edit: true },
          position: 1,
        },

        ownerType: {
          isVisible: { list: true, filter: true, show: true, edit: true },
          availableValues: [
            { value: "ANALYSIS_FORM", label: "Analysis Form" },
            { value: "MULTI_ANALYSIS_FORM", label: "Multi Analysis Form" },
          ],
          position: 2,
        },

        analysisFormId: {
          reference: "AnalysisForm",
          isVisible: { list: true, filter: true, show: true, edit: true },
          position: 3,
        },

        analysisForm: {
          reference: "AnalysisForm",
          isVisible: {
            list: false,
            filter: true,
            show: false,
            edit: false,
          },
        },
        multiAnalysisFormId: {
          reference: "MultiAnalysisForm",
          isVisible: { list: true, filter: true, show: true, edit: true },
          position: 4,
        },

        multiAnalysisForm: {
          reference: "MultiAnalysisForm",
          isVisible: {
            list: false,
            filter: true,
            show: false,
            edit: false,
          },
        },

        createdAt: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },

        updatedAt: {
          isVisible: { list: false, filter: true, show: true, edit: false },
        },
        analysisOwnerTitle: {
          type: "string",
          isVirtual: true,
          label: "مالک پرامپت",
          isVisible: {
            list: true,
            show: true,
            edit: false,
            filter: false,
          },
        },
      },

      listProperties: [
        "id",
        "title",
        "ownerType",
        "analysisOwnerTitle",
        "createdAt",
      ],

      editProperties: [
        "title",
        "ownerType",
        "analysisFormId",
        "multiAnalysisFormId",
      ],

      showProperties: [
        "id",
        "title",
        "ownerType",
        "analysisOwnerTitle",
        "createdAt",
        "updatedAt",
      ],

      filterProperties: [
        "id",
        "title",
        "ownerType",
        "analysisForm",
        "multiAnalysisForm",
        "createdAt",
        "updatedAt",
      ],

      actions: {
        list: {
          after: async (response) => {
            if (!response.records?.length) {
              return response;
            }

            const analysisFormIds = [
              ...new Set(
                response.records
                  .map((r) => r.params.analysisForm)
                  .filter(Boolean),
              ),
            ];

            const multiAnalysisFormIds = [
              ...new Set(
                response.records
                  .map((r) => r.params.multiAnalysisForm)
                  .filter(Boolean),
              ),
            ];

            const [analysisForms, multiAnalysisForms] = await Promise.all([
              prisma.analysisForm.findMany({
                where: {
                  id: {
                    in: analysisFormIds,
                  },
                },
                select: {
                  id: true,
                  title: true,
                },
              }),

              prisma.multiAnalysisForm.findMany({
                where: {
                  id: {
                    in: multiAnalysisFormIds,
                  },
                },
                select: {
                  id: true,
                  title: true,
                },
              }),
            ]);

            const analysisMap = Object.fromEntries(
              analysisForms.map((item) => [item.id, item.title]),
            );

            const multiAnalysisMap = Object.fromEntries(
              multiAnalysisForms.map((item) => [item.id, item.title]),
            );

            response.records.forEach((record) => {
              if (record.params.ownerType === "ANALYSIS_FORM") {
                record.params.analysisOwnerTitle =
                  analysisMap[record.params.analysisForm] || "—";
              } else {
                record.params.analysisOwnerTitle =
                  multiAnalysisMap[record.params.multiAnalysisForm] || "—";
              }
            });

            return response;
          },
        },

        show: {
          after: async (response) => {
            if (!response.record) {
              return response;
            }

            const params = response.record.params;

            if (params.ownerType === "ANALYSIS_FORM") {
              const form = await prisma.analysisForm.findUnique({
                where: {
                  id: params.analysisForm,
                },
                select: {
                  title: true,
                },
              });

              params.analysisOwnerTitle = form?.title || "—";
            } else {
              const form = await prisma.multiAnalysisForm.findUnique({
                where: {
                  id: params.multiAnalysisForm,
                },
                select: {
                  title: true,
                },
              });

              params.analysisOwnerTitle = form?.title || "—";
            }

            return response;
          },
        },
        new: {
          handler: async (request, response, context) => {
            const { resource, h, currentAdmin } = context;

            if (request.method !== "post") {
              return {
                record: resource.build({}).toJSON(currentAdmin),
              };
            }

            const payload = { ...(request.payload || {}) };

            const ownerType = String(payload.ownerType || "").trim();
            let title = payload.title ? String(payload.title).trim() : "";

            const analysisFormId = payload.analysisFormId
              ? String(payload.analysisFormId).trim()
              : null;

            const multiAnalysisFormId = payload.multiAnalysisFormId
              ? String(payload.multiAnalysisFormId).trim()
              : null;

            if (!ownerType) {
              throw new Error("ownerType is required");
            }

            const data = {
              ownerType,
            };

            if (ownerType === "ANALYSIS_FORM") {
              if (!analysisFormId) {
                throw new Error(
                  "analysisFormId is required when ownerType is ANALYSIS_FORM",
                );
              }

              const analysisFormExists = await prisma.analysisForm.findUnique({
                where: { id: analysisFormId },
                select: { id: true, title: true },
              });

              if (!analysisFormExists) {
                throw new Error(
                  "AnalysisForm not found with this analysisFormId",
                );
              }

              if (!title) {
                title = `پرامپت فرم: ${analysisFormExists.title}`;
              }

              data.title = title;
              data.analysisForm = {
                connect: {
                  id: analysisFormId,
                },
              };
            } else if (ownerType === "MULTI_ANALYSIS_FORM") {
              if (!multiAnalysisFormId) {
                throw new Error(
                  "multiAnalysisFormId is required when ownerType is MULTI_ANALYSIS_FORM",
                );
              }

              const multiAnalysisFormExists =
                await prisma.multiAnalysisForm.findUnique({
                  where: { id: multiAnalysisFormId },
                  select: { id: true, title: true },
                });

              if (!multiAnalysisFormExists) {
                throw new Error(
                  "MultiAnalysisForm not found with this multiAnalysisFormId",
                );
              }

              if (!title) {
                title = `پرامپت تحلیل چندگانه: ${multiAnalysisFormExists.title}`;
              }

              data.title = title;
              data.multiAnalysisForm = {
                connect: {
                  id: multiAnalysisFormId,
                },
              };
            } else {
              throw new Error("Invalid ownerType");
            }

            const created = await prisma.promptDefinition.create({
              data,
            });

            const record = resource.build(created);

            return {
              record: record.toJSON(currentAdmin),
              redirectUrl: h.recordActionUrl({
                resourceId: resource.id(),
                recordId: created.id,
                actionName: "show",
              }),
              notice: {
                message: "پرامپت با موفقیت ایجاد شد",
                type: "success",
              },
            };
          },
        },

        edit: {
          handler: async (request, response, context) => {
            const { record, resource, h, currentAdmin } = context;

            if (!record) {
              throw new Error("Record not found");
            }

            const recordId = record.params.id;

            if (request.method !== "post") {
              return {
                record: record.toJSON(currentAdmin),
              };
            }

            const payload = { ...(request.payload || {}) };

            const ownerType = String(payload.ownerType || "").trim();
            let title = payload.title ? String(payload.title).trim() : "";

            const analysisFormId = payload.analysisFormId
              ? String(payload.analysisFormId).trim()
              : null;

            const multiAnalysisFormId = payload.multiAnalysisFormId
              ? String(payload.multiAnalysisFormId).trim()
              : null;

            if (!ownerType) {
              throw new Error("ownerType is required");
            }

            const data = {
              ownerType,
            };

            if (ownerType === "ANALYSIS_FORM") {
              if (!analysisFormId) {
                throw new Error(
                  "analysisFormId is required when ownerType is ANALYSIS_FORM",
                );
              }

              const analysisFormExists = await prisma.analysisForm.findUnique({
                where: { id: analysisFormId },
                select: { id: true, title: true },
              });

              if (!analysisFormExists) {
                throw new Error(
                  "AnalysisForm not found with this analysisFormId",
                );
              }

              if (!title) {
                title = `پرامپت فرم: ${analysisFormExists.title}`;
              }

              data.title = title;
              data.analysisForm = {
                connect: {
                  id: analysisFormId,
                },
              };
              data.multiAnalysisForm = {
                disconnect: true,
              };
            } else if (ownerType === "MULTI_ANALYSIS_FORM") {
              if (!multiAnalysisFormId) {
                throw new Error(
                  "multiAnalysisFormId is required when ownerType is MULTI_ANALYSIS_FORM",
                );
              }

              const multiAnalysisFormExists =
                await prisma.multiAnalysisForm.findUnique({
                  where: { id: multiAnalysisFormId },
                  select: { id: true, title: true },
                });

              if (!multiAnalysisFormExists) {
                throw new Error(
                  "MultiAnalysisForm not found with this multiAnalysisFormId",
                );
              }

              if (!title) {
                title = `پرامپت تحلیل چندگانه: ${multiAnalysisFormExists.title}`;
              }

              data.title = title;
              data.multiAnalysisForm = {
                connect: {
                  id: multiAnalysisFormId,
                },
              };
              data.analysisForm = {
                disconnect: true,
              };
            } else {
              throw new Error("Invalid ownerType");
            }

            const updated = await prisma.promptDefinition.update({
              where: {
                id: recordId,
              },
              data,
            });

            const updatedRecord = resource.build(updated);

            return {
              record: updatedRecord.toJSON(currentAdmin),
              redirectUrl: h.recordActionUrl({
                resourceId: resource.id(),
                recordId,
                actionName: "show",
              }),
              notice: {
                message: "پرامپت با موفقیت ویرایش شد",
                type: "success",
              },
            };
          },
        },
      },
    }),
    prismaResource("PromptSegmentDefinition", {
      navigation: {
        name: "پرامپت‌ها",
        icon: "List",
      },
      titleProperty: "label",

      properties: {
        id: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },

        // FK به PromptDefinition
        promptDefinitionId: {
          reference: "PromptDefinition",
          isRequired: true,
          isVisible: {
            list: true,
            filter: false,
            show: true,
            edit: true,
          },
        },

        promptDefinition: {
          reference: "PromptDefinition",
          isVisible: {
            list: false,
            filter: true,
            show: false,
            edit: false,
          },
        },
        key: {
          isRequired: true,
          isVisible: { list: true, filter: true, show: true, edit: true },
          position: 2,
        },

        label: {
          isRequired: true,
          isVisible: { list: true, filter: true, show: true, edit: true },
          position: 3,
        },

        description: {
          type: "textarea",
          isVisible: { list: false, filter: false, show: true, edit: true },
          position: 4,
        },

        sortOrder: {
          isVisible: { list: true, filter: true, show: true, edit: true },
          position: 5,
        },

        isRequired: {
          isVisible: { list: true, filter: true, show: true, edit: true },
          position: 6,
        },

        createdAt: {
          isVisible: { list: true, filter: true, show: true, edit: false },
          position: 100,
        },

        updatedAt: {
          isVisible: { list: false, filter: true, show: true, edit: false },
          position: 101,
        },
        promptDefinitionTitle: {
          type: "string",
          isVirtual: true,
          label: "پرامپت",
          isVisible: {
            list: true,
            show: true,
            edit: false,
            filter: false,
          },
        },
      },

      listProperties: [
        "id",
        "promptDefinitionTitle",
        "key",
        "label",
        "sortOrder",
        "isRequired",
        "createdAt",
      ],

      editProperties: [
        "promptDefinitionId",
        "key",
        "label",
        "description",
        "sortOrder",
        "isRequired",
      ],

      showProperties: [
        "id",
        "promptDefinitionTitle",
        "key",
        "label",
        "description",
        "sortOrder",
        "isRequired",
        "createdAt",
        "updatedAt",
      ],

      filterProperties: [
        "id",
        "promptDefinition",
        "key",
        "label",
        "sortOrder",
        "isRequired",
        "createdAt",
        "updatedAt",
      ],

      actions: {
        list: {
          after: async (response) => {
            if (!response.records?.length) {
              return response;
            }

            const promptDefinitionIds = [
              ...new Set(
                response.records
                  .map((record) => record.params.promptDefinition)
                  .filter(Boolean),
              ),
            ];

            const promptDefinitions = await prisma.promptDefinition.findMany({
              where: {
                id: {
                  in: promptDefinitionIds,
                },
              },
              select: {
                id: true,
                title: true,
              },
            });

            const promptMap = Object.fromEntries(
              promptDefinitions.map((item) => [item.id, item.title]),
            );

            response.records.forEach((record) => {
              record.params.promptDefinitionTitle =
                promptMap[record.params.promptDefinition] || "—";
            });

            return response;
          },
        },

        show: {
          after: async (response) => {
            if (!response.record) {
              return response;
            }

            const promptDefinition = await prisma.promptDefinition.findUnique({
              where: {
                id: response.record.params.promptDefinition,
              },
              select: {
                title: true,
              },
            });

            response.record.params.promptDefinitionTitle =
              promptDefinition?.title || "—";

            return response;
          },
        },
        new: {
          handler: async (request, response, context) => {
            const { resource, h, currentAdmin } = context;

            if (request.method !== "post") {
              // فرم خالی
              return {
                record: resource.build({}).toJSON(currentAdmin),
              };
            }

            const payload = { ...(request.payload || {}) };

            delete payload.promptDefinition;

            const promptDefinitionId = payload.promptDefinitionId
              ? String(payload.promptDefinitionId).trim()
              : "";

            const key = payload.key ? String(payload.key).trim() : "";
            const label = payload.label ? String(payload.label).trim() : "";
            const description = payload.description
              ? String(payload.description).trim()
              : null;

            const sortOrder =
              payload.sortOrder !== undefined && payload.sortOrder !== null
                ? Number(payload.sortOrder)
                : null;

            const isRequired =
              typeof payload.isRequired === "boolean"
                ? payload.isRequired
                : payload.isRequired === "true";

            if (!promptDefinitionId) {
              throw new Error("promptDefinitionId is required");
            }

            if (!key) {
              throw new Error("key is required");
            }

            if (!label) {
              throw new Error("label is required");
            }

            if (sortOrder !== null && Number.isNaN(sortOrder)) {
              throw new Error("sortOrder must be a valid number");
            }

            const promptDefinitionExists =
              await prisma.promptDefinition.findUnique({
                where: { id: promptDefinitionId },
              });

            if (!promptDefinitionExists) {
              throw new Error("PromptDefinition not found with this id");
            }

            const data = {
              key,
              label,
              description,
              sortOrder,
              isRequired,
              promptDefinition: {
                connect: { id: promptDefinitionId },
              },
            };

            const created = await prisma.promptSegmentDefinition.create({
              data,
            });

            const record = resource.build(created);

            return {
              record: record.toJSON(currentAdmin),
              redirectUrl: h.recordActionUrl({
                resourceId: resource.id(),
                recordId: created.id,
                actionName: "show",
              }),
              notice: {
                message: "بخش پرامپت با موفقیت ایجاد شد",
                type: "success",
              },
            };
          },
        },

        edit: {
          handler: async (request, response, context) => {
            const { record, resource, h, currentAdmin } = context;

            if (!record) {
              throw new Error("Record not found");
            }

            const recordId = record.params.id;

            if (request.method !== "post") {
              return {
                record: record.toJSON(currentAdmin),
              };
            }

            const payload = { ...(request.payload || {}) };

            delete payload.promptDefinition;

            const promptDefinitionId = payload.promptDefinitionId
              ? String(payload.promptDefinitionId).trim()
              : "";

            const key = payload.key ? String(payload.key).trim() : "";
            const label = payload.label ? String(payload.label).trim() : "";
            const description = payload.description
              ? String(payload.description).trim()
              : null;

            const sortOrder =
              payload.sortOrder !== undefined && payload.sortOrder !== null
                ? Number(payload.sortOrder)
                : null;

            const isRequired =
              typeof payload.isRequired === "boolean"
                ? payload.isRequired
                : payload.isRequired === "true";

            if (!promptDefinitionId) {
              throw new Error("promptDefinitionId is required");
            }

            if (!key) {
              throw new Error("key is required");
            }

            if (!label) {
              throw new Error("label is required");
            }

            if (sortOrder !== null && Number.isNaN(sortOrder)) {
              throw new Error("sortOrder must be a valid number");
            }

            const promptDefinitionExists =
              await prisma.promptDefinition.findUnique({
                where: { id: promptDefinitionId },
              });

            if (!promptDefinitionExists) {
              throw new Error("PromptDefinition not found with this id");
            }

            const data = {
              key,
              label,
              description,
              sortOrder,
              isRequired,
              promptDefinition: {
                connect: { id: promptDefinitionId },
              },
            };

            const updated = await prisma.promptSegmentDefinition.update({
              where: { id: recordId },
              data,
            });

            const updatedRecord = resource.build(updated);

            return {
              record: updatedRecord.toJSON(currentAdmin),
              redirectUrl: h.recordActionUrl({
                resourceId: resource.id(),
                recordId,
                actionName: "show",
              }),
              notice: {
                message: "بخش پرامپت با موفقیت ویرایش شد",
                type: "success",
              },
            };
          },
        },
      },
    }),
    prismaResource("PromptVersion", {
      navigation: {
        name: "پرامپت‌ها",
        icon: "GitCommit",
      },

      titleProperty: "versionKey",

      properties: {
        id: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },

        promptDefinitionId: {
          reference: "PromptDefinition",
          isVisible: {
            list: true,
            filter: false,
            show: true,
            edit: true,
          },
        },

        promptDefinition: {
          reference: "PromptDefinition",
          isVisible: {
            list: false,
            filter: true,
            show: false,
            edit: false,
          },
        },

        versionNumber: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },

        versionKey: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },

        status: {
          isVisible: { list: true, filter: true, show: true, edit: true },
          availableValues: [
            { value: "DRAFT", label: "Draft" },
            { value: "PUBLISHED", label: "Published" },
            { value: "ARCHIVED", label: "Archived" },
          ],
        },

        publishedAt: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },

        createdAt: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },

        updatedAt: {
          isVisible: { list: false, filter: true, show: true, edit: false },
        },
        promptDefinitionTitle: {
          type: "string",
          isVirtual: true,
          label: "پرامپت",
          isVisible: {
            list: true,
            show: true,
            edit: false,
            filter: false,
          },
        },
      },

      listProperties: [
        "id",
        "promptDefinitionTitle",
        "versionNumber",
        "versionKey",
        "status",
        "publishedAt",
        "createdAt",
      ],

      editProperties: [
        "promptDefinitionId",
        "versionNumber",
        "versionKey",
        "status",
        "publishedAt",
      ],

      showProperties: [
        "id",
        "promptDefinitionTitle",
        "versionNumber",
        "versionKey",
        "status",
        "publishedAt",
        "createdAt",
        "updatedAt",
      ],

      filterProperties: [
        "id",
        "promptDefinition",
        "versionNumber",
        "versionKey",
        "status",
        "publishedAt",
        "createdAt",
        "updatedAt",
      ],

      actions: {
        list: {
          after: async (response) => {
            if (!response.records?.length) {
              return response;
            }

            const promptDefinitionIds = [
              ...new Set(
                response.records
                  .map((record) => record.params.promptDefinition)
                  .filter(Boolean),
              ),
            ];

            const promptDefinitions = await prisma.promptDefinition.findMany({
              where: {
                id: {
                  in: promptDefinitionIds,
                },
              },
              select: {
                id: true,
                title: true,
              },
            });

            const promptMap = Object.fromEntries(
              promptDefinitions.map((item) => [item.id, item.title]),
            );

            response.records.forEach((record) => {
              record.params.promptDefinitionTitle =
                promptMap[record.params.promptDefinition] || "—";
            });

            return response;
          },
        },

        show: {
          after: async (response) => {
            if (!response.record) {
              return response;
            }

            const promptDefinition = await prisma.promptDefinition.findUnique({
              where: {
                id: response.record.params.promptDefinition,
              },
              select: {
                title: true,
              },
            });

            response.record.params.promptDefinitionTitle =
              promptDefinition?.title || "—";

            return response;
          },
        },
        new: {
          handler: async (request, response, context) => {
            const { resource, h, currentAdmin } = context;

            if (request.method !== "post") {
              return {
                record: resource.build({}).toJSON(currentAdmin),
              };
            }

            const payload = { ...(request.payload || {}) };

            delete payload.promptDefinition;

            const promptDefinitionId = payload.promptDefinitionId
              ? String(payload.promptDefinitionId).trim()
              : "";

            const versionNumber =
              payload.versionNumber !== undefined &&
              payload.versionNumber !== null
                ? Number(payload.versionNumber)
                : null;

            const versionKey = payload.versionKey
              ? String(payload.versionKey).trim()
              : "";

            const status = payload.status ? String(payload.status).trim() : "";

            let publishedAt =
              payload.publishedAt && String(payload.publishedAt).trim() !== ""
                ? new Date(payload.publishedAt)
                : null;

            if (!promptDefinitionId) {
              throw new Error("promptDefinitionId is required");
            }

            if (versionNumber === null || Number.isNaN(versionNumber)) {
              throw new Error(
                "versionNumber is required and must be a valid number",
              );
            }

            if (!versionKey) {
              throw new Error("versionKey is required");
            }

            if (!status) {
              throw new Error("status is required");
            }

            if (publishedAt && Number.isNaN(publishedAt.getTime())) {
              throw new Error("publishedAt is not a valid date");
            }

            const promptDefinitionExists =
              await prisma.promptDefinition.findUnique({
                where: { id: promptDefinitionId },
              });

            if (!promptDefinitionExists) {
              throw new Error(
                "PromptDefinition not found with this promptDefinitionId",
              );
            }

            // اگر وضعیت PUBLISHED است و publishedAt خالی است، الان را بگذار
            if (status === "PUBLISHED" && !publishedAt) {
              publishedAt = new Date();
            }

            const data = {
              versionNumber,
              versionKey,
              status,
              publishedAt,
              promptDefinition: {
                connect: {
                  id: promptDefinitionId,
                },
              },
            };

            const created = await prisma.promptVersion.create({ data });

            const record = resource.build(created);

            return {
              record: record.toJSON(currentAdmin),
              redirectUrl: h.recordActionUrl({
                resourceId: resource.id(),
                recordId: created.id,
                actionName: "show",
              }),
              notice: {
                message: "نسخه پرامپت با موفقیت ایجاد شد",
                type: "success",
              },
            };
          },
        },

        edit: {
          handler: async (request, response, context) => {
            const { record, resource, h, currentAdmin } = context;

            if (!record) {
              throw new Error("Record not found");
            }

            const recordId = record.params.id;

            if (request.method !== "post") {
              return {
                record: record.toJSON(currentAdmin),
              };
            }

            const payload = { ...(request.payload || {}) };

            delete payload.promptDefinition;

            const promptDefinitionId = payload.promptDefinitionId
              ? String(payload.promptDefinitionId).trim()
              : "";

            const versionNumber =
              payload.versionNumber !== undefined &&
              payload.versionNumber !== null
                ? Number(payload.versionNumber)
                : null;

            const versionKey = payload.versionKey
              ? String(payload.versionKey).trim()
              : "";

            const status = payload.status ? String(payload.status).trim() : "";

            let publishedAt =
              payload.publishedAt && String(payload.publishedAt).trim() !== ""
                ? new Date(payload.publishedAt)
                : null;

            if (!promptDefinitionId) {
              throw new Error("promptDefinitionId is required");
            }

            if (versionNumber === null || Number.isNaN(versionNumber)) {
              throw new Error(
                "versionNumber is required and must be a valid number",
              );
            }

            if (!versionKey) {
              throw new Error("versionKey is required");
            }

            if (!status) {
              throw new Error("status is required");
            }

            if (publishedAt && Number.isNaN(publishedAt.getTime())) {
              throw new Error("publishedAt is not a valid date");
            }

            const promptDefinitionExists =
              await prisma.promptDefinition.findUnique({
                where: { id: promptDefinitionId },
              });

            if (!promptDefinitionExists) {
              throw new Error(
                "PromptDefinition not found with this promptDefinitionId",
              );
            }

            if (status === "PUBLISHED" && !publishedAt) {
              publishedAt = new Date();
            }

            const data = {
              versionNumber,
              versionKey,
              status,
              publishedAt,
              promptDefinition: {
                connect: {
                  id: promptDefinitionId,
                },
              },
            };

            const updated = await prisma.promptVersion.update({
              where: { id: recordId },
              data,
            });

            const updatedRecord = resource.build(updated);

            return {
              record: updatedRecord.toJSON(currentAdmin),
              redirectUrl: h.recordActionUrl({
                resourceId: resource.id(),
                recordId,
                actionName: "show",
              }),
              notice: {
                message: "نسخه پرامپت با موفقیت ویرایش شد",
                type: "success",
              },
            };
          },
        },
      },
    }),
    prismaResource("PromptVersionSegmentValue", {
      navigation: {
        name: "پرامپت‌ها",
        icon: "FileText",
      },

      properties: {
        id: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },

        promptVersionId: {
          reference: "PromptVersion",
          isVisible: {
            list: true,
            filter: false,
            show: true,
            edit: true,
          },
        },

        promptVersion: {
          reference: "PromptVersion",
          isVisible: {
            list: false,
            filter: true,
            show: false,
            edit: false,
          },
        },

        segmentDefinitionId: {
          reference: "PromptSegmentDefinition",
          isVisible: {
            list: true,
            filter: false,
            show: true,
            edit: true,
          },
        },

        segmentDefinition: {
          reference: "PromptSegmentDefinition",
          isVisible: {
            list: false,
            filter: true,
            show: false,
            edit: false,
          },
        },

        content: {
          type: "textarea",
          isVisible: { list: false, filter: false, show: true, edit: true },
        },

        createdAt: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },

        updatedAt: {
          isVisible: { list: false, filter: true, show: true, edit: false },
        },
        promptVersionTitle: {
          type: "string",
          isVirtual: true,
          label: "نسخه پرامپت",
          isVisible: {
            list: true,
            show: true,
            edit: false,
            filter: false,
          },
        },

        segmentDefinitionTitle: {
          type: "string",
          isVirtual: true,
          label: "بخش پرامپت",
          isVisible: {
            list: true,
            show: true,
            edit: false,
            filter: false,
          },
        },
      },

      listProperties: [
        "id",
        "promptVersionTitle",
        "segmentDefinitionTitle",
        "createdAt",
      ],

      editProperties: ["promptVersionId", "segmentDefinitionId", "content"],

      showProperties: [
        "id",
        "promptVersionTitle",
        "segmentDefinitionTitle",
        "content",
        "createdAt",
        "updatedAt",
      ],

      filterProperties: [
        "id",
        "promptVersion",
        "segmentDefinition",
        "createdAt",
        "updatedAt",
      ],

      actions: {
        list: {
          after: async (response) => {
            if (!response.records?.length) {
              return response;
            }

            const promptVersionIds = [
              ...new Set(
                response.records
                  .map((record) => record.params.promptVersion)
                  .filter(Boolean),
              ),
            ];

            const segmentDefinitionIds = [
              ...new Set(
                response.records
                  .map((record) => record.params.segmentDefinition)
                  .filter(Boolean),
              ),
            ];

            const [promptVersions, segmentDefinitions] = await Promise.all([
              prisma.promptVersion.findMany({
                where: {
                  id: {
                    in: promptVersionIds,
                  },
                },
                select: {
                  id: true,
                  versionKey: true,
                },
              }),

              prisma.promptSegmentDefinition.findMany({
                where: {
                  id: {
                    in: segmentDefinitionIds,
                  },
                },
                select: {
                  id: true,
                  label: true,
                },
              }),
            ]);

            const promptVersionMap = Object.fromEntries(
              promptVersions.map((item) => [item.id, item.versionKey]),
            );

            const segmentDefinitionMap = Object.fromEntries(
              segmentDefinitions.map((item) => [item.id, item.label]),
            );

            response.records.forEach((record) => {
              record.params.promptVersionTitle =
                promptVersionMap[record.params.promptVersion] || "—";

              record.params.segmentDefinitionTitle =
                segmentDefinitionMap[record.params.segmentDefinition] || "—";
            });

            return response;
          },
        },

        show: {
          after: async (response) => {
            if (!response.record) {
              return response;
            }

            const [promptVersion, segmentDefinition] = await Promise.all([
              prisma.promptVersion.findUnique({
                where: {
                  id: response.record.params.promptVersion,
                },
                select: {
                  versionKey: true,
                },
              }),

              prisma.promptSegmentDefinition.findUnique({
                where: {
                  id: response.record.params.segmentDefinition,
                },
                select: {
                  label: true,
                },
              }),
            ]);

            response.record.params.promptVersionTitle =
              promptVersion?.versionKey || "—";

            response.record.params.segmentDefinitionTitle =
              segmentDefinition?.label || "—";

            return response;
          },
        },
        new: {
          handler: async (request, response, context) => {
            const { resource, h, currentAdmin } = context;

            if (request.method !== "post") {
              return {
                record: resource.build({}).toJSON(currentAdmin),
              };
            }

            const payload = { ...(request.payload || {}) };

            delete payload.promptVersion;
            delete payload.segmentDefinition;

            const promptVersionId = payload.promptVersionId
              ? String(payload.promptVersionId).trim()
              : "";

            const segmentDefinitionId = payload.segmentDefinitionId
              ? String(payload.segmentDefinitionId).trim()
              : "";

            const content = payload.content
              ? String(payload.content).trim()
              : "";

            if (!promptVersionId) {
              throw new Error("promptVersionId is required");
            }

            if (!segmentDefinitionId) {
              throw new Error("segmentDefinitionId is required");
            }

            if (!content) {
              throw new Error("content is required");
            }

            const promptVersion = await prisma.promptVersion.findUnique({
              where: { id: promptVersionId },
              include: { promptDefinition: true },
            });

            if (!promptVersion) {
              throw new Error(
                "PromptVersion not found with this promptVersionId",
              );
            }

            const segmentDefinition =
              await prisma.promptSegmentDefinition.findUnique({
                where: { id: segmentDefinitionId },
              });

            if (!segmentDefinition) {
              throw new Error(
                "PromptSegmentDefinition not found with this segmentDefinitionId",
              );
            }

            if (
              segmentDefinition.promptDefinitionId !==
              promptVersion.promptDefinitionId
            ) {
              throw new Error(
                "This segmentDefinition does not belong to the selected PromptVersion's PromptDefinition",
              );
            }

            const duplicate = await prisma.promptVersionSegmentValue.findUnique(
              {
                where: {
                  promptVersionId_segmentDefinitionId: {
                    promptVersionId,
                    segmentDefinitionId,
                  },
                },
              },
            );

            if (duplicate) {
              throw new Error(
                "A value already exists for this promptVersionId and segmentDefinitionId",
              );
            }

            const created = await prisma.promptVersionSegmentValue.create({
              data: {
                content,
                promptVersion: { connect: { id: promptVersionId } },
                segmentDefinition: { connect: { id: segmentDefinitionId } },
              },
            });

            const record = resource.build(created);

            return {
              record: record.toJSON(currentAdmin),
              redirectUrl: h.recordActionUrl({
                resourceId: resource.id(),
                recordId: created.id,
                actionName: "show",
              }),
              notice: {
                message: "مقدار بخش نسخه پرامپت با موفقیت ایجاد شد",
                type: "success",
              },
            };
          },
        },

        edit: {
          handler: async (request, response, context) => {
            const { record, resource, h, currentAdmin } = context;

            if (!record) {
              throw new Error("Record not found");
            }

            const recordId = record.params.id;

            if (request.method !== "post") {
              return {
                record: record.toJSON(currentAdmin),
              };
            }

            const payload = { ...(request.payload || {}) };

            delete payload.promptVersion;
            delete payload.segmentDefinition;

            const promptVersionId = payload.promptVersionId
              ? String(payload.promptVersionId).trim()
              : "";

            const segmentDefinitionId = payload.segmentDefinitionId
              ? String(payload.segmentDefinitionId).trim()
              : "";

            const content = payload.content
              ? String(payload.content).trim()
              : "";

            if (!promptVersionId) {
              throw new Error("promptVersionId is required");
            }

            if (!segmentDefinitionId) {
              throw new Error("segmentDefinitionId is required");
            }

            if (!content) {
              throw new Error("content is required");
            }

            const promptVersion = await prisma.promptVersion.findUnique({
              where: { id: promptVersionId },
            });

            if (!promptVersion) {
              throw new Error(
                "PromptVersion not found with this promptVersionId",
              );
            }

            const segmentDefinition =
              await prisma.promptSegmentDefinition.findUnique({
                where: { id: segmentDefinitionId },
              });

            if (!segmentDefinition) {
              throw new Error(
                "PromptSegmentDefinition not found with this segmentDefinitionId",
              );
            }

            if (
              segmentDefinition.promptDefinitionId !==
              promptVersion.promptDefinitionId
            ) {
              throw new Error(
                "This segmentDefinition does not belong to the selected PromptVersion's PromptDefinition",
              );
            }

            const duplicate = await prisma.promptVersionSegmentValue.findUnique(
              {
                where: {
                  promptVersionId_segmentDefinitionId: {
                    promptVersionId,
                    segmentDefinitionId,
                  },
                },
              },
            );

            if (duplicate && duplicate.id !== recordId) {
              throw new Error(
                "A value already exists for this promptVersionId and segmentDefinitionId",
              );
            }

            const updated = await prisma.promptVersionSegmentValue.update({
              where: { id: recordId },
              data: {
                content,
                promptVersion: { connect: { id: promptVersionId } },
                segmentDefinition: { connect: { id: segmentDefinitionId } },
              },
            });

            const updatedRecord = resource.build(updated);

            return {
              record: updatedRecord.toJSON(currentAdmin),
              redirectUrl: h.recordActionUrl({
                resourceId: resource.id(),
                recordId,
                actionName: "show",
              }),
              notice: {
                message: "مقدار بخش نسخه پرامپت با موفقیت ویرایش شد",
                type: "success",
              },
            };
          },
        },
      },
    }),
    prismaResource("AnalysisFormProfileField", {
      navigation: {
        name: "تنظیمات تحلیل",
        icon: "Settings",
      },

      properties: {
        id: {
          isTitle: true,
        },

        form: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: true,
          },
        },

        profileFieldKey: {
          availableValues: COMPANY_PROFILE_FIELD_OPTIONS,
        },

        isArray: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: true,
          },
        },

        createdAt: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: false,
          },
        },
      },

      listProperties: ["id", "form", "profileFieldKey", "isArray", "createdAt"],

      filterProperties: ["form", "profileFieldKey", "isArray", "createdAt"],

      showProperties: ["id", "form", "profileFieldKey", "isArray", "createdAt"],

      editProperties: ["form", "profileFieldKey", "isArray"],

      actions: {
        new: {
          before: async (request) => {
            validateAdminProfileFieldPayload(request);
            return request;
          },
        },

        edit: {
          before: async (request) => {
            validateAdminProfileFieldPayload(request);
            return request;
          },
        },
      },
    }),
    prismaResource("MultiAnalysisFormProfileField", {
      navigation: {
        name: "تنظیمات تحلیل",
        icon: "Settings",
      },

      properties: {
        id: {
          isTitle: true,
        },

        multiAnalysisForm: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: true,
          },
        },

        profileFieldKey: {
          availableValues: COMPANY_PROFILE_FIELD_OPTIONS,
        },

        isArray: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: true,
          },
        },

        createdAt: {
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: false,
          },
        },
      },

      listProperties: [
        "id",
        "multiAnalysisForm",
        "profileFieldKey",
        "isArray",
        "createdAt",
      ],

      filterProperties: [
        "multiAnalysisForm",
        "profileFieldKey",
        "isArray",
        "createdAt",
      ],

      showProperties: [
        "id",
        "multiAnalysisForm",
        "profileFieldKey",
        "isArray",
        "createdAt",
      ],

      editProperties: ["multiAnalysisForm", "profileFieldKey", "isArray"],
      actions: {
        new: {
          before: async (request) => {
            validateAdminProfileFieldPayload(request);
            return request;
          },
        },

        edit: {
          before: async (request) => {
            validateAdminProfileFieldPayload(request);
            return request;
          },
        },
      },
    }),
  ],
});

const authenticate = async (emailOrUsername, password) => {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
      role: "SUPER_ADMIN",
    },
  });

  if (!user) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.password);

  if (!isValid) {
    return null;
  }

  return {
    id: user.id,
    email: user.email || user.username,
    title: user.username,
    role: user.role,
  };
};

const start = async () => {
  await admin.initialize();
  await admin.watch();
  const router = AdminJSExpress.buildAuthenticatedRouter(
    admin,
    {
      authenticate,
      cookieName: "strategy_proposal_admin",
      cookiePassword: ADMIN_COOKIE_SECRET,
    },
    null,
    {
      secret: ADMIN_SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 8,
      },
    },
    {
      uploadDir: ADMIN_UPLOAD_TMP,
    },
  );

  app.use(
    session({
      secret: ADMIN_SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
    }),
  );

  app.use(admin.options.rootPath, router);

  app.get("/", (req, res) => {
    res.redirect(admin.options.rootPath);
  });

  app.listen(PORT, () => {
    console.log(
      `AdminJS is running on http://localhost:${PORT}${ADMIN_ROOT_PATH}`,
    );
  });
};

start().catch(async (error) => {
  console.error("AdminJS startup error:", error);
  await prisma.$disconnect();
  process.exit(1);
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
