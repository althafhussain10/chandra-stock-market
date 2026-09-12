import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Star, ShieldAlert, Menu, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Brand } from "@/components/Brand";
import { RefreshButton } from "@/components/RefreshButton";
import { DataTable, type Column } from "@/components/DataTable";
import {
  FUNDAMENTAL_TABS,
  SCREENER_TABS,
  fmtInt,
  fmtNum,
  type FundamentalKey,
  type ScreenerKey,
} from "@/lib/screener-meta";
import {
  useFundamentals,
  useLatestPrices,
  useResultCounts,
  useResults,
  useSettings,
  useStocks,
  useWatchlist,
} from "@/lib/queries";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Chandra — NSE Nifty 500 Stock Screener Dashboard" },
      {
        name: "description",
        content:
          "Daily NSE Nifty 500 screeners: all-time-high breakouts, monthly EMA20 breakouts, 5/20/60-day breakouts, volume leaders and sector strength.",
      },
      { property: "og:title", content: "Chandra — NSE Nifty 500 Stock Screener" },
      {
        property: "og:description",
        content: "Trading-terminal dashboard for daily NSE breakout, volume and sector-strength screeners.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

type TabKey = ScreenerKey | FundamentalKey | "watchlist";

const FUNDAMENTAL_DATA = {
  profit_loss: [
    {
      ticker: "RELIANCE",
      name: "Reliance Industries",
      sector: "Energy",
      revenue: 276400,
      ebitda: 44800,
      operatingProfit: 36750,
      netProfit: 21440,
      margin: 18.4,
      growth: 11.2,
    },
    {
      ticker: "TCS",
      name: "Tata Consultancy Services",
      sector: "IT",
      revenue: 186420,
      ebitda: 48520,
      operatingProfit: 43360,
      netProfit: 35210,
      margin: 24.8,
      growth: 9.6,
    },
    {
      ticker: "HDFCBANK",
      name: "HDFC Bank",
      sector: "Financial Services",
      revenue: 108350,
      ebitda: 33210,
      operatingProfit: 31840,
      netProfit: 24680,
      margin: 31.4,
      growth: 13.7,
    },
    {
      ticker: "INFY",
      name: "Infosys",
      sector: "IT",
      revenue: 164480,
      ebitda: 44660,
      operatingProfit: 41010,
      netProfit: 31980,
      margin: 26.7,
      growth: 8.9,
    },
    {
      ticker: "ICICIBANK",
      name: "ICICI Bank",
      sector: "Financial Services",
      revenue: 98960,
      ebitda: 30120,
      operatingProfit: 28740,
      netProfit: 21810,
      margin: 29.5,
      growth: 12.4,
    },
  ],
  balance_sheet: [
    {
      ticker: "RELIANCE",
      name: "Reliance Industries",
      sector: "Energy",
      totalAssets: 728600,
      totalEquity: 374200,
      debt: 126400,
      cash: 28800,
      currentRatio: 1.62,
      netDebtToEbitda: 1.8,
    },
    {
      ticker: "TCS",
      name: "Tata Consultancy Services",
      sector: "IT",
      totalAssets: 214500,
      totalEquity: 142900,
      debt: 18060,
      cash: 24200,
      currentRatio: 2.97,
      netDebtToEbitda: 0.3,
    },
    {
      ticker: "HDFCBANK",
      name: "HDFC Bank",
      sector: "Financial Services",
      totalAssets: 3124000,
      totalEquity: 297700,
      debt: 420300,
      cash: 274500,
      currentRatio: 0.94,
      netDebtToEbitda: 4.1,
    },
    {
      ticker: "INFY",
      name: "Infosys",
      sector: "IT",
      totalAssets: 161200,
      totalEquity: 104700,
      debt: 10400,
      cash: 19750,
      currentRatio: 2.36,
      netDebtToEbitda: 0.2,
    },
    {
      ticker: "ICICIBANK",
      name: "ICICI Bank",
      sector: "Financial Services",
      totalAssets: 2436200,
      totalEquity: 262850,
      debt: 335000,
      cash: 226000,
      currentRatio: 1.12,
      netDebtToEbitda: 3.6,
    },
  ],
  cash_flow: [
    {
      ticker: "RELIANCE",
      name: "Reliance Industries",
      sector: "Energy",
      operatingCashFlow: 29120,
      investingCashFlow: -16650,
      financingCashFlow: -11380,
      freeCashFlow: 17210,
      capex: 12740,
      netCashFlow: 1090,
      cfoMargin: 22.9,
    },
    {
      ticker: "TCS",
      name: "Tata Consultancy Services",
      sector: "IT",
      operatingCashFlow: 38740,
      investingCashFlow: -5420,
      financingCashFlow: -26110,
      freeCashFlow: 29110,
      capex: 4100,
      netCashFlow: 7210,
      cfoMargin: 28.1,
    },
    {
      ticker: "HDFCBANK",
      name: "HDFC Bank",
      sector: "Financial Services",
      operatingCashFlow: 25560,
      investingCashFlow: -1980,
      financingCashFlow: -21490,
      freeCashFlow: 23360,
      capex: 2200,
      netCashFlow: 2090,
      cfoMargin: 29.7,
    },
    {
      ticker: "INFY",
      name: "Infosys",
      sector: "IT",
      operatingCashFlow: 33140,
      investingCashFlow: -3810,
      financingCashFlow: -24420,
      freeCashFlow: 28290,
      capex: 4300,
      netCashFlow: 4910,
      cfoMargin: 26.4,
    },
    {
      ticker: "ICICIBANK",
      name: "ICICI Bank",
      sector: "Financial Services",
      operatingCashFlow: 21930,
      investingCashFlow: -1470,
      financingCashFlow: -16610,
      freeCashFlow: 19140,
      capex: 2790,
      netCashFlow: 3850,
      cfoMargin: 27.8,
    },
  ],
} as const;

function Dashboard() {
  const [tab, setTab] = useState<TabKey>("ath_breakout");
  const [search, setSearch] = useState("");
  const [navOpen, setNavOpen] = useState(false);

  const settings = useSettings();
  const counts = useResultCounts();
  const stocks = useStocks();
  const watchlist = useWatchlist();
  const prices = useLatestPrices();
  const qc = useQueryClient();

  const starred = new Set((watchlist.data ?? []).map((w) => w.ticker));
  const nameOf = useMemo(
    () => Object.fromEntries((stocks.data ?? []).map((s) => [s.ticker, s])),
    [stocks.data],
  );

  async function toggleStar(ticker: string) {
    if (starred.has(ticker)) {
      const { error } = await supabase.from("watchlist").delete().eq("ticker", ticker);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(`${ticker} removed from watchlist`);
    } else {
      const { error } = await supabase.from("watchlist").insert({ ticker });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(`${ticker} added to watchlist`);
    }
    qc.invalidateQueries({ queryKey: ["watchlist"] });
  }

  const lastRefresh = ((settings.data as any)?.['last_refresh'])?.at as string | null | undefined;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 shrink-0 border-r border-sidebar-border bg-sidebar transition-transform lg:static lg:translate-x-0",
          navOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          <Brand />
        </div>
        <nav className="flex flex-col gap-1 p-3">
          <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Screeners
          </p>
          {SCREENER_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                setNavOpen(false);
              }}
              className={cn(
                "flex items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors",
                tab === t.key
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <span className="truncate pr-2">{t.label}</span>
              <span className="num rounded bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">
                {counts.data?.[t.key] ?? 0}
              </span>
            </button>
          ))}
          <p className="px-2 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Fundamentals
          </p>
          {FUNDAMENTAL_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                setNavOpen(false);
              }}
              className={cn(
                "flex items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors",
                tab === t.key
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <span className="truncate pr-2">{t.label}</span>
              <span className="num rounded bg-emerald/15 px-1.5 py-0.5 text-[10px] text-emerald-400">
                {FUNDAMENTAL_DATA[t.key].length}
              </span>
            </button>
          ))}
          <p className="px-2 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Saved
          </p>
          <button
            onClick={() => {
              setTab("watchlist");
              setNavOpen(false);
            }}
            className={cn(
              "flex items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors",
              tab === "watchlist"
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <span className="flex items-center gap-2">
              <Star className="size-3.5" /> Watchlist
            </span>
            <span className="num rounded bg-warn/15 px-1.5 py-0.5 text-[10px] text-warn">
              {watchlist.data?.length ?? 0}
            </span>
          </button>
          <div className="mt-6 border-t border-sidebar-border pt-3">
            <Link
              to="/admin"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-admin/10 hover:text-admin"
            >
              <ShieldAlert className="size-4" /> Admin panel
            </Link>
          </div>
        </nav>
      </aside>

      {navOpen && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-background/70 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setNavOpen(true)}>
            <Menu className="size-5" />
          </Button>
          <div className="hidden text-xs text-muted-foreground sm:block">
            Last refresh:{" "}
            <span className="num text-foreground">
              {lastRefresh ? new Date(lastRefresh).toLocaleString("en-IN") : "never"}
            </span>
            {prices.data?.date && <span className="num ml-3">data through {prices.data.date}</span>}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ticker…"
                className="h-9 w-36 pl-8 text-sm sm:w-56"
              />
            </div>
            <RefreshButton compact />
          </div>
        </header>

        <div className="flex-1 space-y-4 p-4">
          {tab === "watchlist" ? (
            <WatchlistPanel
              tickers={(watchlist.data ?? []).map((w) => w.ticker)}
              loading={watchlist.isLoading}
              nameOf={nameOf}
              prices={prices.data?.prices ?? {}}
              search={search}
              onStar={toggleStar}
            />
          ) : tab === "profit_loss" || tab === "balance_sheet" || tab === "cash_flow" ? (
            <FundamentalPanel statement={tab} search={search} nameOf={nameOf} />
          ) : (
            <ScreenerPanel
              screener={tab}
              search={search}
              starred={starred}
              onStar={toggleStar}
              nameOf={nameOf}
              prices={prices.data?.prices ?? {}}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function Pct({ value }: { value: number | null | undefined }) {
  if (value == null || Number.isNaN(Number(value))) return <span className="num text-muted-foreground">—</span>;
  const v = Number(value);
  return (
    <span className={cn("num inline-flex items-center gap-1", v >= 0 ? "text-up" : "text-down")}>
      {v >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {v >= 0 ? "+" : ""}
      {fmtNum(v)}%
    </span>
  );
}

type ResultRow = { ticker: string; trigger_date: string; details: any; created_at: string };

function ScreenerPanel({
  screener,
  search,
  starred,
  onStar,
  nameOf,
  prices,
}: {
  screener: ScreenerKey;
  search: string;
  starred: Set<string>;
  onStar: (t: string) => void;
  nameOf: Record<string, any>;
  prices: Record<string, number>;
}) {
  const meta = SCREENER_TABS.find((t) => t.key === screener)!;
  const { data, isLoading, error } = useResults(screener);
  const rows = (data ?? []) as ResultRow[];

  const starCol: Column<ResultRow> = {
    key: "star",
    header: "",
    value: (r) => (starred.has(r.ticker) ? 1 : 0),
    render: (r) => (
      <button
        onClick={() => onStar(r.ticker)}
        aria-label="Toggle watchlist"
        className="transition-colors hover:text-warn"
      >
        <Star className={cn("size-4", starred.has(r.ticker) ? "fill-warn text-warn" : "text-muted-foreground")} />
      </button>
    ),
  };
  const tickerCol: Column<ResultRow> = {
    key: "ticker",
    header: "Ticker",
    value: (r) => r.ticker,
    render: (r) => (
      <div className="flex flex-col">
        <span className="num font-medium">{r.ticker.replace(".NS", "")}</span>
        <span className="text-[10px] text-muted-foreground">{nameOf[r.ticker]?.sector ?? ""}</span>
      </div>
    ),
  };
  const sinceCol: Column<ResultRow> = {
    key: "since",
    header: "% Since Trigger",
    align: "right",
    numeric: true,
    value: (r) => {
      const t = Number(r.details?.trigger_close);
      const p = prices[r.ticker];
      return t && p ? ((p - t) / t) * 100 : null;
    },
    render: (r) => {
      const t = Number(r.details?.trigger_close);
      const p = prices[r.ticker];
      return <Pct value={t && p ? ((p - t) / t) * 100 : null} />;
    },
  };
  const dateCol: Column<ResultRow> = {
    key: "date",
    header: "Trigger Date",
    align: "right",
    numeric: true,
    value: (r) => r.trigger_date,
  };

  let columns: Column<ResultRow>[] = [];
  if (screener === "ath_breakout") {
    columns = [
      starCol,
      tickerCol,
      { key: "close", header: "Close", align: "right", numeric: true, value: (r) => Number(r.details?.trigger_close), render: (r) => fmtNum(r.details?.trigger_close) },
      { key: "ath", header: "Prev ATH", align: "right", numeric: true, value: (r) => Number(r.details?.prev_ath), render: (r) => fmtNum(r.details?.prev_ath) },
      { key: "bo", header: "Above ATH", align: "right", numeric: true, value: (r) => Number(r.details?.breakout_pct), render: (r) => <Pct value={r.details?.breakout_pct} /> },
      dateCol,
      sinceCol,
    ];
  } else if (screener === "monthly_ema20") {
    columns = [
      starCol,
      tickerCol,
      { key: "ema", header: "Monthly EMA20", align: "right", numeric: true, value: (r) => Number(r.details?.monthly_ema20), render: (r) => fmtNum(r.details?.monthly_ema20) },
      { key: "lmh", header: "Last Mth High", align: "right", numeric: true, value: (r) => Number(r.details?.last_month_high), render: (r) => fmtNum(r.details?.last_month_high) },
      { key: "d1", header: "Date 1", align: "right", numeric: true, value: (r) => r.details?.date1 ?? "" },
      { key: "d2", header: "Date 2", align: "right", numeric: true, value: (r) => r.details?.date2 ?? "" },
      { key: "stl", header: "STL Hit", align: "right", numeric: true, value: (r) => r.details?.stl_hit ?? "" },
      { key: "ret", header: "Return", align: "right", numeric: true, value: (r) => Number(r.details?.return_pct), render: (r) => <Pct value={r.details?.return_pct} /> },
      dateCol,
    ];
  } else if (screener === "todays_breakout") {
    columns = [
      starCol,
      tickerCol,
      { key: "close", header: "Close", align: "right", numeric: true, value: (r) => Number(r.details?.trigger_close), render: (r) => fmtNum(r.details?.trigger_close) },
      { key: "h5", header: "5D High", align: "right", numeric: true, value: (r) => Number(r.details?.high_5d), render: (r) => fmtNum(r.details?.high_5d) },
      { key: "h20", header: "20D High", align: "right", numeric: true, value: (r) => Number(r.details?.high_20d), render: (r) => fmtNum(r.details?.high_20d) },
      { key: "h60", header: "60D High", align: "right", numeric: true, value: (r) => Number(r.details?.high_60d), render: (r) => fmtNum(r.details?.high_60d) },
      { key: "vol", header: "Volume", align: "right", numeric: true, value: (r) => Number(r.details?.volume), render: (r) => fmtInt(r.details?.volume) },
      dateCol,
      sinceCol,
    ];
  } else if (screener === "high_volume") {
    columns = [
      starCol,
      { key: "rank", header: "#", align: "right", numeric: true, value: (r) => Number(r.details?.rank) },
      tickerCol,
      { key: "vol", header: "Volume", align: "right", numeric: true, value: (r) => Number(r.details?.volume), render: (r) => fmtInt(r.details?.volume) },
      { key: "avg", header: "20D Avg Vol", align: "right", numeric: true, value: (r) => Number(r.details?.avg_volume_20d), render: (r) => fmtInt(r.details?.avg_volume_20d) },
      { key: "x", header: "× Avg", align: "right", numeric: true, value: (r) => Number(r.details?.volume_x_avg), render: (r) => `${fmtNum(r.details?.volume_x_avg)}×` },
      { key: "close", header: "Close", align: "right", numeric: true, value: (r) => Number(r.details?.trigger_close), render: (r) => fmtNum(r.details?.trigger_close) },
      dateCol,
    ];
  } else {
    columns = [
      { key: "rank", header: "#", align: "right", numeric: true, value: (r) => Number(r.details?.rank) },
      { key: "sector", header: "Sector", value: (r) => r.details?.sector ?? "" },
      { key: "sub", header: "Sub-sector", value: (r) => r.details?.subsector ?? "" },
      { key: "n", header: "Stocks", align: "right", numeric: true, value: (r) => Number(r.details?.stocks) },
      { key: "d3", header: "3M (daily)", align: "right", numeric: true, value: (r) => Number(r.details?.daily_3m), render: (r) => <Pct value={r.details?.daily_3m} /> },
      { key: "w3", header: "3M (weekly)", align: "right", numeric: true, value: (r) => Number(r.details?.weekly_3m), render: (r) => <Pct value={r.details?.weekly_3m} /> },
      { key: "m6", header: "6M (monthly)", align: "right", numeric: true, value: (r) => Number(r.details?.monthly_6m), render: (r) => <Pct value={r.details?.monthly_6m} /> },
      { key: "wk", header: "This Week", align: "right", numeric: true, value: (r) => Number(r.details?.week_change), render: (r) => <Pct value={r.details?.week_change} /> },
      {
        key: "flip",
        header: "Trend",
        align: "right",
        value: (r) => (r.details?.turning_bullish ? "Turning bullish" : ""),
        render: (r) =>
          r.details?.turning_bullish ? (
            <span className="rounded bg-up/15 px-1.5 py-0.5 text-[10px] font-medium text-up">TURNING BULLISH</span>
          ) : (
            <span className="text-[10px] text-muted-foreground">—</span>
          ),
      },
    ];
  }

  return (
    <section className="space-y-3">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{meta.label}</h1>
        <p className="text-xs text-muted-foreground">{meta.blurb}</p>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="terminal-panel border-destructive/40 p-4 text-sm text-destructive">
          Couldn't load results: {(error as any).message}
        </div>
      ) : (
        <DataTable
          rows={rows}
          columns={columns}
          search={search}
          initialSort={{ key: screener === "sector_strength" || screener === "high_volume" ? "rank" : "date", dir: screener === "sector_strength" || screener === "high_volume" ? "asc" : "desc" }}
          emptyLabel="No matches yet — hit Refresh Data to run the screeners."
        />
      )}
    </section>
  );
}

function FundamentalPanel({
  statement,
  search,
  nameOf,
}: {
  statement: FundamentalKey;
  search: string;
  nameOf: Record<string, any>;
}) {
  const meta = FUNDAMENTAL_TABS.find((t) => t.key === statement)!;
  const { data, isLoading, error } = useFundamentals(statement);
  const fallbackRows = FUNDAMENTAL_DATA[statement] as Array<Record<string, any>>;
  const rows = (data ?? fallbackRows).map((row) => ({
    ...row.metrics,
    ticker: row.ticker,
    sector: nameOf[row.ticker]?.sector ?? row.sector ?? "",
    name: nameOf[row.ticker]?.name ?? row.name ?? "",
  }));

  const money = (value: number | null | undefined) =>
    value == null || Number.isNaN(Number(value)) ? "—" : `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })} Cr`;

  const shareCols: Column<any>[] =
    statement === "profit_loss"
      ? [
          { key: "ticker", header: "Ticker", value: (r) => r.ticker, render: (r) => <span className="num font-medium">{r.ticker}</span> },
          { key: "sector", header: "Sector", value: (r) => r.sector },
          { key: "revenue", header: "Revenue", align: "right", numeric: true, value: (r) => Number(r.revenue), render: (r) => money(r.revenue) },
          { key: "ebitda", header: "EBITDA", align: "right", numeric: true, value: (r) => Number(r.ebitda), render: (r) => money(r.ebitda) },
          { key: "operatingProfit", header: "Operating Profit", align: "right", numeric: true, value: (r) => Number(r.operatingProfit), render: (r) => money(r.operatingProfit) },
          { key: "netProfit", header: "Net Profit", align: "right", numeric: true, value: (r) => Number(r.netProfit), render: (r) => money(r.netProfit) },
          { key: "margin", header: "EBITDA Margin", align: "right", numeric: true, value: (r) => Number(r.margin), render: (r) => <Pct value={r.margin} /> },
          { key: "growth", header: "YoY Growth", align: "right", numeric: true, value: (r) => Number(r.growth), render: (r) => <Pct value={r.growth} /> },
        ]
      : statement === "balance_sheet"
        ? [
            { key: "ticker", header: "Ticker", value: (r) => r.ticker, render: (r) => <span className="num font-medium">{r.ticker}</span> },
            { key: "sector", header: "Sector", value: (r) => r.sector },
            { key: "totalAssets", header: "Total Assets", align: "right", numeric: true, value: (r) => Number(r.totalAssets), render: (r) => money(r.totalAssets) },
            { key: "totalEquity", header: "Equity", align: "right", numeric: true, value: (r) => Number(r.totalEquity), render: (r) => money(r.totalEquity) },
            { key: "debt", header: "Debt", align: "right", numeric: true, value: (r) => Number(r.debt), render: (r) => money(r.debt) },
            { key: "cash", header: "Cash", align: "right", numeric: true, value: (r) => Number(r.cash), render: (r) => money(r.cash) },
            { key: "currentRatio", header: "Current Ratio", align: "right", numeric: true, value: (r) => Number(r.currentRatio), render: (r) => fmtNum(r.currentRatio, 2) },
            { key: "netDebtToEbitda", header: "Net Debt / EBITDA", align: "right", numeric: true, value: (r) => Number(r.netDebtToEbitda), render: (r) => fmtNum(r.netDebtToEbitda, 1) },
          ]
        : [
            { key: "ticker", header: "Ticker", value: (r) => r.ticker, render: (r) => <span className="num font-medium">{r.ticker}</span> },
            { key: "sector", header: "Sector", value: (r) => r.sector },
            { key: "operatingCashFlow", header: "Operating CFO", align: "right", numeric: true, value: (r) => Number(r.operatingCashFlow), render: (r) => money(r.operatingCashFlow) },
            { key: "investingCashFlow", header: "Investing CF", align: "right", numeric: true, value: (r) => Number(r.investingCashFlow), render: (r) => money(r.investingCashFlow) },
            { key: "financingCashFlow", header: "Financing CF", align: "right", numeric: true, value: (r) => Number(r.financingCashFlow), render: (r) => money(r.financingCashFlow) },
            { key: "freeCashFlow", header: "Free Cash Flow", align: "right", numeric: true, value: (r) => Number(r.freeCashFlow), render: (r) => money(r.freeCashFlow) },
            { key: "capex", header: "Capex", align: "right", numeric: true, value: (r) => Number(r.capex), render: (r) => money(r.capex) },
            { key: "cfoMargin", header: "CFO Margin", align: "right", numeric: true, value: (r) => Number(r.cfoMargin), render: (r) => <Pct value={r.cfoMargin} /> },
          ];

  const initialSortKey =
    statement === "profit_loss" ? "netProfit" : statement === "balance_sheet" ? "totalAssets" : "freeCashFlow";

  return (
    <section className="space-y-3">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{meta.label}</h1>
        <p className="text-xs text-muted-foreground">{meta.blurb}</p>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="terminal-panel border-destructive/40 p-4 text-sm text-destructive">
          Couldn't load fundamentals: {(error as any).message}
        </div>
      ) : (
        <DataTable
          rows={rows}
          columns={shareCols}
          search={search}
          initialSort={{ key: initialSortKey, dir: "desc" }}
          emptyLabel="No fundamentals found for the current filters."
        />
      )}
    </section>
  );
}

function WatchlistPanel({
  tickers,
  loading,
  nameOf,
  prices,
  search,
  onStar,
}: {
  tickers: string[];
  loading: boolean;
  nameOf: Record<string, any>;
  prices: Record<string, number>;
  search: string;
  onStar: (t: string) => void;
}) {
  const rows = tickers.map((t) => ({ ticker: t, ...(nameOf[t] ?? {}), close: prices[t] }));
  const columns: Column<any>[] = [
    {
      key: "star",
      header: "",
      value: () => 1,
      render: (r) => (
        <button onClick={() => onStar(r.ticker)} aria-label="Remove" className="hover:text-down">
          <Star className="size-4 fill-warn text-warn" />
        </button>
      ),
    },
    { key: "ticker", header: "Ticker", value: (r) => r.ticker, render: (r) => <span className="num font-medium">{r.ticker.replace(".NS", "")}</span> },
    { key: "sector", header: "Sector", value: (r) => r.sector ?? "" },
    { key: "sub", header: "Sub-sector", value: (r) => r.subsector ?? "" },
    { key: "close", header: "Last Close", align: "right", numeric: true, value: (r) => Number(r.close), render: (r) => fmtNum(r.close) },
  ];
  return (
    <section className="space-y-3">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Watchlist</h1>
        <p className="text-xs text-muted-foreground">Stocks you starred across every screener.</p>
      </div>
      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <DataTable rows={rows} columns={columns} search={search} emptyLabel="Nothing starred yet." />
      )}
    </section>
  );
}