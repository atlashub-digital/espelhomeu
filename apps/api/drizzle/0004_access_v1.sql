-- Backend-only application challenges, rate counters and revocable sessions.
-- Secrets are encrypted by the API; never grants purchase entitlements.
CREATE TABLE access_v1_records (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE access_v1_records ENABLE ROW LEVEL SECURITY;
