CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_role (
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- Seed default roles and permissions so the module is usable immediately.
INSERT OR IGNORE INTO roles (name) VALUES ('admin'), ('user');
INSERT OR IGNORE INTO permissions (name) VALUES ('admin'), ('users:read'), ('users:write');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE (r.name = 'admin' AND p.name IN ('admin', 'users:read', 'users:write'))
   OR (r.name = 'user' AND p.name IN ('users:read'));
