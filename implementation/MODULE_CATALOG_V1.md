# V1 Module Catalog

## `database-d1`

Adds D1 binding, Drizzle schema/migration structure, DB access boundary, local development config, health test, and example entity.

Does not add product tables beyond required module state.

## `auth`

Requires database. Adds Better Auth integration, signup/login/logout/session/profile foundation, protected web/API route helpers, environment declarations, and tests.

No social login, mail provider, password reset promise, or email verification promise in V1 unless Phase 0/implementation explicitly scopes a complete safe path.

## `rbac`

Requires auth. Adds roles, permissions, authorization helpers, server enforcement, client capability rendering, admin bootstrap guidance, and denial tests.

UI hiding is never the authorization control.

## `user-dashboard`

Requires auth. Adds protected layout, navigation contribution, account overview, profile/settings extension points, responsive and RTL-ready shell.

## `admin-dashboard`

Requires RBAC. Adds admin layout, navigation, authorization boundary, user-list example, empty/loading/error states, responsive shell.

## `comments`

Requires database and auth. Adds authenticated comment model, create/list/edit/delete-own foundation, moderation permission integration, validation, pagination, and tests.

No realtime, reactions, attachments, anonymous comments, or notification delivery in V1.
