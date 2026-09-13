export type ScreenerKey =
  | "ath_breakout"
  | "monthly_ema20"
  | "todays_breakout"
  | "high_volume"
  | "sector_strength"
  | "support_touched_turn_bullish"
  | "downtrend_turn_bullish"
  | "bullish_liquidity_reversal"
  | "bearish_liquidity_reversal";

export const SCREENER_TABS: { key: ScreenerKey; label: string; short: string; blurb: string }[] = [
  {
    key: "ath_breakout",
    label: "All-Time High Breakouts",
    short: "ATH",
    blurb: "Yesterday below the all-time high close, today above it.",
  },
  {
    key: "monthly_ema20",
    label: "Monthly EMA20 Breakout",
    short: "EMA20",
    blurb:
      "Last month opened below the monthly EMA20, closed above it, and price is now above last month's high.",
  },
  {
    key: "todays_breakout",
    label: "Today's Breakouts (5D/20D/60D)",
    short: "5/20/60",
    blurb: "Today's close is above the highest close of the last 5, 20 and 60 sessions.",
  },
  {
    key: "high_volume",
    label: "High Volume Today",
    short: "Volume",
    blurb: "Top traded stocks by today's volume.",
  },
  {
    key: "sector_strength",
    label: "Sector Strength",
    short: "Sectors",
    blurb: "Average sector move over 3 months (daily & weekly) and 6 months (monthly).",
  },
  {
    key: "support_touched_turn_bullish",
    label: "Support Touched / Turn Bullish",
    short: "Support",
    blurb: "Stocks that bounce off a near-term support zone and turn bullish on a clean reversal.",
  },
  {
    key: "downtrend_turn_bullish",
    label: "Downtrend Turned Bullish (2D)",
    short: "Turn Bullish",
    blurb: "Stocks that were trending down and turned bullish within the latest two trading sessions.",
  },
  {
    key: "bullish_liquidity_reversal",
    label: "Bullish Liquidity Sweep / Reversal",
    short: "Bull Sweep",
    blurb: "Support sweep below a demand zone followed by a close back above support and confirmation.",
  },
  {
    key: "bearish_liquidity_reversal",
    label: "Bearish Liquidity Sweep / Reversal",
    short: "Bear Sweep",
    blurb: "Resistance sweep above a supply zone followed by a close back below resistance and confirmation.",
  },
];

export type FundamentalKey = "profit_loss" | "balance_sheet" | "cash_flow";

export const FUNDAMENTAL_TABS: { key: FundamentalKey; label: string; short: string; blurb: string }[] = [
  {
    key: "profit_loss",
    label: "Profit & Loss",
    short: "P&L",
    blurb: "Revenue, EBITDA, operating profit and net profit trend by stock.",
  },
  {
    key: "balance_sheet",
    label: "Balance Sheet",
    short: "BS",
    blurb: "Assets, equity, debt and liquidity snapshot for each company.",
  },
  {
    key: "cash_flow",
    label: "Cash Flow",
    short: "CF",
    blurb: "Operating, investing and financing cash flows with free cash flow.",
  },
];

export const fmtNum = (v: unknown, digits = 2) =>
  v == null || v === "" || Number.isNaN(Number(v))
    ? "—"
    : Number(v).toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const fmtInt = (v: unknown) =>
  v == null || Number.isNaN(Number(v)) ? "—" : Number(v).toLocaleString("en-IN");

export const fmtDate = (v: unknown) => (v ? String(v) : "—");
