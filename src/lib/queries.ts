import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useStocks() {
  return useQuery({
    queryKey: ["stocks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stocks")
        .select("ticker,name,sector,subsector,exchange,active")
        .order("ticker");
      if (error) throw error;
      return data;
    },
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ["app_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("key,value,updated_at");
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((r) => [r.key, r.value as any]));
    },
  });
}

export function useScreenerConfigs() {
  return useQuery({
    queryKey: ["screener_configs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("screener_configs").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });
}

export function useResults(screener: string) {
  return useQuery({
    queryKey: ["results", screener],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("screener_results")
        .select("ticker,trigger_date,details,created_at")
        .eq("screener_name", screener)
        .order("trigger_date", { ascending: false })
        .limit(600);
      if (error) throw error;
      return data;
    },
  });
}

export function useResultCounts() {
  return useQuery({
    queryKey: ["result_counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("screener_results")
        .select("screener_name,created_at")
        .limit(5000);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const r of data ?? []) counts[r.screener_name] = (counts[r.screener_name] ?? 0) + 1;
      return counts;
    },
  });
}

/** Latest stored close for every ticker, used for "% since trigger". */
export function useLatestPrices() {
  return useQuery({
    queryKey: ["latest_prices"],
    queryFn: async () => {
      const { data: last, error: e1 } = await supabase
        .from("daily_candles")
        .select("date")
        .order("date", { ascending: false })
        .limit(1);
      if (e1) throw e1;
      const date = last?.[0]?.date;
      if (!date) return { date: null as string | null, prices: {} as Record<string, number> };
      const { data, error } = await supabase
        .from("daily_candles")
        .select("ticker,close")
        .eq("date", date)
        .limit(1000);
      if (error) throw error;
      const prices: Record<string, number> = {};
      for (const r of data ?? []) prices[r.ticker] = Number(r.close);
      return { date, prices };
    },
  });
}

export type ChartTimeframe = "daily" | "weekly" | "monthly";

export function useChartCandles(ticker: string | null, timeframe: ChartTimeframe) {
  return useQuery({
    queryKey: ["chart_candles", ticker, timeframe],
    enabled: Boolean(ticker),
    queryFn: async () => {
      const table = timeframe === "daily" ? "daily_candles" : timeframe === "weekly" ? "weekly_candles" : "monthly_candles";
      const dateColumn = timeframe === "daily" ? "date" : timeframe === "weekly" ? "week_end_date" : "month_end_date";
      const { data, error } = await supabase
        .from(table)
        .select(`${dateColumn},open,high,low,close,volume`)
        .eq("ticker", ticker!)
        .order(dateColumn, { ascending: false })
        .limit(timeframe === "daily" ? 180 : timeframe === "weekly" ? 104 : 60);
      if (error) throw error;
      return [...(data ?? [])]
        .reverse()
        .map((row: any) => ({
          date: row[dateColumn],
          open: Number(row.open),
          high: Number(row.high),
          low: Number(row.low),
          close: Number(row.close),
          volume: Number(row.volume ?? 0),
        }))
        .filter((row) => row.date && [row.open, row.high, row.low, row.close].every(Number.isFinite));
    },
  });
}

export function useSectorChartCandles(sector: string | null, timeframe: ChartTimeframe) {
  return useQuery({
    queryKey: ["sector_chart_candles", sector, timeframe],
    enabled: Boolean(sector),
    queryFn: async () => {
      const table = timeframe === "daily" ? "daily_candles" : timeframe === "weekly" ? "weekly_candles" : "monthly_candles";
      const dateColumn = timeframe === "daily" ? "date" : timeframe === "weekly" ? "week_end_date" : "month_end_date";
      const { data: stocks, error: stockError } = await supabase.from("stocks").select("ticker").eq("sector", sector!);
      if (stockError) throw stockError;
      const tickers = (stocks ?? []).map((stock) => stock.ticker);
      if (!tickers.length) return [];
      const { data, error } = await supabase
        .from(table)
        .select(`ticker,${dateColumn},open,high,low,close,volume`)
        .in("ticker", tickers)
        .order(dateColumn, { ascending: true })
        .limit(5000);
      if (error) throw error;
      const grouped = new Map<string, any[]>();
      for (const row of data ?? []) {
        const date = row[dateColumn];
        const values = grouped.get(date) ?? [];
        values.push(row);
        grouped.set(date, values);
      }
      return [...grouped.entries()].map(([date, rows]) => ({
        date,
        open: rows.reduce((sum, row) => sum + Number(row.open), 0) / rows.length,
        high: Math.max(...rows.map((row) => Number(row.high))),
        low: Math.min(...rows.map((row) => Number(row.low))),
        close: rows.reduce((sum, row) => sum + Number(row.close), 0) / rows.length,
        volume: rows.reduce((sum, row) => sum + Number(row.volume ?? 0), 0),
      })).filter((row) => row.date && [row.open, row.high, row.low, row.close].every(Number.isFinite)).slice(-(timeframe === "daily" ? 180 : timeframe === "weekly" ? 104 : 60));
    },
  });
}

export const useDailyCandles = (ticker: string | null) => useChartCandles(ticker, "daily");

export function useWatchlist() {
  return useQuery({
    queryKey: ["watchlist"],
    queryFn: async () => {
      const { data, error } = await supabase.from("watchlist").select("ticker,added_at").order("added_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useFundamentals(statement: string) {
  return useQuery({
    queryKey: ["fundamentals", statement],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("fundamental_statements")
          .select("ticker,metrics,fiscal_year")
          .eq("statement_type", statement)
          .order("fiscal_year", { ascending: false })
          .limit(200);
        if (error) throw error;
        return (data ?? []).map((row) => ({
          ticker: row.ticker,
          fiscalYear: row.fiscal_year,
          metrics: row.metrics ?? {},
        }));
      } catch (error: any) {
        const message = String(error?.message ?? error ?? "");
        if (
          message.includes("fundamental_statements") ||
          message.includes("does not exist") ||
          message.includes("schema cache") ||
          message.includes("42P01")
        ) {
          return [];
        }
        throw error;
      }
    },
  });
}

export function useRunLogs(filters: { job?: string; from?: string; to?: string } = {}) {
  return useQuery({
    queryKey: ["run_logs", filters],
    queryFn: async () => {
      let q = supabase.from("run_logs").select("*").order("started_at", { ascending: false }).limit(200);
      if (filters.job && filters.job !== "all") q = q.eq("job_name", filters.job);
      if (filters.from) q = q.gte("started_at", filters.from);
      if (filters.to) q = q.lte("started_at", `${filters.to}T23:59:59`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}
