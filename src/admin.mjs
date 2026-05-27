import "dotenv/config";

import express from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { ValidationError } from "adminjs";
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
} from "./component-loader.mjs";

AdminJS.registerAdapter({
  Database,
  Resource,
});

const prisma = new PrismaClient();

const app = express();

const PORT = Number(process.env.ADMIN_PORT || 4000);
const ADMIN_ROOT_PATH = process.env.ADMIN_ROOT_PATH || "/admin";

const ADMIN_COOKIE_SECRET =
  process.env.ADMIN_COOKIE_SECRET || "unsafe-admin-cookie-secret";

const ADMIN_SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET || "unsafe-admin-session-secret";

/**
 * Helper برای ساخت resource های Prisma
 */
const prismaResource = (modelName, options = {}) => {
  const resourceOptions = {
    resource: {
      model: getModelByName(modelName),
      client: prisma,
    },
    options: {
      ...options, // Merging provided options
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
            return request;
          },
        },
        edit: {
          isAccessible: true,
          before: async (request) => {
            if (request.payload?.password && modelName === "User") {
              // Only hash if password is provided, otherwise leave it
              if (request.payload.password) {
                request.payload.password = await bcrypt.hash(
                  request.payload.password,
                  10,
                );
              } else {
                // If password is empty, remove it from payload to avoid setting it to empty
                delete request.payload.password;
              }
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
      },
    },
  };

  // Override actions if they are explicitly provided in options
  if (options.actions) {
    resourceOptions.options.actions = {
      ...resourceOptions.options.actions,
      ...options.actions,
    };
  }

  return resourceOptions;
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
        name: "مدیریت کاربران",
        icon: "Building",
      },
      properties: {
        profile: {
          type: "textarea",
        },
        progress: { type: "mixed" },
        createdAt: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },
        updatedAt: {
          isVisible: { list: false, filter: true, show: true, edit: false },
        },
      },
      listProperties: [
        "id",
        "name",
        "industry",
        "userLimit",
        "profileCompleted",
        "createdAt",
      ],
      editProperties: [
        "name",
        "industry",
        "profile",
        "progress",
        "userLimit",
        "profileCompleted",
      ],
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

        avatar: {
          isVisible: {
            list: false,
            filter: false,
            show: true,
            edit: true,
          },
        },

        username: {
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
            list: true,
            filter: true,
            show: true,
            edit: true,
          },
        },

        profile: {
          type: "textarea",
          isVisible: {
            list: false,
            filter: false,
            show: true,
            edit: true,
          },
        },

        progress: {
          type: "mixed",
          isVisible: {
            list: false,
            filter: false,
            show: true,
            edit: true,
          },
        },

        profileCompleted: {
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

        company: {
          isVisible: false,
        },
      },

      listProperties: [
        "id",
        "username",
        "email",
        "phoneNumber",
        "role",
        "companyId",
        "profileCompleted",
        "createdAt",
      ],

      filterProperties: [
        "username",
        "email",
        "phoneNumber",
        "role",
        "companyId",
        "profileCompleted",
        "createdAt",
      ],

      showProperties: [
        "id",
        "avatar",
        "username",
        "email",
        "phoneNumber",
        "role",
        "companyId",
        "profile",
        "progress",
        "profileCompleted",
        "createdAt",
        "updatedAt",
      ],

      editProperties: [
        "avatar",
        "username",
        "password",
        "email",
        "phoneNumber",
        "role",
        "companyId",
        "profile",
        "progress",
        "profileCompleted",
      ],

      actions: {
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

            const avatar = payload.avatar;
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
                avatar: avatar ? String(avatar).trim() : null,
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

            const avatar = payload.avatar;
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
                avatar: avatar ? String(avatar).trim() : null,
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

        companyId: {
          reference: "Company",
          isRequired: true,
          position: 1,
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: true,
          },
          description: "شناسه شرکت را به‌صورت دستی وارد کنید",
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

        company: {
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
      },

      listProperties: ["id", "companyId", "createdAt"],
      editProperties: ["companyId", "dataText"],
      showProperties: ["id", "companyId", "dataText", "createdAt", "updatedAt"],

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
            if (response.record?.params) {
              const rawData = response.record.params.data;

              response.record.params.dataText =
                rawData?.text || response.record.params["data.text"] || "";
            }

            return response;
          },
        },

        list: {
          after: async (response) => {
            if (response.records) {
              response.records = response.records.map((record) => {
                const rawData = record.params.data;

                record.params.dataText =
                  rawData?.text || record.params["data.text"] || "";

                return record;
              });
            }

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
        formResponses: { type: "mixed" },
        initialAnalysis: { type: "textarea" },
        riskAnalysis: { type: "textarea" },
        finalAnalysis: { type: "textarea" },
        createdAt: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },
        updatedAt: {
          isVisible: { list: false, filter: true, show: true, edit: false },
        },
        creatorId: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },
        companyId: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },
        formId: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },
        multiAnalysisFormId: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },
        promptVersionId: {
          isVisible: { list: true, filter: true, show: true, edit: true },
        },
      },
      listProperties: [
        "id",
        "title",
        "creatorId",
        "companyId",
        "mode",
        "status",
        "averageRating",
        "ratingCount",
        "hasRating",
        "createdAt",
      ],
      filterProperties: [
        "title",
        "creatorId",
        "companyId",
        "mode",
        "status",
        "formId",
        "multiAnalysisFormId",
        "promptVersionId",
        "createdAt",
      ],
      showProperties: [
        "id",
        "title",
        "creatorId",
        "companyId",
        "mode",
        "status",
        "formResponses",
        "formId",
        "multiAnalysisFormId",
        "promptVersionId",
        "createdAt",
        "updatedAt",
        "initialAnalysis",
        "riskAnalysis",
        "finalAnalysis",
        "averageRating",
        "ratingCount",
        "hasRating",
        "chatModeStartedAt",
        "chatModeEndedAt",
      ],
      editProperties: [
        "title",
        "creatorId",
        "companyId",
        "mode",
        "status",
        "formResponses",
        "formId",
        "multiAnalysisFormId",
        "promptVersionId",
        "initialAnalysis",
        "riskAnalysis",
        "finalAnalysis",
        "averageRating",
        "ratingCount",
        "hasRating",
        "chatModeStartedAt",
        "chatModeEndedAt",
      ],
    }),

    prismaResource("ProjectRatingHistory", {
      navigation: {
        name: "پروژه‌ها",
        icon: "Star",
      },
      properties: {
        id: { isVisible: false },
        projectId: {
          label: "انتخاب پروژه",
          isRequired: true,
          isVisible: { list: true, filter: true, show: true, edit: true },
        },
        raterId: {
          isVisible: { list: false, filter: false, show: true, edit: false },
        },
        score: {
          label: "امتیاز (۱ تا ۵)",
          isRequired: true,
          isVisible: { list: true, filter: true, show: true, edit: true },
        },
        comment: {
          label: "توضیحات ادمین",
          type: "textarea",
          isVisible: { list: true, filter: false, show: true, edit: true },
        },
      },

      listProperties: ["projectId", "score", "comment", "createdAt"],
      editProperties: ["projectId", "score", "comment"],

      actions: {
        new: {
          handler: async (request, response, context) => {
            const { resource, h, currentAdmin, _admin } = context;
            const prisma = _admin.options.databases[0].connector.prismaClient;

            if (request.method === "get") {
              return {
                resource: resource.decorate().toJSON(currentAdmin),
                record: null,
              };
            }

            const payload = request.payload ?? {};
            const { projectId, score, comment } = payload;
            const numericScore = parseInt(score);

            // اعتبارسنجی دستی رییس
            const errors = {};
            if (!projectId)
              errors.projectId = { message: "انتخاب پروژه الزامی است." };
            if (!score || numericScore < 1 || numericScore > 5) {
              errors.score = { message: "امتیاز باید عددی بین ۱ تا ۵ باشد." };
            }

            if (Object.keys(errors).length > 0)
              throw new ValidationError(errors);

            try {
              // استفاده از تراکنش برای تضمین ثبت امتیاز و آپدیت پروژه
              const createdHistory = await prisma.$transaction(async (tx) => {
                // ۱. ثبت در تاریخچه (با استفاده از raterId ادمین فعلی)
                const history = await tx.projectRatingHistory.upsert({
                  where: {
                    projectId_raterId: {
                      projectId: String(projectId),
                      raterId: currentAdmin.id,
                    },
                  },
                  update: { score: numericScore, comment: comment || null },
                  create: {
                    projectId: String(projectId),
                    raterId: currentAdmin.id,
                    score: numericScore,
                    comment: comment || null,
                  },
                });

                // ۲. محاسبه آمار جدید پروژه
                const stats = await tx.projectRatingHistory.aggregate({
                  where: { projectId: String(projectId) },
                  _avg: { score: true },
                  _count: { score: true },
                });

                // ۳. آپدیت مدل پروژه
                await tx.project.update({
                  where: { id: String(projectId) },
                  data: {
                    averageRating: stats._avg.score || 0,
                    ratingCount: stats._count.score || 0,
                    hasRating: true,
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
            const { record, resource, h, currentAdmin, _admin } = context;
            const prisma = _admin.options.databases[0].connector.prismaClient;

            if (!record) throw new Error("رکورد پیدا نشد.");

            if (request.method === "get") {
              return {
                record: record.toJSON(currentAdmin),
                resource: resource.decorate().toJSON(currentAdmin),
              };
            }

            const payload = request.payload ?? {};
            const numericScore = parseInt(payload.score);

            try {
              await prisma.$transaction(async (tx) => {
                // ۱. آپدیت رکورد فعلی
                await tx.projectRatingHistory.update({
                  where: { id: record.id() },
                  data: {
                    score: numericScore,
                    comment: payload.comment || null,
                  },
                });

                // ۲. محاسبه مجدد آمار پروژه مربوطه
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
    prismaResource("AnalysisForm", {
      navigation: {
        name: "فرم‌های تحلیل",
        icon: "FileText",
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

      listProperties: ["id", "title", "isActive", "order", "createdAt"],

      filterProperties: ["title", "isActive", "order", "createdAt"],

      showProperties: [
        "id",
        "title",
        "info",
        "order",
        "isActive",
        "createdAt",
        "updatedAt",
      ],

      editProperties: ["title", "info", "order", "isActive"],
    }),

    prismaResource("FormQuestion", {
      navigation: {
        name: "فرم‌های تحلیل",
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
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: true,
          },
          position: 1,
        },

        label: {
          isRequired: true,
          position: 2,
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: true,
          },
        },

        type: {
          isRequired: true,
          position: 3,
          availableValues: questionTypeValues,
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: true,
          },
        },

        optionsText: {
          type: "textarea",
          position: 4,
          isVisible: {
            list: false,
            filter: false,
            show: true,
            edit: true,
          },
          props: {
            rows: 10,
            placeholder: `برای سوالات انتخابی JSON وارد کنید. مثال:
[
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
          description:
            "برای سوالات select، radio، checkbox و multiSelect مقدار JSON معتبر وارد کنید. برای سوالات متنی می‌توانید خالی بگذارید.",
        },

        options: {
          type: "mixed",
          isVisible: {
            list: false,
            filter: false,
            show: false,
            edit: false,
          },
        },

        required: {
          position: 5,
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: true,
          },
        },

        order: {
          position: 6,
          isRequired: true,
          isVisible: {
            list: true,
            filter: true,
            show: true,
            edit: true,
          },
        },

        form: {
          isVisible: false,
        },

        answers: {
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
      },

      listProperties: [
        "id",
        "formId",
        "label",
        "type",
        "required",
        "order",
        "createdAt",
      ],

      filterProperties: ["formId", "label", "type", "required", "order"],

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

      editProperties: [
        "formId",
        "label",
        "type",
        "optionsText",
        "required",
        "order",
      ],

      actions: {
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
            const label = payload.label;
            const type = payload.type;
            const optionsText = payload.optionsText;
            const required = parseBooleanValue(payload.required);
            const order = parseIntegerValue(payload.order);

            const errors = {};

            if (!formId) {
              errors.formId = { message: "فرم الزامی است." };
            }

            if (!label || !String(label).trim()) {
              errors.label = { message: "عنوان سوال الزامی است." };
            }

            if (!type || !String(type).trim()) {
              errors.type = { message: "نوع سوال الزامی است." };
            }

            if (order === null) {
              errors.order = { message: "ترتیب باید یک عدد صحیح باشد." };
            }

            if (Object.keys(errors).length > 0) {
              throw new ValidationError(errors);
            }

            const parsedOptions = parseOptionsText(optionsText);

            validateQuestionOptions({
              type: String(type),
              options: parsedOptions,
            });

            try {
              const created = await prisma.formQuestion.create({
                data: {
                  label: String(label).trim(),
                  type: String(type),
                  options: parsedOptions,
                  required,
                  order: order,
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
                  message:
                    "فرم انتخاب‌شده معتبر نیست یا ایجاد ارتباط با فرم ممکن نشد.",
                },
              });
            }
          },

          after: fillOptionsTextAfterLoad,
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
            const label = payload.label;
            const type = payload.type;
            const optionsText = payload.optionsText;
            const required = parseBooleanValue(payload.required);
            const order = parseIntegerValue(payload.order);

            const errors = {};

            if (!formId) {
              errors.formId = { message: "فرم الزامی است." };
            }

            if (!label || !String(label).trim()) {
              errors.label = { message: "عنوان سوال الزامی است." };
            }

            if (!type || !String(type).trim()) {
              errors.type = { message: "نوع سوال الزامی است." };
            }

            if (order === null) {
              errors.order = { message: "ترتیب باید یک عدد صحیح باشد." };
            }

            if (Object.keys(errors).length > 0) {
              throw new ValidationError(errors);
            }

            const parsedOptions = parseOptionsText(optionsText);

            validateQuestionOptions({
              type: String(type),
              options: parsedOptions,
            });

            try {
              const updated = await prisma.formQuestion.update({
                where: {
                  id: String(record.param("id")),
                },
                data: {
                  label: String(label).trim(),
                  type: String(type),
                  options: parsedOptions,
                  required,
                  order: order,
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
                  message: "سوال با موفقیت ویرایش شد.",
                  type: "success",
                },
                redirectUrl: h.recordActionUrl({
                  resourceId: resource.id(),
                  recordId: updated.id,
                  actionName: "show",
                }),
              };
            } catch (error) {
              console.error("FORM_QUESTION_UPDATE_ERROR:", error);

              if (error instanceof ValidationError) {
                throw error;
              }

              throw new ValidationError({
                formId: {
                  message:
                    "فرم انتخاب‌شده معتبر نیست یا به‌روزرسانی ارتباط با فرم ممکن نشد.",
                },
              });
            }
          },

          after: fillOptionsTextAfterLoad,
        },

        show: {
          after: fillOptionsTextAfterLoad,
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
            list: true,
            filter: true,
            show: true,
            edit: true,
          },
          position: 1,
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

        form: {
          isVisible: false,
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
      },

      listProperties: ["id", "formId", "title", "createdAt"],
      filterProperties: ["id", "formId", "title", "createdAt"],
      showProperties: ["id", "formId", "title", "createdAt", "updatedAt"],
      editProperties: ["formId", "title"],

      actions: {
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

        multiAnalysisForm: {
          isVisible: false,
        },
      },

      listProperties: ["id", "multiAnalysisFormId", "title", "createdAt"],

      filterProperties: ["id", "multiAnalysisFormId", "title", "createdAt"],

      showProperties: [
        "id",
        "multiAnalysisFormId",
        "title",
        "createdAt",
        "updatedAt",
      ],

      editProperties: ["multiAnalysisFormId", "title"],

      actions: {
        new: {
          handler: async (request, response, context) => {
            const { resource, h, currentAdmin } = context;

            /**
             * GET /new
             * نمایش فرم ایجاد رکورد
             */
            if (request.method === "get") {
              return {
                resource: resource.decorate().toJSON(currentAdmin),
                record: null,
              };
            }

            /**
             * POST /new
             * ایجاد مستقیم با Prisma
             */
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

            /**
             * GET /edit
             * نمایش فرم ویرایش
             */
            if (request.method === "get") {
              return {
                record: record.toJSON(currentAdmin),
                resource: resource.decorate().toJSON(currentAdmin),
              };
            }

            /**
             * POST /edit
             * ویرایش مستقیم با Prisma
             */
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
          isVisible: { list: false, filter: false, show: false, edit: false },
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
        "formId",
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
          handler: async (request, response, context) => {
            const { record, resource, h, currentAdmin } = context;

            if (!record) {
              throw new Error("Record not found");
            }

            if (request.method === "get") {
              return {
                record: buildOptionsTextFromRecord(record.toJSON(currentAdmin)),
                resource: resource.decorate().toJSON(currentAdmin),
              };
            }

            const recordId = String(record.param("id"));

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

            const updated = await prisma.followUpFormQuestion.update({
              where: {
                id: recordId,
              },
              data,
            });

            const refreshed = await resource.findOne(updated.id);
            const refreshedJson = refreshed?.toJSON(currentAdmin);

            return {
              record: refreshedJson
                ? buildOptionsTextFromRecord(refreshedJson)
                : null,
              notice: {
                message: "سوال فرم پیگیری با موفقیت ویرایش شد.",
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

    prismaResource("Notification", {
      navigation: {
        name: "اعلان‌ها",
        icon: "Bell",
      },
      properties: {
        userId: {
          isVisible: { list: true, filter: true, show: true, edit: true },
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
      },
      listProperties: [
        "id",
        "userId",
        "type",
        "title",
        "isRead",
        "referenceId",
        "createdAt",
      ],
      editProperties: [
        "userId",
        "type",
        "title",
        "message",
        "isRead",
        "referenceId",
        "referenceType",
      ],
    }),

    prismaResource("RefreshToken", {
      navigation: {
        name: "امنیت",
        icon: "Key",
      },
      properties: {
        tokenHash: {
          isVisible: { list: false, filter: false, show: true, edit: false },
        }, // Token hash should not be editable
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
          isVisible: { list: false, filter: false, show: false, edit: false },
        },

        multiAnalysisFormId: {
          reference: "MultiAnalysisForm",
          isVisible: { list: true, filter: true, show: true, edit: true },
          position: 4,
        },

        multiAnalysisForm: {
          isVisible: { list: false, filter: false, show: false, edit: false },
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
        "ownerType",
        "analysisFormId",
        "multiAnalysisFormId",
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
        "analysisFormId",
        "multiAnalysisFormId",
        "createdAt",
        "updatedAt",
      ],

      filterProperties: [
        "id",
        "title",
        "ownerType",
        "analysisFormId",
        "multiAnalysisFormId",
        "createdAt",
        "updatedAt",
      ],

      actions: {
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

      // برای نمایش در dropdownهای reference
      titleProperty: "label",

      properties: {
        id: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },

        // FK به PromptDefinition
        promptDefinitionId: {
          reference: "PromptDefinition",
          isRequired: true,
          isVisible: { list: true, filter: true, show: true, edit: true },
          position: 1,
        },

        // خود relation را از UI مخفی می‌کنیم
        promptDefinition: {
          isVisible: { list: false, filter: false, show: false, edit: false },
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
      },

      listProperties: [
        "id",
        "promptDefinitionId",
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
        "promptDefinitionId",
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
        "promptDefinitionId",
        "key",
        "label",
        "sortOrder",
        "isRequired",
        "createdAt",
        "updatedAt",
      ],

      actions: {
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

      // برای dropdownها (مثل PromptVersionSegmentValue.promptVersionId)
      // نسخه را با versionKey نمایش می‌دهیم
      titleProperty: "versionKey",

      properties: {
        id: {
          isVisible: { list: true, filter: true, show: true, edit: false },
        },

        promptDefinitionId: {
          reference: "PromptDefinition",
          isVisible: { list: true, filter: true, show: true, edit: true },
        },

        promptDefinition: {
          isVisible: { list: false, filter: false, show: false, edit: false },
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
      },

      listProperties: [
        "id",
        "promptDefinitionId",
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
        "promptDefinitionId",
        "versionNumber",
        "versionKey",
        "status",
        "publishedAt",
        "createdAt",
        "updatedAt",
      ],

      filterProperties: [
        "id",
        "promptDefinitionId",
        "versionNumber",
        "versionKey",
        "status",
        "publishedAt",
        "createdAt",
        "updatedAt",
      ],

      actions: {
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

            // اگر PUBLISHED شد و publishedAt خالی بود، الان را بگذار
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
          isVisible: { list: true, filter: true, show: true, edit: true },
        },

        promptVersion: {
          isVisible: { list: false, filter: false, show: false, edit: false },
        },

        segmentDefinitionId: {
          reference: "PromptSegmentDefinition",
          isVisible: { list: true, filter: true, show: true, edit: true },
        },

        segmentDefinition: {
          isVisible: { list: false, filter: false, show: false, edit: false },
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
      },

      listProperties: [
        "id",
        "promptVersionId",
        "segmentDefinitionId",
        "createdAt",
      ],

      editProperties: ["promptVersionId", "segmentDefinitionId", "content"],

      showProperties: [
        "id",
        "promptVersionId",
        "segmentDefinitionId",
        "content",
        "createdAt",
        "updatedAt",
      ],

      filterProperties: [
        "id",
        "promptVersionId",
        "segmentDefinitionId",
        "createdAt",
        "updatedAt",
      ],

      actions: {
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
  ],
});

const authenticate = async (emailOrUsername, password) => {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
      role: "SUPER_ADMIN", // Only Super Admins can log in to the admin panel
    },
  });

  if (!user) {
    return null; // User not found or not a super admin
  }

  // Compare password with the hashed password in the database
  const isValid = await bcrypt.compare(password, user.password);

  if (!isValid) {
    return null; // Invalid password
  }

  // Return user information for authentication
  return {
    id: user.id,
    email: user.email || user.username,
    title: user.username, // Display username in the admin panel header
    role: user.role,
  };
};

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
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
    },
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

const start = async () => {
  await admin.initialize();

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
