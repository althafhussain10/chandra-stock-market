CREATE TYPE public.app_role AS ENUM ('admin','user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.stocks (
  ticker text PRIMARY KEY,
  name text NOT NULL,
  sector text NOT NULL DEFAULT 'Others',
  subsector text NOT NULL DEFAULT 'Others',
  exchange text NOT NULL DEFAULT 'NSE',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.stocks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stocks TO authenticated;
GRANT ALL ON public.stocks TO service_role;
ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stocks public read" ON public.stocks FOR SELECT USING (true);
CREATE POLICY "stocks admin write" ON public.stocks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.daily_candles (
  ticker text NOT NULL REFERENCES public.stocks(ticker) ON DELETE CASCADE,
  date date NOT NULL,
  open numeric, high numeric, low numeric, close numeric,
  volume bigint,
  PRIMARY KEY (ticker, date)
);
GRANT SELECT ON public.daily_candles TO anon, authenticated;
GRANT ALL ON public.daily_candles TO service_role;
ALTER TABLE public.daily_candles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily public read" ON public.daily_candles FOR SELECT USING (true);
CREATE INDEX daily_candles_date_idx ON public.daily_candles(date);

CREATE TABLE public.weekly_candles (
  ticker text NOT NULL REFERENCES public.stocks(ticker) ON DELETE CASCADE,
  week_end_date date NOT NULL,
  open numeric, high numeric, low numeric, close numeric,
  volume bigint,
  PRIMARY KEY (ticker, week_end_date)
);
GRANT SELECT ON public.weekly_candles TO anon, authenticated;
GRANT ALL ON public.weekly_candles TO service_role;
ALTER TABLE public.weekly_candles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "weekly public read" ON public.weekly_candles FOR SELECT USING (true);

CREATE TABLE public.monthly_candles (
  ticker text NOT NULL REFERENCES public.stocks(ticker) ON DELETE CASCADE,
  month_end_date date NOT NULL,
  open numeric, high numeric, low numeric, close numeric,
  volume bigint,
  ema20 numeric,
  PRIMARY KEY (ticker, month_end_date)
);
GRANT SELECT ON public.monthly_candles TO anon, authenticated;
GRANT ALL ON public.monthly_candles TO service_role;
ALTER TABLE public.monthly_candles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "monthly public read" ON public.monthly_candles FOR SELECT USING (true);

CREATE TABLE public.screener_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screener_name text NOT NULL,
  ticker text NOT NULL,
  trigger_date date NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (screener_name, ticker, trigger_date)
);
GRANT SELECT ON public.screener_results TO anon, authenticated;
GRANT ALL ON public.screener_results TO service_role;
ALTER TABLE public.screener_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "results public read" ON public.screener_results FOR SELECT USING (true);
CREATE INDEX screener_results_name_idx ON public.screener_results(screener_name, created_at DESC);

CREATE TABLE public.watchlist (
  ticker text PRIMARY KEY,
  added_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.watchlist TO anon, authenticated;
GRANT ALL ON public.watchlist TO service_role;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "watchlist public read" ON public.watchlist FOR SELECT USING (true);
CREATE POLICY "watchlist public insert" ON public.watchlist FOR INSERT WITH CHECK (true);
CREATE POLICY "watchlist public delete" ON public.watchlist FOR DELETE USING (true);

CREATE TABLE public.screener_configs (
  name text PRIMARY KEY,
  label text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.screener_configs TO anon, authenticated;
GRANT UPDATE ON public.screener_configs TO authenticated;
GRANT ALL ON public.screener_configs TO service_role;
ALTER TABLE public.screener_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "configs public read" ON public.screener_configs FOR SELECT USING (true);
CREATE POLICY "configs admin update" ON public.screener_configs FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.run_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  rows_written int NOT NULL DEFAULT 0,
  error text,
  failed_tickers text[] NOT NULL DEFAULT '{}',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
GRANT SELECT ON public.run_logs TO anon, authenticated;
GRANT ALL ON public.run_logs TO service_role;
ALTER TABLE public.run_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logs public read" ON public.run_logs FOR SELECT USING (true);
CREATE INDEX run_logs_started_idx ON public.run_logs(started_at DESC);

CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings public read" ON public.app_settings FOR SELECT USING (true);

INSERT INTO public.app_settings(key, value) VALUES
  ('last_refresh', '{"at": null}'::jsonb),
  ('auto_refresh', '{"enabled": true}'::jsonb);

INSERT INTO public.screener_configs(name, label, enabled, params, sort_order) VALUES
  ('ath_breakout','All-Time High Breakouts', true, '{}'::jsonb, 1),
  ('monthly_ema20','Monthly EMA20 Breakout', true, '{"ema_period":20}'::jsonb, 2),
  ('todays_breakout',E'Today\'s Breakouts (5D/20D/60D High)', true, '{"lookbacks":[5,20,60]}'::jsonb, 3),
  ('high_volume',E'High Volume Today', true, '{"top_n":10}'::jsonb, 4),
  ('sector_strength','Sector Strength', true, '{"daily_months":3,"weekly_months":3,"monthly_months":6}'::jsonb, 5);