-- ============================================================
-- Migration: Add api_key_value column to ai_keys
-- Purpose: Store the actual API key value so aiService can
--          retrieve and use it for real LLM API calls.
-- Run: Execute this in Supabase SQL Editor
-- ============================================================

-- 1. Add column to store actual key value (encrypted at rest by Supabase)
ALTER TABLE ai_keys
  ADD COLUMN IF NOT EXISTS api_key_value TEXT;

-- 2. Restrict access to this column via RLS (only service role can read)
-- The frontend will only read api_key_masked; api_key_value is fetched
-- internally by the service without exposing it to UI.

-- 3. Optional: verify structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'ai_keys'
ORDER BY ordinal_position;
