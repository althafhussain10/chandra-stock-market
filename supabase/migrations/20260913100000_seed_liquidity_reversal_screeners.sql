INSERT INTO public.screener_configs(name, label, enabled, params, sort_order)
VALUES
  ('bullish_liquidity_reversal', 'Bullish Liquidity Sweep / Reversal', true, '{"level_lookback_days":20,"level_buffer_pct":0.5}'::jsonb, 8),
  ('bearish_liquidity_reversal', 'Bearish Liquidity Sweep / Reversal', true, '{"level_lookback_days":20,"level_buffer_pct":0.5}'::jsonb, 9)
ON CONFLICT (name) DO UPDATE
SET label = EXCLUDED.label,
    enabled = EXCLUDED.enabled,
    params = EXCLUDED.params,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();