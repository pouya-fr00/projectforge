export async function seedRbac(db: D1Database) {
  await db.exec(`
    INSERT OR IGNORE INTO roles (name) VALUES ('admin'), ('user');
    INSERT OR IGNORE INTO permissions (name) VALUES ('admin'), ('users:read'), ('users:write');
    INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r, permissions p
    WHERE (r.name = 'admin' AND p.name IN ('admin', 'users:read', 'users:write'))
       OR (r.name = 'user' AND p.name IN ('users:read'));
  `);
}
