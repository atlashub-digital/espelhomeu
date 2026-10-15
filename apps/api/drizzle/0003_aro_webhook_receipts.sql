CREATE TABLE IF NOT EXISTS "aro_webhook_receipts" (
  "event_id" uuid PRIMARY KEY NOT NULL,
  "project" text NOT NULL,
  "payload_hash" text NOT NULL,
  "received_at" timestamp with time zone DEFAULT now() NOT NULL
);
