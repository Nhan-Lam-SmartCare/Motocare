-- Migration: AI-First Architecture Schema Setup
-- Date: 2026-07-10
-- Description: Define ai_models, ai_prompt_library, ai_keys, and ai_generation_logs.

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 1. CREATE TABLE: ai_models
-- =============================================
CREATE TABLE IF NOT EXISTS ai_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL, -- 'OpenAI', 'Anthropic', 'Google', 'DeepSeek'
  model_name TEXT NOT NULL UNIQUE, -- 'gpt-4o', 'claude-3-5-sonnet', etc.
  display_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_models ON ai_models FOR SELECT TO PUBLIC USING (true);
CREATE POLICY admin_models ON ai_models FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'owner'
  )
);

-- =============================================
-- 2. CREATE TABLE: ai_prompt_library
-- =============================================
CREATE TABLE IF NOT EXISTS ai_prompt_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN (
    'planning', 'idea', 'script', 'shot_list', 'checklist', 
    'video_analyzer', 'thumbnail', 'caption', 'hashtag', 
    'best_time', 'campaign_planner', 'seo', 'rewrite', 'insight', 'kms_qa'
  )),
  name TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT NOT NULL,
  temperature NUMERIC NOT NULL DEFAULT 0.7,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_prompt_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_prompts ON ai_prompt_library FOR SELECT TO PUBLIC USING (true);
CREATE POLICY manage_prompts ON ai_prompt_library FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('owner', 'manager')
  )
);

CREATE TRIGGER set_updated_at_prompts
  BEFORE UPDATE ON ai_prompt_library
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- =============================================
-- 3. CREATE TABLE: ai_keys
-- =============================================
CREATE TABLE IF NOT EXISTS ai_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL UNIQUE, -- 'OpenAI', 'Anthropic', 'Google', 'DeepSeek'
  api_key_masked TEXT NOT NULL,
  api_endpoint TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY manage_keys ON ai_keys FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'owner'
  )
);

CREATE TRIGGER set_updated_at_keys
  BEFORE UPDATE ON ai_keys
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- =============================================
-- 4. CREATE TABLE: ai_generation_logs
-- =============================================
CREATE TABLE IF NOT EXISTS ai_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  feature TEXT NOT NULL, -- e.g. 'planning', 'script_writer', etc.
  model_used TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0.000000,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
  error_message TEXT,
  branch_id TEXT NOT NULL DEFAULT 'CN1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_generation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_logs ON ai_generation_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('owner', 'manager')
    )
  );

CREATE POLICY insert_logs ON ai_generation_logs
  FOR INSERT WITH CHECK (true);

-- =============================================
-- 5. SEED DATA
-- =============================================
INSERT INTO ai_models (provider, model_name, display_name, is_active) VALUES
  ('OpenAI', 'gpt-4o', 'GPT-4o (Khuyên dùng)', true),
  ('OpenAI', 'gpt-4o-mini', 'GPT-4o Mini (Tiết kiệm)', true),
  ('Anthropic', 'claude-3-5-sonnet', 'Claude 3.5 Sonnet (Sáng tạo)', true),
  ('Google', 'gemini-1.5-pro', 'Gemini 1.5 Pro', true),
  ('DeepSeek', 'deepseek-coder', 'DeepSeek Coder V2', true)
ON CONFLICT (model_name) DO NOTHING;

INSERT INTO ai_prompt_library (category, name, system_prompt, user_prompt_template, temperature, is_default) VALUES
  ('planning', 'Mẫu phân rã dự án', 'Bạn là chuyên viên quản trị dự án thông minh. Hãy chia nhỏ dự án thành các Tasks cụ thể kèm theo người thực hiện và ước tính thời gian.', 'Hãy chia nhỏ dự án "{{projectName}}" sau: "{{description}}"', 0.5, true),
  ('idea', 'Sinh ý tưởng video', 'Bạn là Giám đốc Sáng tạo. Hãy sinh 20 ý tưởng video marketing, nhóm theo dòng xe máy và chủ đề phù hợp với cửa hàng sửa xe.', 'Chủ đề mong muốn: "{{topic}}"', 0.8, true),
  ('script', 'Viết kịch bản triệu view', 'Bạn là nhà viết kịch bản nổi tiếng. Hãy tạo kịch bản video ngắn gồm các phần: Hook, Problem, Story, Solution, CTA, Call to Comment.', 'Độ dài: {{duration}} giây. Ý tưởng: "{{ideaTitle}}"', 0.7, true),
  ('shot_list', 'Thiết kế Shot List', 'Bạn là Đạo diễn hình ảnh. Hãy sinh danh sách cảnh quay (Shot List) chi tiết có góc máy, chuyển động camera và B-roll.', 'Kịch bản: "{{scriptContent}}"', 0.6, true),
  ('checklist', 'AI Kiểm tra checklist', 'Bạn là trợ lý giám sát. Hãy kiểm tra xem kịch bản đã đủ các yếu tố bắt buộc chưa (Hook, CTA, logo, intro).', 'Shot list & kịch bản: "{{content}}"', 0.3, true),
  ('thumbnail', 'Ý tưởng Thumbnail', 'Bạn là Designer chuyên nghiệp. Hãy gợi ý tiêu đề, màu sắc chủ đạo, bố cục và cảm xúc cho ảnh thu nhỏ (thumbnail).', 'Nội dung video: "{{videoTitle}}"', 0.7, true),
  ('caption', 'Viết Caption đa kênh', 'Bạn là Content Writer. Viết caption phù hợp cho TikTok, Facebook, YouTube và Website.', 'Thông tin video: "{{videoTitle}}". Tone giọng: {{tone}}', 0.8, true),
  ('hashtag', 'Tạo Hashtags thông minh', 'Tạo bộ hashtags tối ưu chuẩn SEO dựa trên chủ đề xe máy.', 'Chủ đề: "{{topic}}"', 0.5, true),
  ('best_time', 'Đề xuất giờ vàng đăng bài', 'Gợi ý ngày và giờ đăng bài có tương tác cao nhất dựa trên dữ liệu ngành xe máy.', 'Nội dung: "{{videoTitle}}"', 0.4, true),
  ('campaign_planner', 'Lập kế hoạch chiến dịch', 'Sinh mục tiêu chiến dịch, timeline và chỉ số KPI đề xuất.', 'Tên chiến dịch: "{{campaignName}}"', 0.6, true),
  ('seo', 'Tối ưu SEO TikTok', 'Đánh giá tiêu đề, hashtags, caption và cho điểm SEO.', 'Nội dung: "{{caption}}"', 0.5, true),
  ('rewrite', 'Rewrite Facebook Post', 'Viết lại caption Facebook theo nhiều phong cách hấp dẫn hơn.', 'Bài viết gốc: "{{content}}"', 0.8, true),
  ('insight', 'Phân tích Insight hiệu quả', 'Phân tích các chỉ số tương tác để chỉ ra nguyên nhân thành công/thất bại.', 'Dữ liệu thô: "{{metrics}}"', 0.4, true),
  ('kms_qa', 'Hỏi đáp SmartCare AI', 'Bạn là Trợ lý tri thức của doanh nghiệp. Bạn CHỈ được trả lời dựa trên tài liệu SOP nội bộ được cung cấp. Nếu tài liệu không có thông tin, hãy báo không biết.', 'Tài liệu liên quan:&#10;{{context}}&#10;&#10;Câu hỏi người dùng: {{question}}', 0.2, true)
ON CONFLICT DO NOTHING;
