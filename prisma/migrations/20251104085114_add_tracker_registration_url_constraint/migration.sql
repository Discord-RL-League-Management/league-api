-- Create partial unique index to prevent duplicate pending/processing registrations for the same URL
-- This prevents race conditions where multiple users try to register the same URL simultaneously
-- Only create the index if the table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tracker_registrations') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND tablename = 'tracker_registrations' 
            AND indexname = 'tracker_registrations_url_pending_unique'
        ) THEN
            CREATE UNIQUE INDEX "tracker_registrations_url_pending_unique" 
            ON "tracker_registrations" ("url") 
            WHERE "status" IN ('PENDING', 'PROCESSING');
        END IF;
    END IF;
END $$;

