# راهنمای بک‌اند — اعلان‌ها (Notification)

این سند با `NotificationModal` و `resolveNotificationNavigation` در فرانت هم‌خوان است.

## API

- `GET /api/notification` — لیست اعلان‌های کاربر جاری
- `PATCH /api/notification/:id/read`
- `DELETE /api/notification/:id` — فقط اعلان‌های خوانده‌شده

هر آیتم: `id`, `type`, `title`, `message`, `referenceId`, `metadata` (JSON object), `isRead`, `createdAt`.

## Enum `NotificationType` — وضعیت در بک‌اند

| type | وضعیت | Hook |
|------|--------|------|
| `PROJECT_ACCESS_GRANTED` | **موجود** | `PUT /api/project/:id/access` — فقط granteeهای **جدید** |
| `PROJECT_COLLABORATOR_ACTIVITY` | **موجود** | همکار با `canVisualize`: افزودن/حذف مصور (`ILLUSTRATED_*`); گیرنده: `ProjectAccess.grantedByUserId` |
| `PROJECT_PLAN_ACCESS_GRANTED` | **موجود** | grant/update دسترسی plan |
| `STRATEGY_PLAN_ACCESS_GRANTED` | **موجود** | grant/update دسترسی strategy plan |
| `FORM_COLLABORATION_INVITE` | **موجود** | ایجاد delegation |
| `FORM_COLLABORATION_RESPONSE_SUBMITTED` | **موجود** | submit نهایی assignee؛ گیرنده: `FormCollaborationDelegation.senderId` |
| `FOLLOW_UP_ANSWERED` | **موجود** | follow-up (خارج از scope sharing) |
| `PROJECT_PLAN_COLLABORATOR_ACTIVITY` | **موجود** | همکار EDIT (یا `canAction` پروژه): create/update/delete action، progress؛ گیرنده: `ProjectPlanAccess.grantedByUserId` یا `ProjectAccess.grantedByUserId` |
| `STRATEGY_PLAN_COLLABORATOR_ACTIVITY` | **موجود** | همکار EDIT: validate/approve map، KPI/OKR، sync measures |

ساخت payload متمرکز: `src/services/notificationDispatchService.js` (`createNotification`, `build*Payload`).

## قرارداد typeها (خلاصه)

### پروژه تحلیل

- **PROJECT_ACCESS_GRANTED** — `referenceId` = `projectId`; `metadata`: `projectId`, `projectTitle`, `canView`, `canAction`, `canVisualize`, `grantedByUsername` (فیلد قدیمی `permission` حذف شده)
- **PROJECT_COLLABORATOR_ACTIVITY** — `referenceId` = `projectId`; `metadata`: `projectId`, `projectTitle`, `actorUsername`, `action` (`FORM_SUBMITTED` | `ASSUMPTIONS_CONFIRMED` | `ANALYSIS_STEP`), `projectStatus` اختیاری

کلیک فرانت: `/project/{projectId}` — فرانت باید `PROJECT_COLLABORATOR_ACTIVITY` را map کند (در حال حاضر فقط `PROJECT_ACCESS_GRANTED` قطعی است).

### برنامه پروژه

- **PROJECT_PLAN_ACCESS_GRANTED** — `referenceId` = `projectId`; `metadata.projectId` **الزامی**; `planId`, `permission`, `grantedByUsername`
- **PROJECT_PLAN_COLLABORATOR_ACTIVITY** — گیرنده: `grantedByUserId`؛ `referenceId` = `projectId`؛ `metadata.action`: `ACTION_CREATED` | `ACTION_UPDATED` | `ACTION_DELETED` | `PROGRESS_UPDATED`

کلیک: `/project-plans?projectId=...&projectTitle=...` — `GET /api/project/:projectId/plan` برای grantee با `ProjectPlanAccess` (plan موجود) نیز مجاز است.

### برنامه استراتژی

- **STRATEGY_PLAN_ACCESS_GRANTED** — `referenceId` = `planId`; `metadata`: `planId`, `projectTitle`, `framework`, `permission`, `isReadyForMonitoring`
- **STRATEGY_PLAN_COLLABORATOR_ACTIVITY** — گیرنده: `grantedByUserId`؛ `referenceId` = `planId`؛ `metadata.action`: `MAP_VALIDATED`, `MAP_APPROVED`, `KPI_*`, `TABLE_*`, `MEASURES_SYNCED`, …

### فرم

- **FORM_COLLABORATION_INVITE** — `referenceId` = `delegationId`; `metadata.delegationId`, `projectId`, `mode` (`FILL`|`READ_ONLY`)
- **FORM_COLLABORATION_RESPONSE_SUBMITTED** — `referenceId` = `projectId`; `metadata.projectId`, `assigneeUsername`

کلیک دعوت: `/form-delegations/{delegationId}` — همان `id` لیست inbox و `GET /api/inbox/form-delegations/:id` (assignee/sender، CLOSED → 200).

## قوانین گیرنده

- دسترسی پروژه → **همکار** (grantee)، نه مالک
- فعالیت دسترسی پروژه (مصور) → **`ProjectAccess.grantedByUserId`**
- فعالیت plan/action → **`ProjectPlanAccess.grantedByUserId`** یا در نبود ردیف plan، **`ProjectAccess.grantedByUserId`** (با `canAction`)
- فعالیت strategy plan → **`StrategyPlanAccess.grantedByUserId`**
- دعوت فرم → **assignee**
- submit نهایی فرم همکاری → **`delegation.senderId`** (دعوت‌کننده)

## تست

```bash
node --test tests/notifications/notificationPayloads.test.js
```

Integration دستی: سناریوهای §۶ سند PM (grant access → notification همکار؛ submit/analysis → notification مالک).

## هماهنگی فرانت

در `notificationNavigation.js` اضافه شود:

- `PROJECT_COLLABORATOR_ACTIVITY` → `/project/{projectId}` با `metadata.projectId ?? referenceId`
- `PROJECT_PLAN_COLLABORATOR_ACTIVITY` → همان مسیر plan access (`projectId` در metadata)
- `STRATEGY_PLAN_COLLABORATOR_ACTIVITY` → `planId` = `metadata.planId ?? referenceId` (KPI/monitoring مثل grant)

type ناشناخته → `/tracking` (از typeهای ad-hoc استفاده نکنید).

**Dedupe:** حداکثر یک اعلان فعالیت per granter + actor + reference + **`metadata.action`** در **۱۰ دقیقه** (plan/strategy/project access/form submit).
