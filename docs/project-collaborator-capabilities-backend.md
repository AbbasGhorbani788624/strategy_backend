# Project collaborator capabilities (backend)

Replaces `ProjectAccess.permission` (`VIEW` | `EDIT`) with **`canView`**, **`canAction`**, **`canVisualize`**.

## API prefix

All routes: **`/api/project/...`**, **`/api/companyuser/...`**, **`/api/inbox/...`**

## Data model (`ProjectAccess`)

| Field | Type |
|-------|------|
| `canView` | boolean |
| `canAction` | boolean |
| `canVisualize` | boolean |
| `grantedByUserId` | FK User (optional) |

Normalization on PUT: `(canAction \|\| canVisualize) → canView = true`.

Legacy PUT body `{ permission: "VIEW"\|"EDIT" }` still accepted; **EDIT maps to view-only** (no analysis pipeline).

## Response shape (`GET /api/project/:id`)

```json
{
  "isOwner": false,
  "permission": "VIEW",
  "access": {
    "canView": true,
    "canAction": false,
    "canVisualize": true,
    "canContinueAnalysis": false,
    "canMutateAnalysisPipeline": false,
    "canMutateProjectPlan": false,
    "canManageProjectAccess": false,
    "isOwner": false
  }
}
```

Owner: `access.canContinueAnalysis` true until `FINAL_ANALYSIS` / `ARCHIVED`.

## PUT `/api/project/:id/access`

```json
{
  "colleagues": [
    {
      "userId": "uuid",
      "canView": true,
      "canAction": true,
      "canVisualize": false
    }
  ]
}
```

## Gates (summary)

| Area | Rule |
|------|------|
| Read project | Owner, COMPANY tenant, or `canView` |
| Analysis mutate | **Owner only** |
| Illustrated POST/DELETE | Owner, COMPANY, or `canVisualize` |
| GET `/api/project/:projectId/plan` (MEMBER) | **`canAction`** on project |
| **Create** plan `POST /api/project/:projectId/plan` (MEMBER) | **`canAction`** (same company); needs `finalAnalysis` on project |
| Plan mutate | `ProjectPlanAccess` EDIT **or** project **`canAction`** (EDIT equivalent) |

## Notifications

`PROJECT_ACCESS_GRANTED` metadata: `canView`, `canAction`, `canVisualize` (no `permission`).

## Related docs

- `docs/project-access-matrix.md` — update for capabilities
- `docs/notifications-backend.md`
