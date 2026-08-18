-- Comments table for authenticated comment model.
CREATE TABLE IF NOT EXISTS "comments" (
  "id" TEXT PRIMARY KEY,
  "body" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "createdAt" INTEGER NOT NULL,
  "updatedAt" INTEGER NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE,
  FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE
);
