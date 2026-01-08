-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" VARCHAR(20),
    "botId" VARCHAR(50),
    "ipAddress" VARCHAR(45) NOT NULL,
    "userAgent" VARCHAR(500),
    "method" VARCHAR(10) NOT NULL,
    "endpoint" VARCHAR(500) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "resourceType" VARCHAR(50),
    "resourceId" VARCHAR(100),
    "requestBody" JSONB,
    "responseStatus" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_userId_timestamp_idx" ON "audit_logs"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_botId_timestamp_idx" ON "audit_logs"("botId", "timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_resourceType_resourceId_timestamp_idx" ON "audit_logs"("resourceType", "resourceId", "timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_method_endpoint_timestamp_idx" ON "audit_logs"("method", "endpoint", "timestamp");
