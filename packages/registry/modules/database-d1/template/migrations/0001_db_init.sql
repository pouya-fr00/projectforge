-- Initial schema for D1-compatible projects.
-- Creates the tables required by Better Auth and a small example entity.
CREATE TABLE IF NOT EXISTS "user" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "emailVerified" INTEGER NOT NULL,
  "image" TEXT,
  "role" TEXT NOT NULL DEFAULT 'user',
  "createdAt" INTEGER NOT NULL,
  "updatedAt" INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS "session" (
  "id" TEXT PRIMARY KEY,
  "expiresAt" INTEGER NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "createdAt" INTEGER NOT NULL,
  "updatedAt" INTEGER NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" TEXT NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account" (
  "id" TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" INTEGER,
  "refreshTokenExpiresAt" INTEGER,
  "scope" TEXT,
  "password" TEXT,
  "createdAt" INTEGER NOT NULL,
  "updatedAt" INTEGER NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "verification" (
  "id" TEXT PRIMARY KEY,
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expiresAt" INTEGER NOT NULL,
  "createdAt" INTEGER,
  "updatedAt" INTEGER
);

CREATE TABLE IF NOT EXISTS "posts" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" INTEGER NOT NULL
);

-- Seed a default post so comments can reference it without a pre-existing post.
INSERT OR IGNORE INTO "posts" ("id", "title", "body", "createdAt")
VALUES ('default', 'General', 'Default discussion thread', 0);

CREATE TABLE IF NOT EXISTS "migration_log" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "applied_at" TEXT NOT NULL DEFAULT (datetime('now'))
);
