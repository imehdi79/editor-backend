-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AlterTable: add owner column.
-- Added nullable first so the migration applies even if pre-auth (unowned) rows
-- exist (e.g. the original seed). Those orphans are then removed in dev, and the
-- column is promoted to NOT NULL + FK. On a fresh DB the DELETE is a no-op.
ALTER TABLE "projects" ADD COLUMN "userId" TEXT;
DELETE FROM "projects" WHERE "userId" IS NULL;
ALTER TABLE "projects" ALTER COLUMN "userId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "projects_userId_updatedAt_idx" ON "projects"("userId", "updatedAt");
