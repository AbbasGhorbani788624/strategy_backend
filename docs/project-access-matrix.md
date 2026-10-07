# Project access & workflow matrix

See **`docs/project-collaborator-capabilities-backend.md`** for the current model (`canView` / `canAction` / `canVisualize`).

| Action | Route | Owner | canView | canAction | canVisualize |
|--------|-------|-------|---------|-----------|--------------|
| Read project | GET `/api/project/:id` | YES | YES | YES* | YES* |
| Analysis pipeline mutate | POST `/api/analysis/`, POST `/api/analysis/:id`, retry | YES | NO | NO | NO |
| Manage access | PUT `/api/project/:id/access` | YES | NO | NO | NO |
| Illustrated mutate | POST/DELETE `/api/illustrated/:projectId` | YES | NO | NO | YES |
| Plan hub GET | GET `/api/project/:projectId/plan` (MEMBER) | YES | NO | YES** | NO |
| Plan hub GET (existing plan) | same; also `ProjectPlanAccess` VIEW/EDIT without project `canAction` | — | — | — | — |
| Plan create | POST `/api/project/:projectId/plan` (MEMBER) | YES | NO | YES | NO |
| Plan mutate | plan routes | plan EDIT / owner / COMPANY / project `canAction` | — | — | — |

\** Hub when plan **missing**: MEMBER still needs project `canAction` (create flow). Hub when plan **exists**: MEMBER with plan grant OR project `canAction`.

\* `canAction` / `canVisualize` imply `canView` for read paths that require seeing the project.

Form collaboration remains owner-only. Project plan access remains a separate grant on `planId`.
