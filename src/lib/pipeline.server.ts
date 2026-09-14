/**
 * Server-only data pipeline: fetches OHLCV from Yahoo Finance, derives weekly /
 * monthly candles (with monthly EMA20) and runs the five screeners.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type Candle = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

const YAHOO = "https://query1.finance.yahoo.com/v8/finance/chart";

export async function fetchDaily(ticker: string, range = "5y"): Promise<Candle[]> {
  const url = `${YAHOO}/${encodeURIComponent(ticker)}?range=${range}&interval=1d`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`Yahoo ${res.status} for ${ticker}`);
  const json = (await res.json()) as any;
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`No data for ${ticker}`);
  const ts: number[] = result.timestamp ?? [];
  const q = result.indicators?.quote?.[0] ?? {};
  const out: Candle[] = [];
  for (let i = 0; i < ts.length; i++) {
    const o = q.open?.[i],
      h = q.high?.[i],
      l = q.low?.[i],
      c = q.close?.[i],
      v = q.volume?.[i];
    if (o == null || h == null || l == null || c == null) continue;
    out.push({
      date: new Date(ts[i]! * 1000).toISOString().slice(0, 10),
      open: o,
      high: h,
      low: l,
      close: c,
      volume: v ?? 0,
    });
  }
  return out;
}

function isoWeekKey(d: Date) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function aggregate(candles: Candle[], keyOf: (c: Candle) => string): Candle[] {
  const groups = new Map<string, Candle[]>();
  for (const c of candles) {
    const k = keyOf(c);
    const arr = groups.get(k);
    if (arr) arr.push(c);
    else groups.set(k, [c]);
  }
  return [...groups.values()].map((g) => ({
    date: g[g.length - 1]!.date,
    open: g[0]!.open,
    high: Math.max(...g.map((x) => x.high)),
    low: Math.min(...g.map((x) => x.low)),
    close: g[g.length - 1]!.close,
    volume: g.reduce((s, x) => s + (x.volume || 0), 0),
  }));
}

export const toWeekly = (c: Candle[]) => aggregate(c, (x) => isoWeekKey(new Date(x.date)));
export const toMonthly = (c: Candle[]) => aggregate(c, (x) => x.date.slice(0, 7));

/** EMA_t = close_t * (2/(p+1)) + EMA_(t-1) * (1 - 2/(p+1)), seeded from SMA(p). */
export function emaSeries(values: number[], period = 20): (number | null)[] {
  const out: (number | null)[] = values.map(() => null);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = ema;
  for (let i = period; i < values.length; i++) {
    ema = values[i]! * k + ema * (1 - k);
    out[i] = ema;
  }
  return out;
}

const chunk = <T,>(arr: T[], n: number): T[][] => {
  const res: T[][] = [];
  for (let i = 0; i < arr.length; i += n) res.push(arr.slice(i, i + n));
  return res;
};

export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) {
  const results: R[] = [];
  let idx = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i]!);
    }
  });
  await Promise.all(workers);
  return results;
}

/** Fetch + store candles for the whole active universe. */
export async function refreshMarketData(
  db: SupabaseClient<any>,
  opts: { emaPeriod?: number; offset?: number; limit?: number } = {},
) {
  const emaPeriod = opts.emaPeriod ?? 20;
  const { data: stocks, error } = await db
    .from("stocks")
    .select("ticker")
    .eq("active", true)
    .order("ticker");
  if (error) throw new Error(error.message);
  const all = (stocks ?? []).map((s: any) => s.ticker as string);
  const offset = opts.offset ?? 0;
  const tickers = opts.limit == null ? all.slice(offset) : all.slice(offset, offset + opts.limit);
  const total = all.length;

  const failed: string[] = [];
  const failures: string[] = [];
  let rows = 0;

  await mapLimit(tickers, 6, async (ticker) => {
    try {
      const daily = await fetchDaily(ticker);
      if (daily.length === 0) throw new Error("empty series");

      const dailyRows = daily.slice(-420).map((c) => ({
        ticker,
        date: c.date,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: Math.round(c.volume),
      }));
      for (const part of chunk(dailyRows, 500)) {
        const { error: e } = await db.from("daily_candles").upsert(part, {
          onConflict: "ticker,date",
        });
        if (e) throw new Error(e.message);
        rows += part.length;
      }

      const weekly = toWeekly(daily).slice(-160);
      const { error: we } = await db.from("weekly_candles").upsert(
        weekly.map((c) => ({
          ticker,
          week_end_date: c.date,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: Math.round(c.volume),
        })),
        { onConflict: "ticker,week_end_date" },
      );
      if (we) throw new Error(we.message);
      rows += weekly.length;

      const monthly = toMonthly(daily);
      const ema = emaSeries(
        monthly.map((m) => m.close),
        emaPeriod,
      );
      const { error: me } = await db.from("monthly_candles").upsert(
        monthly.map((c, i) => ({
          ticker,
          month_end_date: c.date,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: Math.round(c.volume),
          ema20: ema[i],
        })),
        { onConflict: "ticker,month_end_date" },
      );
      if (me) throw new Error(me.message);
      rows += monthly.length;
    } catch (err) {
      failed.push(ticker);
      failures.push(`${ticker}: ${err instanceof Error ? err.message : String(err)}`);
      console.error("refresh failed", ticker, err);
    }
  });

  return { rows, failed, failures, tickers: tickers.length, total };
}
