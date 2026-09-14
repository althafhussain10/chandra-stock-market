INSERT INTO public.screener_configs(name, label, enabled, params, sort_order)
VALUES
  ('ema_trend_bullish', 'Bullish EMA Trend (50 > 100 > 200)', true, '{}'::jsonb, 10),
  ('three_candle_bullish_turn', 'Three-Candle Bullish Turn', true, '{}'::jsonb, 11)
ON CONFLICT (name) DO UPDATE
SET label = EXCLUDED.label,
    enabled = EXCLUDED.enabled,
    params = EXCLUDED.params,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();