-- Migration: Marketing Module Schema setup
-- Date: 2026-07-10
-- Description: Create tables for marketing_projects, ideas, scripts, videos, thumbnails, captions, hashtags, campaigns, calendar, and analytics.

-- =============================================
-- 1. CREATE TABLE: marketing_projects
-- =============================================
CREATE TABLE IF NOT EXISTS marketing_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  branch_id TEXT NOT NULL DEFAULT 'CN1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 2. CREATE TABLE: ideas (Ý tưởng)
-- =============================================
CREATE TABLE IF NOT EXISTS ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES marketing_projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  vehicle_model TEXT, -- Dòng xe (e.g. Vision, SH, Exciter,...)
  brand TEXT, -- Hãng xe (e.g. Honda, Yamaha,...)
  topic TEXT, -- Chủ đề (e.g. Bảo dưỡng, Review, Tiết kiệm xăng,...)
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  source TEXT, -- Nguồn ý tưởng (e.g. Đối thủ, Khách hàng hỏi, Tự nghĩ,...)
  creator_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'writing', 'completed', 'cancelled')),
  branch_id TEXT NOT NULL DEFAULT 'CN1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 3. CREATE TABLE: scripts (Kịch bản)
-- =============================================
CREATE TABLE IF NOT EXISTS scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID REFERENCES ideas(id) ON DELETE SET NULL,
  hook TEXT, -- Hook kịch bản
  introduction TEXT, -- Giới thiệu kịch bản
  content TEXT, -- Nội dung kịch bản
  cta TEXT, -- Kêu gọi hành động (Call to action)
  duration INTEGER NOT NULL DEFAULT 0, -- Thời lượng tính theo giây
  branch_id TEXT NOT NULL DEFAULT 'CN1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 4. CREATE TABLE: videos (Quản lý video)
-- =============================================
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id UUID REFERENCES scripts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  local_path TEXT NOT NULL, -- Ví dụ: D:\NL SmartCare Media\2026\07\Vision\Vision_HaoXang_001.mp4
  thumbnail TEXT, -- Metadata thumbnail / preview URL hoặc base64 nhỏ
  filming_date TIMESTAMPTZ, -- Ngày quay
  editing_date TIMESTAMPTZ, -- Ngày dựng
  posting_date TIMESTAMPTZ, -- Ngày đăng
  tiktok_link TEXT,
  facebook_link TEXT,
  youtube_link TEXT,
  
  -- Metrics
  views INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  saves INTEGER NOT NULL DEFAULT 0,
  inboxes INTEGER NOT NULL DEFAULT 0,
  visitors INTEGER NOT NULL DEFAULT 0, -- Khách đến cửa hàng từ video
  revenue NUMERIC(15, 2) NOT NULL DEFAULT 0, -- Doanh thu từ video
  
  branch_id TEXT NOT NULL DEFAULT 'CN1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 5. CREATE TABLE: thumbnails (Quản lý thumbnail)
-- =============================================
CREATE TABLE IF NOT EXISTS thumbnails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  preview_data TEXT, -- Chuỗi base64 hoặc URL ảnh nén nhẹ để xem trước
  branch_id TEXT NOT NULL DEFAULT 'CN1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 6. CREATE TABLE: captions (Quản lý caption)
-- =============================================
CREATE TABLE IF NOT EXISTS captions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT, -- Phân loại (e.g. Khuyến mãi, Chia sẻ mẹo, Giới thiệu xe...)
  branch_id TEXT NOT NULL DEFAULT 'CN1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 7. CREATE TABLE: hashtags (Thư viện hashtag)
