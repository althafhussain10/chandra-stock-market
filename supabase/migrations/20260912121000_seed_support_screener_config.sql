INSERT INTO public.screener_configs(name, label, enabled, params, sort_order)
VALUES
  ('support_touched_turn_bullish','Support Touched / Turn Bullish', true, '{"lookback_days":20,"support_buffer_pct":1.5,"min_turn_bullish_pct":0.5}'::jsonb, 6)
ON CONFLICT (name) DO UPDATE
SET label = EXCLUDED.label,
    enabled = EXCLUDED.enabled,
    params = EXCLUDED.params,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();
