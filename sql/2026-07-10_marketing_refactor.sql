-- Migration: Content Studio Schema setup
-- Date: 2026-07-10
-- Description: Add content_project_extensions, project_researches, shot_lists, shooting_checklists, and media_versions.

-- Create trigger helper function if it does not exist
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 1. CREATE TABLE: content_project_extensions
-- =============================================
CREATE TABLE IF NOT EXISTS content_project_extensions (
  project_id UUID PRIMARY KEY REFERENCES marketing_projects(id) ON DELETE CASCADE,
  workflow_status TEXT NOT NULL DEFAULT 'ideas' CHECK (workflow_status IN (
    'ideas', 'research', 'scripting', 'review', 'shooting', 'editing', 
    'thumbnail', 'caption', 'scheduling', 'posted', 'kpi_tracking', 'completed'
  )),
  lessons_learned TEXT,
  branch_id TEXT NOT NULL DEFAULT 'CN1',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: Enable RLS on extensions
ALTER TABLE content_project_extensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_extensions ON content_project_extensions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('owner', 'manager')
    )
  );

CREATE POLICY insert_extensions ON content_project_extensions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('owner', 'manager')
    )
  );

CREATE POLICY update_extensions ON content_project_extensions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('owner', 'manager')
    )
  );

CREATE POLICY delete_extensions ON content_project_extensions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'owner'
    )
  );

-- =============================================
-- 2. CREATE TABLE: project_researches
-- =============================================
CREATE TABLE IF NOT EXISTS project_researches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES marketing_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  links TEXT[] DEFAULT '{}',
  branch_id TEXT NOT NULL DEFAULT 'CN1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE project_researches ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_researches ON project_researches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('owner', 'manager')
    )
  );

CREATE POLICY insert_researches ON project_researches
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('owner', 'manager')
    )
  );

CREATE POLICY update_researches ON project_researches
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('owner', 'manager')
    )
  );

CREATE POLICY delete_researches ON project_researches
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'owner'
    )
  );

-- =============================================
-- 3. CREATE TABLE: shot_lists
-- =============================================
CREATE TABLE IF NOT EXISTS shot_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES marketing_projects(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 5,
  sequence_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  branch_id TEXT NOT NULL DEFAULT 'CN1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE shot_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_shot_lists ON shot_lists
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('owner', 'manager')
    )
  );

CREATE POLICY insert_shot_lists ON shot_lists
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('owner', 'manager')
    )
  );

CREATE POLICY update_shot_lists ON shot_lists
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('owner', 'manager')
    )
  );

CREATE POLICY delete_shot_lists ON shot_lists
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'owner'
    )
  );

-- =============================================
-- 4. CREATE TABLE: shooting_checklists
-- =============================================
CREATE TABLE IF NOT EXISTS shooting_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES marketing_projects(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  is_checked BOOLEAN NOT NULL DEFAULT FALSE,
  category TEXT DEFAULT 'general',
  branch_id TEXT NOT NULL DEFAULT 'CN1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE shooting_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_checklists ON shooting_checklists
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('owner', 'manager')
    )
  );

CREATE POLICY insert_checklists ON shooting_checklists
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('owner', 'manager')
    )
  );

CREATE POLICY update_checklists ON shooting_checklists
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('owner', 'manager')
    )
  );

CREATE POLICY delete_checklists ON shooting_checklists
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'owner'
    )
  );

-- =============================================
-- 5. CREATE TABLE: media_versions
-- =============================================
CREATE TABLE IF NOT EXISTS media_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  notes TEXT,
  branch_id TEXT NOT NULL DEFAULT 'CN1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE media_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_versions ON media_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('owner', 'manager')
    )
  );

CREATE POLICY insert_versions ON media_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('owner', 'manager')
    )
  );

CREATE POLICY update_versions ON media_versions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('owner', 'manager')
    )
  );

CREATE POLICY delete_versions ON media_versions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'owner'
    )
  );

-- =============================================
-- Triggers for updated_at
-- =============================================
CREATE TRIGGER set_updated_at_project_extensions
  BEFORE UPDATE ON content_project_extensions
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER set_updated_at_project_researches
  BEFORE UPDATE ON project_researches
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER set_updated_at_shot_lists
  BEFORE UPDATE ON shot_lists
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER set_updated_at_shooting_checklists
  BEFORE UPDATE ON shooting_checklists
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- =============================================
-- Performance Indexes
-- =============================================
CREATE INDEX IF NOT EXISTS idx_researches_project ON project_researches(project_id);
CREATE INDEX IF NOT EXISTS idx_shot_lists_project ON shot_lists(project_id);
CREATE INDEX IF NOT EXISTS idx_checklists_project ON shooting_checklists(project_id);
CREATE INDEX IF NOT EXISTS idx_versions_video ON media_versions(video_id);
