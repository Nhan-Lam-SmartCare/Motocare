-- Add sale_code column to sales table and create auto-generation function
-- This adds a formatted sale code like BH-20241117-001

DO $$
BEGIN
    -- Add sale_code column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='sales' AND column_name='sale_code'
    ) THEN
        ALTER TABLE sales ADD COLUMN sale_code TEXT UNIQUE;
        COMMENT ON COLUMN sales.sale_code IS 'Mã phiếu bán hàng (VD: BH-20241117-001)';
        
        -- Create index for better performance
        CREATE INDEX IF NOT EXISTS idx_sales_sale_code ON sales(sale_code);
    END IF;

    -- Add sale_prefix to store_settings if not exists (default: BH for Bán Hàng)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='store_settings' AND column_name='sale_prefix'
    ) THEN
        ALTER TABLE store_settings ADD COLUMN sale_prefix TEXT DEFAULT 'BH';
        COMMENT ON COLUMN store_settings.sale_prefix IS 'Mã tiền tố phiếu bán hàng';
        
        -- Update existing row with default value
        UPDATE store_settings SET sale_prefix = 'BH' WHERE sale_prefix IS NULL;
    END IF;
END $$;

-- Function to generate next sale code
-- Format: {PREFIX}-{YYYYMMDD}-{XXX}
-- Example: BH-20241117-001, BH-20241117-002
CREATE OR REPLACE FUNCTION generate_sale_code(p_date TIMESTAMPTZ DEFAULT NOW())
RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT;
    v_date_str TEXT;
    v_counter INTEGER;
    v_code TEXT;
BEGIN
    -- Get sale prefix from store settings (default: BH)
    SELECT COALESCE(sale_prefix, 'BH') INTO v_prefix
    FROM store_settings
    LIMIT 1;

    -- Format date as YYYYMMDD
    v_date_str := TO_CHAR(p_date, 'YYYYMMDD');

    -- Find the highest counter for this date
    SELECT COALESCE(
        MAX(
            CAST(
                SUBSTRING(sale_code FROM '\\d+$') AS INTEGER
            )
        ), 0
    ) INTO v_counter
    FROM sales
    WHERE sale_code LIKE v_prefix || '-' || v_date_str || '-%';

    -- Increment counter
    v_counter := v_counter + 1;

    -- Generate code: PREFIX-YYYYMMDD-XXX (3 digits)
    v_code := v_prefix || '-' || v_date_str || '-' || LPAD(v_counter::TEXT, 3, '0');

    RETURN v_code;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_sale_code IS 'Tự động sinh mã phiếu bán hàng theo định dạng PREFIX-YYYYMMDD-XXX (VD: BH-20241117-001)';

-- Update existing sales records to have sale_code (backfill)
-- This will generate codes based on their creation date
DO $$
DECLARE
    r RECORD;
    v_code TEXT;
    v_prefix TEXT;
    v_date_str TEXT;
    v_counter INTEGER;
    v_current_date TEXT := '';
BEGIN
    -- Get sale prefix from store settings (default: BH)
    SELECT COALESCE(sale_prefix, 'BH') INTO v_prefix
    FROM store_settings
    LIMIT 1;
    
    -- Initialize counter
    v_counter := 0;
    
    FOR r IN (
        SELECT id, date 
        FROM sales 
        WHERE sale_code IS NULL 
        ORDER BY date, id
    )
    LOOP
        -- Format date as YYYYMMDD
        v_date_str := TO_CHAR(r.date, 'YYYYMMDD');
        
        -- Reset counter if date changes
        IF v_date_str <> v_current_date THEN
            v_current_date := v_date_str;
            -- Find the highest existing counter for this date
            SELECT COALESCE(
                MAX(
                    CAST(
                        SUBSTRING(sale_code FROM '\\d+$') AS INTEGER
                    )
                ), 0
            ) INTO v_counter
            FROM sales
            WHERE sale_code LIKE v_prefix || '-' || v_date_str || '-%';
        END IF;
        
        -- Increment counter
        v_counter := v_counter + 1;
        
        -- Generate code: PREFIX-YYYYMMDD-XXX (3 digits)
        v_code := v_prefix || '-' || v_date_str || '-' || LPAD(v_counter::TEXT, 3, '0');
        
        -- Update the record
        UPDATE sales 
        SET sale_code = v_code 
        WHERE id = r.id;
    END LOOP;
    
    RAISE NOTICE 'Backfilled sale_code for existing sales records';
END $$;

-- Create trigger function to auto-generate sale_code before insert
CREATE OR REPLACE FUNCTION set_sale_code_before_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_prefix TEXT;
    v_date_str TEXT;
    v_counter INTEGER;
    v_max_attempts INTEGER := 50;
    v_attempt INTEGER := 0;
BEGIN
    -- Only generate if sale_code is not provided
    IF NEW.sale_code IS NOT NULL THEN
        RETURN NEW;
    END IF;
    
    -- Get prefix from settings
    SELECT COALESCE(sale_prefix, 'BH') INTO v_prefix 
    FROM store_settings LIMIT 1;
    
    -- Format date
    v_date_str := TO_CHAR(NEW.date, 'YYYYMMDD');
    
    -- Try to generate unique code
    LOOP
        -- Get next counter
        SELECT COALESCE(
            MAX(CAST(SUBSTRING(sale_code FROM '\\d+$') AS INTEGER)), 0
        ) + 1 INTO v_counter
        FROM sales
        WHERE sale_code LIKE v_prefix || '-' || v_date_str || '-%';
        
        -- Add attempt number to counter to handle concurrency
        v_counter := v_counter + v_attempt;
        
        -- Generate code
        NEW.sale_code := v_prefix || '-' || v_date_str || '-' || LPAD(v_counter::TEXT, 3, '0');
        
        -- Check if unique (this will be validated by unique constraint on insert)
        IF NOT EXISTS (SELECT 1 FROM sales WHERE sale_code = NEW.sale_code) THEN
            RETURN NEW;
        END IF;
        
        v_attempt := v_attempt + 1;
        IF v_attempt >= v_max_attempts THEN
            RAISE EXCEPTION 'Could not generate unique sale code after % attempts', v_max_attempts;
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-enable trigger
DROP TRIGGER IF EXISTS trigger_set_sale_code ON sales;
CREATE TRIGGER trigger_set_sale_code
    BEFORE INSERT ON sales
    FOR EACH ROW
    EXECUTE FUNCTION set_sale_code_before_insert();

COMMENT ON TRIGGER trigger_set_sale_code ON sales IS 'Auto-generate unique sale code before insert';

-- Make sale_code NOT NULL after backfill (optional, for data integrity)
-- Uncomment this if you want to enforce sale_code
-- ALTER TABLE sales ALTER COLUMN sale_code SET NOT NULL;
