CREATE TABLE public.fundamental_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker text NOT NULL REFERENCES public.stocks(ticker) ON DELETE CASCADE,
  statement_type text NOT NULL CHECK (statement_type IN ('profit_loss', 'balance_sheet', 'cash_flow')),
  fiscal_year text NOT NULL DEFAULT 'FY2025',
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ticker, statement_type, fiscal_year)
);

GRANT SELECT ON public.fundamental_statements TO anon, authenticated;
GRANT ALL ON public.fundamental_statements TO service_role;
ALTER TABLE public.fundamental_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fundamentals public read" ON public.fundamental_statements FOR SELECT USING (true);

INSERT INTO public.fundamental_statements (ticker, statement_type, fiscal_year, metrics) VALUES
  ('RELIANCE', 'profit_loss', 'FY2025', '{"revenue":276400,"ebitda":44800,"operatingProfit":36750,"netProfit":21440,"margin":18.4,"growth":11.2}'),
  ('TCS', 'profit_loss', 'FY2025', '{"revenue":186420,"ebitda":48520,"operatingProfit":43360,"netProfit":35210,"margin":24.8,"growth":9.6}'),
  ('HDFCBANK', 'profit_loss', 'FY2025', '{"revenue":108350,"ebitda":33210,"operatingProfit":31840,"netProfit":24680,"margin":31.4,"growth":13.7}'),
  ('INFY', 'profit_loss', 'FY2025', '{"revenue":164480,"ebitda":44660,"operatingProfit":41010,"netProfit":31980,"margin":26.7,"growth":8.9}'),
  ('ICICIBANK', 'profit_loss', 'FY2025', '{"revenue":98960,"ebitda":30120,"operatingProfit":28740,"netProfit":21810,"margin":29.5,"growth":12.4}'),

  ('RELIANCE', 'balance_sheet', 'FY2025', '{"totalAssets":728600,"totalEquity":374200,"debt":126400,"cash":28800,"currentRatio":1.62,"netDebtToEbitda":1.8}'),
  ('TCS', 'balance_sheet', 'FY2025', '{"totalAssets":214500,"totalEquity":142900,"debt":18060,"cash":24200,"currentRatio":2.97,"netDebtToEbitda":0.3}'),
  ('HDFCBANK', 'balance_sheet', 'FY2025', '{"totalAssets":3124000,"totalEquity":297700,"debt":420300,"cash":274500,"currentRatio":0.94,"netDebtToEbitda":4.1}'),
  ('INFY', 'balance_sheet', 'FY2025', '{"totalAssets":161200,"totalEquity":104700,"debt":10400,"cash":19750,"currentRatio":2.36,"netDebtToEbitda":0.2}'),
  ('ICICIBANK', 'balance_sheet', 'FY2025', '{"totalAssets":2436200,"totalEquity":262850,"debt":335000,"cash":226000,"currentRatio":1.12,"netDebtToEbitda":3.6}'),

  ('RELIANCE', 'cash_flow', 'FY2025', '{"operatingCashFlow":29120,"investingCashFlow":-16650,"financingCashFlow":-11380,"freeCashFlow":17210,"capex":12740,"netCashFlow":1090,"cfoMargin":22.9}'),
  ('TCS', 'cash_flow', 'FY2025', '{"operatingCashFlow":38740,"investingCashFlow":-5420,"financingCashFlow":-26110,"freeCashFlow":29110,"capex":4100,"netCashFlow":7210,"cfoMargin":28.1}'),
  ('HDFCBANK', 'cash_flow', 'FY2025', '{"operatingCashFlow":25560,"investingCashFlow":-1980,"financingCashFlow":-21490,"freeCashFlow":23360,"capex":2200,"netCashFlow":2090,"cfoMargin":29.7}'),
  ('INFY', 'cash_flow', 'FY2025', '{"operatingCashFlow":33140,"investingCashFlow":-3810,"financingCashFlow":-24420,"freeCashFlow":28290,"capex":4300,"netCashFlow":4910,"cfoMargin":26.4}'),
  ('ICICIBANK', 'cash_flow', 'FY2025', '{"operatingCashFlow":21930,"investingCashFlow":-1470,"financingCashFlow":-16610,"freeCashFlow":19140,"capex":2790,"netCashFlow":3850,"cfoMargin":27.8}');
