-- Add print template configuration columns to store_settings table
-- This supports visual print template customizer in settings page

DO $$ 
BEGIN
    -- Add print_paper_size if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='store_settings' AND column_name='print_paper_size'
    ) THEN
        ALTER TABLE store_settings ADD COLUMN print_paper_size TEXT DEFAULT 'K80';
        COMMENT ON COLUMN store_settings.print_paper_size IS 'Khổ giấy mặc định (K80 hoặc A5)';
    END IF;

    -- Add print_show_logo if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='store_settings' AND column_name='print_show_logo'
    ) THEN
        ALTER TABLE store_settings ADD COLUMN print_show_logo BOOLEAN DEFAULT true;
        COMMENT ON COLUMN store_settings.print_show_logo IS 'Hiển thị logo trên mẫu in';
    END IF;

    -- Add print_greeting if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='store_settings' AND column_name='print_greeting'
    ) THEN
        ALTER TABLE store_settings ADD COLUMN print_greeting TEXT DEFAULT 'Cảm ơn quý khách! Hẹn gặp lại';
        COMMENT ON COLUMN store_settings.print_greeting IS 'Lời chào cảm ơn ở chân trang mẫu in';
    END IF;

END $$;

-- Verify columns in store_settings
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'store_settings' AND column_name IN ('print_paper_size', 'print_show_logo', 'print_greeting')
ORDER BY column_name;