-- =============================================
CREATE TABLE IF NOT EXISTS hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag TEXT NOT NULL UNIQUE CHECK (tag LIKE '#%'), -- Đảm bảo có ký tự #
  category TEXT NOT NULL CHECK (category IN ('Honda', 'Yamaha', 'Vision', 'SH', 'Xe điện', 'Pin Lithium', 'General')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 8. CREATE TABLE: campaigns (Chiến dịch)
-- =============================================
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  target_month TEXT NOT NULL, -- e.g. "2026-07"
  target_videos INTEGER NOT NULL DEFAULT 0,
  target_views BIGINT NOT NULL DEFAULT 0,
  target_inboxes INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  branch_id TEXT NOT NULL DEFAULT 'CN1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 9. CREATE TABLE: calendar (Lịch đăng)
-- =============================================
CREATE TABLE IF NOT EXISTS calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  scheduled_date TIMESTAMPTZ NOT NULL,
  platforms TEXT[] NOT NULL, -- Mảng các nền tảng: ['TikTok', 'Facebook', 'YouTube']
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'posted', 'missed')),
  branch_id TEXT NOT NULL DEFAULT 'CN1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 10. CREATE TABLE: analytics (Thống kê chụp snapshot)
-- =============================================
CREATE TABLE IF NOT EXISTS analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_date DATE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('TikTok', 'Facebook', 'YouTube', 'Website', 'Overall')),
  views BIGINT NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  saves INTEGER NOT NULL DEFAULT 0,
  inboxes INTEGER NOT NULL DEFAULT 0,
  visitors INTEGER NOT NULL DEFAULT 0,
  revenue NUMERIC(15, 2) NOT NULL DEFAULT 0,
  branch_id TEXT NOT NULL DEFAULT 'CN1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(record_date, platform, branch_id)
);

-- =============================================
-- 11. INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_ideas_project ON ideas(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ideas_branch ON ideas(branch_id);
CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(status);
CREATE INDEX IF NOT EXISTS idx_scripts_idea ON scripts(idea_id) WHERE idea_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_videos_script ON videos(script_id) WHERE script_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_videos_branch ON videos(branch_id);
CREATE INDEX IF NOT EXISTS idx_thumbnails_video ON thumbnails(video_id);
CREATE INDEX IF NOT EXISTS idx_captions_branch ON captions(branch_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_branch ON campaigns(branch_id);
CREATE INDEX IF NOT EXISTS idx_calendar_video ON calendar(video_id);
CREATE INDEX IF NOT EXISTS idx_calendar_date ON calendar(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics(record_date);

-- =============================================
-- 12. ENABLE ROW LEVEL SECURITY
-- =============================================
ALTER TABLE marketing_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE thumbnails ENABLE ROW LEVEL SECURITY;
ALTER TABLE captions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 13. RLS POLICIES - OWNER & MANAGER FULL ACCESS
-- =============================================

-- HELPER: Tạo policy SELECT cho tất cả
CREATE POLICY "marketing_projects_select" ON marketing_projects FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('owner', 'manager')));

CREATE POLICY "ideas_select" ON ideas FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('owner', 'manager')));

CREATE POLICY "scripts_select" ON scripts FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('owner', 'manager')));

CREATE POLICY "videos_select" ON videos FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('owner', 'manager')));

CREATE POLICY "thumbnails_select" ON thumbnails FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('owner', 'manager')));

CREATE POLICY "captions_select" ON captions FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('owner', 'manager')));

CREATE POLICY "hashtags_select" ON hashtags FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('owner', 'manager')));

CREATE POLICY "campaigns_select" ON campaigns FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('owner', 'manager')));

CREATE POLICY "calendar_select" ON calendar FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('owner', 'manager')));

CREATE POLICY "analytics_select" ON analytics FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('owner', 'manager')));

-- HELPER: Tạo policy INSERT cho owner & manager
CREATE POLICY "marketing_projects_insert" ON marketing_projects FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('owner', 'manager')));

CREATE POLICY "ideas_insert" ON ideas FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('owner', 'manager')));

CREATE POLICY "scripts_insert" ON scripts FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('owner', 'manager')));

CREATE POLICY "videos_insert" ON videos FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('owner', 'manager')));

CREATE POLICY "thumbnails_insert" ON thumbnails FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('owner', 'manager')));

CREATE POLICY "captions_insert" ON captions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('owner', 'manager')));

CREATE POLICY "hashtags_insert" ON hashtags FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('owner', 'manager')));

CREATE POLICY "campaigns_insert" ON campaigns FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('owner', 'manager')));

CREATE POLICY "calendar_insert" ON calendar FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('owner', 'manager')));

CREATE POLICY "analytics_insert" ON analytics FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('owner', 'manager')));

