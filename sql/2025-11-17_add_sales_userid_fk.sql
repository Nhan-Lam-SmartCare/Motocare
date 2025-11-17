-- Add foreign key constraint from sales.userid to profiles.id
-- This allows us to join and fetch user names efficiently

-- First, alter sales.userid column to UUID type to match profiles.id
DO $$
BEGIN
    -- Check if userid is already UUID type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' 
        AND column_name = 'userid' 
        AND data_type = 'text'
    ) THEN
        -- Convert userid from TEXT to UUID
        -- First, update any invalid values to NULL
        UPDATE sales SET userid = NULL WHERE userid !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
        
        -- Alter column type
        ALTER TABLE sales ALTER COLUMN userid TYPE UUID USING userid::uuid;
        
        RAISE NOTICE 'Column sales.userid converted from TEXT to UUID';
    ELSE
        RAISE NOTICE 'Column sales.userid is already UUID type';
    END IF;
END $$;

-- Now add the foreign key constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sales_userid_fkey' 
        AND table_name = 'sales'
    ) THEN
        -- Add the foreign key constraint
        ALTER TABLE sales 
        ADD CONSTRAINT sales_userid_fkey 
        FOREIGN KEY (userid) 
        REFERENCES profiles(id)
        ON DELETE SET NULL;
        
        RAISE NOTICE 'Foreign key sales_userid_fkey added successfully';
    ELSE
        RAISE NOTICE 'Foreign key sales_userid_fkey already exists';
    END IF;
END $$;

-- Create an index on sales.userid for faster joins
CREATE INDEX IF NOT EXISTS idx_sales_userid ON sales(userid);

COMMENT ON CONSTRAINT sales_userid_fkey ON sales IS 'Links sales to the user who created them';
