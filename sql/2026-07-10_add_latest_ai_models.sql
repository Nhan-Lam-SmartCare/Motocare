-- ============================================================
-- Migration: Add latest Gemini & AI models to ai_models table
-- Run in: Supabase SQL Editor
-- Date: 2026-07-10
-- ============================================================

-- Gemini models mới nhất (tháng 7/2026)
INSERT INTO ai_models (provider, model_name, display_name, is_active) VALUES

  -- ── Google Gemini 3.x ──────────────────────────────────────
  ('Google', 'gemini-3.5-flash',           '✨ Gemini 3.5 Flash (Mới nhất)',          true),
  ('Google', 'gemini-3.1-pro',             '🔷 Gemini 3.1 Pro (Preview)',             true),
  ('Google', 'gemini-3.1-flash-lite',      '🪶 Gemini 3.1 Flash Lite (Tiết kiệm)',    true),

  -- ── Google Gemini 2.5 ──────────────────────────────────────
  ('Google', 'gemini-2.5-pro',             '✨ Gemini 2.5 Pro (Mạnh nhất)',           true),
  ('Google', 'gemini-2.5-flash',           '⚡ Gemini 2.5 Flash (Nhanh + Rẻ)',        true),
  ('Google', 'gemini-2.5-flash-lite',      '🪶 Gemini 2.5 Flash Lite (Không khả dụng)', false),

  -- ── Google Gemini 2.0 ──────────────────────────────────────
  ('Google', 'gemini-2.0-flash',           '⚡ Gemini 2.0 Flash (Deprecated)',         false),
  ('Google', 'gemini-2.0-flash-lite',      '🪶 Gemini 2.0 Flash Lite (Deprecated)',   false),

  -- ── Google Gemini 1.5 (giữ nguyên + thêm flash) ───────────
  ('Google', 'gemini-1.5-flash',           '⚡ Gemini 1.5 Flash (Deprecated)',         false),
  ('Google', 'gemini-1.5-flash-8b',        '🪶 Gemini 1.5 Flash-8B (Deprecated)',     false),

  -- ── OpenAI mới nhất ────────────────────────────────────────
  ('OpenAI', 'gpt-5.6-sol',                'GPT-5.6 Sol (Mạnh nhất)',                 true),
  ('OpenAI', 'gpt-5.6-terra',              'GPT-5.6 Terra (Cân bằng)',                true),
  ('OpenAI', 'gpt-5.6-luna',               'GPT-5.6 Luna (Tiết kiệm)',                true),
  ('OpenAI', 'gpt-4.1',                    'GPT-4.1 (Ổn định)',                       true),
  ('OpenAI', 'gpt-4.1-mini',              'GPT-4.1 Mini (Tiết kiệm)',                true),
  ('OpenAI', 'o3-mini',                    'o3-mini (Lập luận)',                       true),

  -- ── Anthropic ──────────────────────────────────────────────
  ('Anthropic', 'claude-3-5-haiku-20241022', 'Claude 3.5 Haiku (Nhanh)',             true),

  -- ── DeepSeek ───────────────────────────────────────────────
  ('DeepSeek', 'deepseek-chat',            'DeepSeek V3 (Chat)',                       true),
  ('DeepSeek', 'deepseek-reasoner',        'DeepSeek R1 (Lập luận)',                  true)

ON CONFLICT (model_name) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      is_active    = EXCLUDED.is_active;


-- Đánh dấu Gemini 1.5 Pro vẫn active (đã có sẵn)
UPDATE ai_models
SET display_name = '🔷 Gemini 1.5 Pro (Deprecated)',
    is_active = false
WHERE model_name = 'gemini-1.5-pro';

-- Verify
SELECT provider, model_name, display_name, is_active
FROM ai_models
ORDER BY provider, model_name;
