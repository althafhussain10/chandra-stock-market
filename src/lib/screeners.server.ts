/** Server-only screener logic. Reads candles from the database, writes matches. */
import type { SupabaseClient } from "@supabase/supabase-js";

export const SCREENERS = [
  "ath_breakout",
  "monthly_ema20",
  "todays_breakout",
  "high_volume",
  "sector_strength",
  "support_touched_turn_bullish",
] as const;
export type ScreenerName = (typeof SCREENERS)[number];

type Row = { ticker: string; date: string; open: number; high: number; low: number; close: number; volume: number };

async function loadDaily(db: SupabaseClient<any>, days: number) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const iso = since.toISOString().slice(0, 10);
  const all: Row[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await db
      .from("daily_candles")
      .select("ticker,date,open,high,low,close,volume")
      .gte("date", iso)
      .order("ticker")
      .order("date")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    all.push(...((data ?? []) as Row[]));
    if (!data || data.length < pageSize) break;
  }
  const byTicker = new Map<string, Row[]>();
  for (const r of all) {
    const arr = byTicker.get(r.ticker);
    if (arr) arr.push(r);
    else byTicker.set(r.ticker, [r]);
  }
  return byTicker;
}

async function activeTickers(db: SupabaseClient<any>) {
  const { data, error } = await db.from("stocks").select("ticker,name,sector,subsector").eq("active", true);
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function writeResults(
  db: SupabaseClient<any>,
  screener: ScreenerName,
  matches: { ticker: string; trigger_date: string; details: Record<string, unknown> }[],
) {
  await db.from("screener_results").delete().eq("screener_name", screener);
  if (matches.length === 0) return 0;
  const { error } = await db
    .from("screener_results")
    .upsert(
      matches.map((m) => ({ screener_name: screener, ...m })),
      { onConflict: "screener_name,ticker,trigger_date" },
    );
  if (error) throw new Error(error.message);
  return matches.length;
}

const pct = (a: number, b: number) => ((a - b) / b) * 100;

/** 1. All-time-high breakout (max close in stored history). */
async function athBreakout(db: SupabaseClient<any>) {
  const byTicker = await loadDaily(db, 2000);
  const matches: any[] = [];
  for (const [ticker, rows] of byTicker) {
    if (rows.length < 30) continue;
    const today = rows[rows.length - 1]!;
    const yday = rows[rows.length - 2]!;
    const priorCloses = rows.slice(0, -1).map((r) => r.close);
    const ath = Math.max(...priorCloses);
    if (yday.close < ath && today.close > ath) {
      matches.push({
        ticker,
        trigger_date: today.date,
        details: { trigger_close: today.close, prev_ath: ath, breakout_pct: pct(today.close, ath) },
      });
    }
  }
  return writeResults(db, "ath_breakout", matches);
}

/** 2. Monthly EMA20 breakout with Date1 / Date2 / trailing stop tracking. */
async function monthlyEma20(db: SupabaseClient<any>) {
  const { data: monthly, error } = await db
    .from("monthly_candles")
    .select("ticker,month_end_date,open,high,low,close,ema20")
    .order("ticker")
    .order("month_end_date");
  if (error) throw new Error(error.message);
  const byTicker = new Map<string, any[]>();
  for (const m of monthly ?? []) {
    const arr = byTicker.get(m.ticker);
    if (arr) arr.push(m);
    else byTicker.set(m.ticker, [m]);
  }
  const daily = await loadDaily(db, 420);

  const matches: any[] = [];
  for (const [ticker, months] of byTicker) {
    if (months.length < 24) continue;
    const current = months[months.length - 1];
    const last = months[months.length - 2];
    if (!last?.ema20) continue;
    const cond =
      Number(last.open) < Number(last.ema20) &&
      Number(last.close) > Number(last.ema20) &&
      Number(current.close) > Number(last.high);
    if (!cond) continue;

    const drows = (daily.get(ticker) ?? []).filter((r) => r.date > last.month_end_date);
    let date1: Row | null = null;
    for (const r of drows) {
      if (r.close > Number(last.high)) {
        date1 = r;
        break;
      }
    }
    let date2: Row | null = null;
    if (date1) {
      for (const r of drows) {
        if (r.date > date1.date && r.close > date1.high) {
          date2 = r;
          break;
        }
      }
    }
    // Trailing stop: first later month closing below the previous month's low.
    let stl: string | null = null;
    const lastIdx = months.length - 2;
    for (let i = lastIdx + 1; i < months.length; i++) {
      if (Number(months[i].close) < Number(months[i - 1].low)) {
        stl = months[i].month_end_date;
        break;
      }
    }
    const entry = date2 ?? date1;
    let ret: number | null = null;
    if (entry) {
      const exit =
        stl && stl > entry.date
          ? Number(months.find((m: any) => m.month_end_date === stl)!.close)
          : Number(current.close);
      ret = pct(exit, entry.close);
    }
    matches.push({
      ticker,
      trigger_date: current.month_end_date,
      details: {
        trigger_close: entry?.close ?? Number(current.close),
        last_month_high: Number(last.high),
        monthly_ema20: Number(last.ema20),
        date1: date1?.date ?? null,
        date2: date2?.date ?? null,
        stl_hit: stl,
        return_pct: ret,
      },
    });
  }
  return writeResults(db, "monthly_ema20", matches);
}

/** 3. Today's breakout above 5 / 20 / 60-day highest close. */
async function todaysBreakout(db: SupabaseClient<any>, params: any) {
  const lookbacks: number[] = params?.lookbacks ?? [5, 20, 60];
  const maxLb = Math.max(...lookbacks);
  const byTicker = await loadDaily(db, maxLb * 3 + 30);
  const matches: any[] = [];
  for (const [ticker, rows] of byTicker) {
    if (rows.length < maxLb + 2) continue;
    const today = rows[rows.length - 1]!;
    const prior = rows.slice(0, -1);
    const highs: Record<string, number> = {};
    let ok = true;
    for (const lb of lookbacks) {
      const h = Math.max(...prior.slice(-lb).map((r) => r.close));
      highs[`high_${lb}d`] = h;
      if (!(today.close > h)) ok = false;
    }
    if (!ok) continue;
    matches.push({
      ticker,
      trigger_date: today.date,
      details: { trigger_close: today.close, ...highs, volume: today.volume },
    });
  }
  return writeResults(db, "todays_breakout", matches);
}

/** 4. Highest volume today (top N). */
async function highVolume(db: SupabaseClient<any>, params: any) {
  const topN: number = params?.top_n ?? 10;
  const byTicker = await loadDaily(db, 40);
  const rows: { ticker: string; row: Row; avg: number }[] = [];
  for (const [ticker, series] of byTicker) {
    const today = series[series.length - 1];
    if (!today) continue;
    const prior = series.slice(-21, -1);
    const avg = prior.length ? prior.reduce((s, r) => s + r.volume, 0) / prior.length : 0;
    rows.push({ ticker, row: today, avg });
  }
  rows.sort((a, b) => b.row.volume - a.row.volume);
  const matches = rows.slice(0, topN).map((r, i) => ({
    ticker: r.ticker,
    trigger_date: r.row.date,
    details: {
      trigger_close: r.row.close,
      volume: r.row.volume,
      rank: i + 1,
      avg_volume_20d: Math.round(r.avg),
      volume_x_avg: r.avg ? r.row.volume / r.avg : null,
    },
  }));
  return writeResults(db, "high_volume", matches);
}

/** 5. Sector strength across daily / weekly / monthly windows. */
async function sectorStrength(db: SupabaseClient<any>, params: any) {
  const stocks = await activeTickers(db);
  const sectorOf = new Map(stocks.map((s: any) => [s.ticker, s]));
  const daily = await loadDaily(db, 400);

  const changeOver = (rows: Row[], days: number) => {
    if (rows.length < 2) return null;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const iso = cutoff.toISOString().slice(0, 10);
    const start = rows.find((r) => r.date >= iso) ?? rows[0]!;
    const end = rows[rows.length - 1]!;
    if (!start.close) return null;
    return pct(end.close, start.close);
  };

  type Acc = { d3: number[]; w3: number[]; m6: number[]; wThis: number[]; wPrev: number[]; n: number };
  const groups = new Map<string, Acc>();
  const key = (s: any) => `${s.sector}||${s.subsector}`;

  for (const [ticker, rows] of daily) {
    const s = sectorOf.get(ticker);
    if (!s) continue;
    const k = key(s);
    const acc =
      groups.get(k) ?? { d3: [], w3: [], m6: [], wThis: [], wPrev: [], n: 0 };
    const d3 = changeOver(rows, 90);
    const m6 = changeOver(rows, 182);
    if (d3 != null) acc.d3.push(d3);
    if (d3 != null) acc.w3.push(d3);
    if (m6 != null) acc.m6.push(m6);
    const last = rows[rows.length - 1];
    const w1 = rows[rows.length - 6];
    const w2 = rows[rows.length - 11];
    if (last && w1) acc.wThis.push(pct(last.close, w1.close));
    if (w1 && w2) acc.wPrev.push(pct(w1.close, w2.close));
    acc.n += 1;
    groups.set(k, acc);
  }

  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const today = new Date().toISOString().slice(0, 10);
  const rowsOut = [...groups.entries()].map(([k, acc]) => {
    const [sector, subsector] = k.split("||");
    const thisWeek = avg(acc.wThis);
    const prevWeek = avg(acc.wPrev);
    return {
      sector,
      subsector,
      stocks: acc.n,
      daily_3m: avg(acc.d3),
      weekly_3m: avg(acc.w3),
      monthly_6m: avg(acc.m6),
      week_change: thisWeek,
      prev_week_change: prevWeek,
      turning_bullish: prevWeek < 0 && thisWeek > 0,
    };
  });
  rowsOut.sort((a, b) => b.daily_3m - a.daily_3m);

  const matches = rowsOut.map((r, i) => ({
    ticker: `${r.sector} / ${r.subsector}`,
    trigger_date: today,
    details: { ...r, rank: i + 1 },
  }));
  return writeResults(db, "sector_strength", matches);
}

/** 6. Support touched and turning bullish: close near 20-day support, with reversal above support and momentum. */
async function supportTouchedTurnBullish(db: SupabaseClient<any>, params: any) {
  const lookback = Number(params?.lookback_days ?? 20);
  const supportBuffer = Number(params?.support_buffer_pct ?? 1.5);
  const minBullish = Number(params?.min_turn_bullish_pct ?? 0.5);
  const byTicker = await loadDaily(db, Math.max(lookback + 30, 90));
  const matches: any[] = [];

  for (const [ticker, rows] of byTicker) {
    if (rows.length < lookback + 10) continue;
    const prev = rows.slice(-lookback);
    const supportLine = Math.min(...prev.map((r) => r.low));
    const current = rows[rows.length - 1];
    const prevDay = rows[rows.length - 2];
    if (!current || !prevDay) continue;

    const nearSupport = current.low <= supportLine * (1 + supportBuffer / 100);
    const bullishReversal = current.close > prevDay.close && current.close > supportLine * (1 + minBullish / 100);
    const shortTrend = current.close > prev[0].close;
    const avgTrend =
      prev.slice(-5).reduce((sum, r) => sum + r.close, 0) / 5 >
      prev.slice(-10, -5).reduce((sum, r) => sum + r.close, 0) / 5;

    if (nearSupport && bullishReversal && shortTrend && avgTrend) {
      matches.push({
        ticker,
        trigger_date: current.date,
        details: {
          support_line: supportLine,
          close: current.close,
          volume: current.volume,
          bullish_pct: pct(current.close, supportLine),
          lookback_days: lookback,
        },
      });
    }
  }

  return writeResults(db, "support_touched_turn_bullish", matches);
}

export async function runScreener(db: SupabaseClient<any>, name: ScreenerName, params: any = {}) {
  switch (name) {
    case "ath_breakout":
      return athBreakout(db);
    case "monthly_ema20":
      return monthlyEma20(db);
    case "todays_breakout":
      return todaysBreakout(db, params);
    case "high_volume":
      return highVolume(db, params);
    case "sector_strength":
      return sectorStrength(db, params);
    case "support_touched_turn_bullish":
      return supportTouchedTurnBullish(db, params);
  }
}

export async function logRun(
  db: SupabaseClient<any>,
  jobName: string,
  fn: () => Promise<{ rows: number; failed?: string[] }>,
) {
  const { data: log } = await db
    .from("run_logs")
    .insert({ job_name: jobName, status: "running" })
    .select("id")
    .single();
  try {
    const res = await fn();
    await db
      .from("run_logs")
      .update({
        status: "success",
        rows_written: res.rows,
        failed_tickers: res.failed ?? [],
        finished_at: new Date().toISOString(),
      })
      .eq("id", log!.id);
    return res;
  } catch (err: any) {
    await db
      .from("run_logs")
      .update({ status: "failed", error: String(err?.message ?? err), finished_at: new Date().toISOString() })
      .eq("id", log!.id);
    throw err;
  }
}
