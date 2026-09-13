INSERT INTO public.screener_configs(name, label, enabled, params, sort_order)
VALUES
  ('downtrend_turn_bullish', 'Downtrend Turned Bullish (2D)', true, '{"trend_lookback_days":20,"min_downtrend_pct":2}'::jsonb, 7)
ON CONFLICT (name) DO UPDATE
SET label = EXCLUDED.label,
    enabled = EXCLUDED.enabled,
    params = EXCLUDED.params,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();