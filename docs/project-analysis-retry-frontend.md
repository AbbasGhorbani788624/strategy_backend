# فرانت — تحلیل پروژه (FAILED، form schema، workflow)

## API جدید

### `POST /api/project/:projectId/analysis-retry`

- **کی:** مالک یا همکار با **`permission: EDIT`**
- **شرط:** `project.status === "FAILED"`
- **پاسخ:** `202` + `data`: `{ jobId, status, resumeStatus, previousStatus, deduplicated? }`
- **خطا:** `400` اگر status ≠ FAILED؛ `403` برای VIEW

بعد از موفقیت: polling مثل قبل با `GET /api/project/:id/analysis-status`.

### `GET /api/project/:projectId/form-schema`

- **کی:** هر کس با **VIEW+** روی پروژه (مالک / collaborator)
- **پاسخ:** `{ projectId, analysisFormId, form: { categories, ... }, projectStatus, ... }`
- **جایگزین:** `GET /api/analysis/:formId` وقتی فقط `projectId` در دسترس است — **هرگز `projectId` را به `/analysis/` ندهید.**

## branch روی `status` (newanalysis / project detail)

| status | UI |
|--------|-----|
| `WAITING_FOR_FORM` | فرم: `GET /project/:id/form-schema` یا `form` از `GET /project`؛ submit: `POST /api/analysis/` |
| `ANALYSIS_PENDING` / `AI_PROCESSING` / `REVIEWING` | polling + conversation فقط طبق flow فعلی |
| **`FAILED`** | صفحه خطا + دکمه **«تلاش مجدد»** → `POST .../analysis-retry`؛ **نه** `POST /api/analysis/:projectId` |
| `FINAL_ANALYSIS` | نمایش نتیجه |

## پیام‌های 403 workflow (به‌روز)

- `WAITING_FOR_FORM` + conversation: «ابتدا فرم را ثبت کنید…»
- `FAILED` + conversation: «…از «تلاش مجدد تحلیل» استفاده کنید.»

## `resolveFormId`

```text
project.formId || project.multiAnalysisFormId || project.form?.id || analysisFormId از form-schema
```

هرگز `project.id`.
