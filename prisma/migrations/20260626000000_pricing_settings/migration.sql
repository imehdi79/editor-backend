-- CreateTable
CREATE TABLE "pricing_settings" (
    "userId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "demolishRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rates" JSONB NOT NULL,
    "updatedAt" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "pricing_settings_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "pricing_settings" ADD CONSTRAINT "pricing_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
