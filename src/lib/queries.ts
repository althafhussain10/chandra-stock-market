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
