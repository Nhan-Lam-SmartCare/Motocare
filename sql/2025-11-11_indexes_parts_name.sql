-- Optional performance index for quick search/sort by name
CREATE INDEX IF NOT EXISTS parts_name_idx ON public.parts(name);
