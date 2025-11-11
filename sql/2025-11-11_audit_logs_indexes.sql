-- Indexes to speed up audit log queries
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_action_created_idx ON public.audit_logs(action, created_at DESC);
