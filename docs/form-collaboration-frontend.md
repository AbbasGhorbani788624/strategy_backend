# Form collaboration — frontend API notes

Base path: `POST|GET /api/project/:projectId/form-collaboration` (authenticated).

## Starting collaboration (preferred flow)

To open team form collaboration, **POST alone is enough**. Do not call GET first to probe whether collaboration exists — that produces a 404 before open and adds an extra round trip.

1. User chooses team collaboration (or enters the workspace with that intent).
2. `POST /api/project/:projectId/form-collaboration` with optional body:
   - `minSubmittedCount` (number | null)
   - `requireAllDelegationsCompleted` (boolean)
3. Use the response body directly as workspace state. **No follow-up GET is required** after a successful POST.

### POST response body (same as GET 200)

Wrapped by the standard envelope: `{ success, status, data }`. `data` is:

```json
{
  "project": {
    "id": "...",
    "creatorId": "...",
    "companyId": "...",
    "title": "..."
  },
  "collaboration": {
    "id": "...",
    "status": "OPEN",
    "minSubmittedCount": null,
    "requireAllDelegationsCompleted": false,
    "projectId": "...",
    "responses": [],
    "delegations": [],
    "createdBy": { "id": "...", "username": "..." }
  }
}
```

Field names and nesting match **GET** exactly (`responses` and `delegations` live on `collaboration`).

### POST HTTP status

| Situation | Status | Notes |
|-----------|--------|--------|
| First open (new record) or reopen after `CANCELLED` | **201** | Full `data` as above |
| Collaboration already `OPEN` | **200** | Same `data` — idempotent |
| Collaboration already `APPLIED` | **409** | Message: already applied; no new record |
| Wrong project status / mode, not creator, etc. | **400** / **403** | Unchanged |

## GET (optional)

`GET /api/project/:projectId/form-collaboration`

- **200** — same `data` shape as POST when collaboration exists.
- **404** — no collaboration record yet (“not opened”). Normal for returning users or refresh; **not** part of the “start collaboration” flow.

Use GET when:

- Returning to a project that may already have collaboration
- Refreshing workspace state
- Assignee access (non-creator)

## POST prerequisites (unchanged)

- `project.status === WAITING_FOR_FORM`
- `project.mode === SINGLE`
- Authenticated user is project **creator**
- Project has `companyId`