-- HELPER: Tạo policy UPDATE cho owner & manager
CREATE POLICY "marketing_projects_update" ON marketing_projects FOR UPDATE
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('owner', 'manager')));

CREATE POLICY "ideas_update" ON ideas FOR UPDATE
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('owner', 'manager')));

CREATE POLICY "scripts_update" ON scripts FOR UPDATE
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('owner', 'manager')));

CREATE POLICY "videos_update" ON videos FOR UPDATE
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('owner', 'manager')));

CREATE POLICY "thumbnails_update" ON thumbnails FOR UPDATE
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('owner', 'manager')));

CREATE POLICY "captions_update" ON captions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('owner', 'manager')));

CREATE POLICY "hashtags_update" ON hashtags FOR UPDATE
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('owner', 'manager')));

CREATE POLICY "campaigns_update" ON campaigns FOR UPDATE
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('owner', 'manager')));

CREATE POLICY "calendar_update" ON calendar FOR UPDATE
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('owner', 'manager')));

CREATE POLICY "analytics_update" ON analytics FOR UPDATE
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('owner', 'manager')));

-- HELPER: Tạo policy DELETE (Chỉ owner có quyền xóa)
CREATE POLICY "marketing_projects_delete" ON marketing_projects FOR DELETE
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'owner'));

CREATE POLICY "ideas_delete" ON ideas FOR DELETE
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'owner'));

CREATE POLICY "scripts_delete" ON scripts FOR DELETE
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'owner'));

CREATE POLICY "videos_delete" ON videos FOR DELETE
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'owner'));

CREATE POLICY "thumbnails_delete" ON thumbnails FOR DELETE
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'owner'));

CREATE POLICY "captions_delete" ON captions FOR DELETE
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'owner'));

CREATE POLICY "hashtags_delete" ON hashtags FOR DELETE
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'owner'));

CREATE POLICY "campaigns_delete" ON campaigns FOR DELETE
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'owner'));

CREATE POLICY "calendar_delete" ON calendar FOR DELETE
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'owner'));

CREATE POLICY "analytics_delete" ON analytics FOR DELETE
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'owner'));


-- =============================================
-- 14. AUTO UPDATE updated_at TRIGGER FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION update_marketing_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER REGISTRATION
CREATE TRIGGER set_updated_at_projects BEFORE UPDATE ON marketing_projects FOR EACH ROW EXECUTE FUNCTION update_marketing_updated_at_column();
CREATE TRIGGER set_updated_at_ideas BEFORE UPDATE ON ideas FOR EACH ROW EXECUTE FUNCTION update_marketing_updated_at_column();
CREATE TRIGGER set_updated_at_scripts BEFORE UPDATE ON scripts FOR EACH ROW EXECUTE FUNCTION update_marketing_updated_at_column();
CREATE TRIGGER set_updated_at_videos BEFORE UPDATE ON videos FOR EACH ROW EXECUTE FUNCTION update_marketing_updated_at_column();
CREATE TRIGGER set_updated_at_thumbnails BEFORE UPDATE ON thumbnails FOR EACH ROW EXECUTE FUNCTION update_marketing_updated_at_column();
CREATE TRIGGER set_updated_at_captions BEFORE UPDATE ON captions FOR EACH ROW EXECUTE FUNCTION update_marketing_updated_at_column();
CREATE TRIGGER set_updated_at_campaigns BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_marketing_updated_at_column();
CREATE TRIGGER set_updated_at_calendar BEFORE UPDATE ON calendar FOR EACH ROW EXECUTE FUNCTION update_marketing_updated_at_column();

-- =============================================
-- 15. GRANT ACCESS TO authenticated USER ROLE
-- =============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON marketing_projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ideas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON scripts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON videos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON thumbnails TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON captions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON hashtags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON calendar TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON analytics TO authenticated;

-- =============================================
-- 16. INJECT SEEDS (HASHTAGS)
-- =============================================
INSERT INTO hashtags (tag, category) VALUES 
('#honda', 'Honda'),
('#yamaha', 'Yamaha'),
('#vision', 'Vision'),
('#sh', 'SH'),
('#xedien', 'Xe điện'),
('#pinlithium', 'Pin Lithium')
ON CONFLICT (tag) DO NOTHING;
