-- Migration: Knowledge Management System (KMS) Schema setup
-- Date: 2026-07-10
-- Description: Create knowledge_categories, knowledge_tags, knowledge_articles, knowledge_article_tags, knowledge_versions, and knowledge_files.

-- Create trigger helper function if it does not exist
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 1. CREATE TABLE: knowledge_categories
-- =============================================
CREATE TABLE IF NOT EXISTS knowledge_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES knowledge_categories(id) ON DELETE CASCADE,
  branch_id TEXT NOT NULL DEFAULT 'CN1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE knowledge_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_categories ON knowledge_categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('owner', 'manager')
    )
  );

CREATE POLICY insert_categories ON knowledge_categories
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('owner', 'manager')
    )
  );

CREATE POLICY update_categories ON knowledge_categories
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('owner', 'manager')
    )
  );

CREATE POLICY delete_categories ON knowledge_categories
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'owner'
    )
  );

-- =============================================
-- 2. CREATE TABLE: knowledge_tags
-- =============================================
CREATE TABLE IF NOT EXISTS knowledge_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE knowledge_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_tags ON knowledge_tags FOR SELECT TO PUBLIC USING (true);
CREATE POLICY insert_tags ON knowledge_tags FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('owner', 'manager')
  )
);
CREATE POLICY delete_tags ON knowledge_tags FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'owner'
  )
);

-- =============================================
-- 3. CREATE TABLE: knowledge_articles
-- =============================================
CREATE TABLE IF NOT EXISTS knowledge_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN (
    'brand_book', 'sop', 'training', 'technical', 'content_bible', 
    'script_library', 'prompt_library', 'case_study', 'lessons_learned', 
    'faq', 'document', 'template', 'checklist', 'form', 'policy'
  )),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category_id UUID REFERENCES knowledge_categories(id) ON DELETE SET NULL,
  author_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  effective_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
  version INTEGER NOT NULL DEFAULT 1,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb, -- Store subtype custom structures
  branch_id TEXT NOT NULL DEFAULT 'CN1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE knowledge_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_articles ON knowledge_articles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('owner', 'manager')
    )
  );

CREATE POLICY insert_articles ON knowledge_articles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('owner', 'manager')
    )
  );

CREATE POLICY update_articles ON knowledge_articles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('owner', 'manager')
    )
  );

CREATE POLICY delete_articles ON knowledge_articles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'owner'
    )
  );

-- =============================================
-- 4. CREATE TABLE: knowledge_article_tags
-- =============================================
CREATE TABLE IF NOT EXISTS knowledge_article_tags (
  article_id UUID NOT NULL REFERENCES knowledge_articles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES knowledge_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

ALTER TABLE knowledge_article_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_art_tags ON knowledge_article_tags FOR SELECT TO PUBLIC USING (true);
CREATE POLICY insert_art_tags ON knowledge_article_tags FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('owner', 'manager')
  )
);
CREATE POLICY delete_art_tags ON knowledge_article_tags FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('owner', 'manager')
  )
);

-- =============================================
-- 5. CREATE TABLE: knowledge_versions
-- =============================================
CREATE TABLE IF NOT EXISTS knowledge_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES knowledge_articles(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  modified_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE knowledge_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_versions ON knowledge_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('owner', 'manager')
    )
  );

CREATE POLICY insert_versions ON knowledge_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('owner', 'manager')
    )
  );

CREATE POLICY delete_versions ON knowledge_versions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'owner'
    )
  );

-- =============================================
-- 6. CREATE TABLE: knowledge_files
-- =============================================
CREATE TABLE IF NOT EXISTS knowledge_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES knowledge_articles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE knowledge_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_files ON knowledge_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('owner', 'manager')
    )
  );

CREATE POLICY insert_files ON knowledge_files
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('owner', 'manager')
    )
  );

CREATE POLICY delete_files ON knowledge_files
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('owner', 'manager')
    )
  );

-- =============================================
-- Triggers for updated_at
-- =============================================
CREATE TRIGGER set_updated_at_knowledge_categories
  BEFORE UPDATE ON knowledge_categories
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER set_updated_at_knowledge_articles
  BEFORE UPDATE ON knowledge_articles
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- =============================================
-- Performance Indexes
-- =============================================
CREATE INDEX IF NOT EXISTS idx_kms_art_type ON knowledge_articles(type);
CREATE INDEX IF NOT EXISTS idx_kms_art_cat ON knowledge_articles(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kms_art_branch ON knowledge_articles(branch_id);
CREATE INDEX IF NOT EXISTS idx_kms_cat_parent ON knowledge_categories(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kms_ver_art ON knowledge_versions(article_id);
CREATE INDEX IF NOT EXISTS idx_kms_file_art ON knowledge_files(article_id);

-- =============================================
-- SEED DATA FOR KMS CATEGORIES & TAGS
-- =============================================
INSERT INTO knowledge_categories (name, parent_id, branch_id) VALUES
  ('Quy trình SOP', null, 'CN1'),
  ('Đào tạo nhân viên', null, 'CN1'),
  ('Thư viện Kỹ thuật', null, 'CN1'),
  ('Cẩm nang Content', null, 'CN1');

INSERT INTO knowledge_tags (name) VALUES
  ('Honda'), ('Yamaha'), ('Xe Ga'), ('Bảo Dưỡng'), ('Vision'), ('Lithium'), ('Sửa Xe');
