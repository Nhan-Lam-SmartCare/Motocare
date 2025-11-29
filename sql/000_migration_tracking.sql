-- Migration Tracking Table
-- Sử dụng bảng này để theo dõi các migrations đã được chạy

CREATE TABLE IF NOT EXISTS _migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    checksum VARCHAR(64),  -- Optional: MD5 hash của file để detect changes
    execution_time_ms INTEGER,
    status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failed', 'rolled_back'))
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_migrations_name ON _migrations(name);
CREATE INDEX IF NOT EXISTS idx_migrations_executed_at ON _migrations(executed_at DESC);

-- Function to record migration
CREATE OR REPLACE FUNCTION record_migration(
    p_name VARCHAR(255),
    p_checksum VARCHAR(64) DEFAULT NULL,
    p_execution_time_ms INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO _migrations (name, checksum, execution_time_ms)
    VALUES (p_name, p_checksum, p_execution_time_ms)
    ON CONFLICT (name) DO UPDATE SET
        executed_at = NOW(),
        checksum = COALESCE(EXCLUDED.checksum, _migrations.checksum),
        execution_time_ms = COALESCE(EXCLUDED.execution_time_ms, _migrations.execution_time_ms),
        status = 'success';
END;
$$ LANGUAGE plpgsql;

-- Function to check if migration was already run
CREATE OR REPLACE FUNCTION migration_exists(p_name VARCHAR(255))
RETURNS BOOLEAN AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS(SELECT 1 FROM _migrations WHERE name = p_name AND status = 'success')
    INTO v_exists;
    RETURN v_exists;
END;
$$ LANGUAGE plpgsql;

-- View to see migration history
CREATE OR REPLACE VIEW migration_history AS
SELECT 
    name,
    executed_at,
    status,
    execution_time_ms,
    CASE 
        WHEN execution_time_ms < 1000 THEN execution_time_ms || 'ms'
        ELSE ROUND(execution_time_ms / 1000.0, 2) || 's'
    END AS execution_time_formatted
FROM _migrations
ORDER BY executed_at DESC;

COMMENT ON TABLE _migrations IS 'Tracks executed database migrations';
COMMENT ON COLUMN _migrations.name IS 'Migration file name (e.g., 2025-11-10_schema_setup_clean.sql)';
COMMENT ON COLUMN _migrations.checksum IS 'MD5 hash of migration file for change detection';
COMMENT ON COLUMN _migrations.execution_time_ms IS 'Time taken to execute migration in milliseconds';
