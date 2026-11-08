-- =========================================================================
-- LAUNCHIT (launchit.world) — SHARED LIVE DATABASE SCHEMA (SUPABASE)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.launchit_tokens (
  mint TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.launchit_trades (
  id TEXT PRIMARY KEY,
  mint TEXT NOT NULL,
  payload JSONB NOT NULL,
  timestamp BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.launchit_theses (
  id TEXT PRIMARY KEY,
  mint TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.launchit_messages (
  id TEXT PRIMARY KEY,
  mint TEXT NOT NULL,
  payload JSONB NOT NULL,
  timestamp BIGINT NOT NULL
);

ALTER TABLE public.launchit_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.launchit_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.launchit_theses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.launchit_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read/write launchit_tokens" ON public.launchit_tokens FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public read/write launchit_trades" ON public.launchit_trades FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public read/write launchit_theses" ON public.launchit_theses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public read/write launchit_messages" ON public.launchit_messages FOR ALL USING (true) WITH CHECK (true);
