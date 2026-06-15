-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "activePageId" TEXT NOT NULL,
    "pages" JSONB NOT NULL,
    "createdAt" DOUBLE PRECISION NOT NULL,
    "updatedAt" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_updatedAt_idx" ON "projects"("updatedAt");
