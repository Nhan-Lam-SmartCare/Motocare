-- Add product image URL support for inventory/products.
-- The frontend uses the camelCase field "imageUrl" for parts.
ALTER TABLE public.parts
ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

COMMENT ON COLUMN public.parts."imageUrl" IS 'Public image URL used to identify products in inventory and shop catalog.';
