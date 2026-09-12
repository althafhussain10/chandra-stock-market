import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Database, FileClock, ListChecks, LogOut, Play, Star, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Brand } from "@/components/Brand";
import { RefreshButton } from "@/components/RefreshButton";
import { DataTable, type Column } from "@/components/DataTable";
import { SCREENER_TABS, fmtInt } from "@/lib/screener-meta";
import { runOneScreener } from "@/lib/data.functions";
import { useRunLogs, useScreenerConfigs, useSettings, useStocks, useWatchlist } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Chandra Screener Control Panel" },
      { name: "description", content: "Manage the stock universe, data refresh, screener settings and run logs." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Admin — Chandra Screener" },
      { property: "og:description", content: "Private control panel for the Chandra NSE screener." },
    ],
  }),
  component: AdminPage,
});

const SECTIONS = [
  { key: "universe", label: "Stock Universe", icon: Database },
  { key: "data", label: "Data & Refresh", icon: Play },
  { key: "screeners", label: "Screener Config", icon: ListChecks },
  { key: "logs", label: "Logs", icon: FileClock },
  { key: "watchlist", label: "Watchlist Oversight", icon: Star },
] as const;

function AdminPage() {
  const [section, setSection] = useState<(typeof SECTIONS)[number]["key"]>("universe");
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { denied: false }, replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          <Brand />
        </div>
        <nav className="space-y-1 p-3">
          <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-admin">Admin</p>
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                section === s.key
                  ? "bg-admin/15 font-medium text-admin"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <s.icon className="size-4" /> {s.label}
            </button>
          ))}
          <div className="mt-6 border-t border-sidebar-border pt-3">
            <Link to="/" className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
              ← Back to dashboard
            </Link>
          </div>
        </nav>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-admin/40 bg-background/95 px-4 backdrop-blur">
          <span className="rounded bg-admin px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-admin-foreground">
            Admin
          </span>
          <span className="text-sm text-muted-foreground">Control panel</span>
          <div className="ml-auto flex items-center gap-2">
            <RefreshButton compact />
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
              <LogOut className="size-4" /> Sign out
            </Button>
          </div>
        </header>

        <div className="lg:hidden">
          <div className="flex gap-1 overflow-x-auto border-b border-border p-2">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-1.5 text-xs",
                  section === s.key ? "bg-admin/15 text-admin" : "text-muted-foreground",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 p-4">
          {section === "universe" && <UniverseSection />}
          {section === "data" && <DataSection />}
          {section === "screeners" && <ScreenerSection />}
          {section === "logs" && <LogsSection />}
          {section === "watchlist" && <WatchlistSection />}
        </div>
      </main>
    </div>
  );
}

function UniverseSection() {
  const stocks = useStocks();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ ticker: "", name: "", sector: "", subsector: "" });
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ["stocks"] });

  async function addStock(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("stocks").upsert({
      ticker: form.ticker.trim().toUpperCase(),
      name: form.name.trim() || form.ticker.trim().toUpperCase(),
      sector: form.sector.trim() || "Others",
      subsector: form.subsector.trim() || "Others",
    });
    if (error) return void toast.error(error.message);
    toast.success("Stock saved");
    setForm({ ticker: "", name: "", sector: "", subsector: "" });
    refresh();
  }

  async function uploadCsv(mode: "append" | "replace") {
    const lines = csv.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) return void toast.error("Paste CSV rows first");
    const rows = lines
      .filter((l) => !/^ticker\s*,/i.test(l))
      .map((l) => {
        const [ticker, name, sector, subsector, exchange] = l.split(",").map((x) => x?.trim() ?? "");
        return {
          ticker: (ticker ?? "").toUpperCase(),
          name: name || ticker || "",
          sector: sector || "Others",
          subsector: subsector || "Others",
          exchange: exchange || "NSE",
          active: true,
        };
      })
      .filter((r) => r.ticker);
    setBusy(true);
    try {
      if (mode === "replace") {
        const { error } = await supabase.from("stocks").delete().neq("ticker", "___none___");
        if (error) throw new Error(error.message);
      }
      const { error } = await supabase.from("stocks").upsert(rows, { onConflict: "ticker" });
      if (error) throw new Error(error.message);
      toast.success(`${rows.length} stocks ${mode === "replace" ? "replaced" : "added"}`);
      setCsv("");
      refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(ticker: string, active: boolean) {
    const { error } = await supabase.from("stocks").update({ active }).eq("ticker", ticker);
    if (error) return void toast.error(error.message);
    refresh();
  }

  async function remove(ticker: string) {
    const { error } = await supabase.from("stocks").delete().eq("ticker", ticker);
    if (error) return void toast.error(error.message);
    toast.success(`${ticker} deleted`);
    refresh();
  }

  const columns: Column<any>[] = [
    { key: "ticker", header: "Ticker", value: (r) => r.ticker, className: "num" },
    { key: "name", header: "Name", value: (r) => r.name },
    { key: "sector", header: "Sector", value: (r) => r.sector },
    { key: "sub", header: "Sub-sector", value: (r) => r.subsector },
    { key: "exch", header: "Exchange", value: (r) => r.exchange },
    {
      key: "active",
      header: "Active",
      align: "right",
      value: (r) => (r.active ? 1 : 0),
      render: (r) => <Switch checked={r.active} onCheckedChange={(v) => toggleActive(r.ticker, v)} />,
    },
    {
      key: "del",
      header: "",
      align: "right",
      value: () => "",
      render: (r) => (
        <button onClick={() => remove(r.ticker)} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="size-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader title="Stock Universe" subtitle={`${stocks.data?.length ?? 0} tickers. Inactive stocks are skipped by every screener.`} />
      <form onSubmit={addStock} className="terminal-panel grid gap-3 p-4 sm:grid-cols-5">
        {(["ticker", "name", "sector", "subsector"] as const).map((f) => (
          <div key={f} className="space-y-1.5">
            <Label className="text-xs capitalize">{f}</Label>
            <Input
              value={form[f]}
              onChange={(e) => setForm({ ...form, [f]: e.target.value })}
              placeholder={f === "ticker" ? "RELIANCE.NS" : ""}
              required={f === "ticker"}
            />
          </div>
        ))}
        <div className="flex items-end">
          <Button type="submit" className="w-full">
            Add / update
          </Button>
        </div>
      </form>

      <div className="terminal-panel space-y-3 p-4">
        <Label className="text-xs">Bulk CSV (ticker,name,sector,subsector,exchange)</Label>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={4}
          placeholder="RELIANCE.NS,Reliance Industries,Energy,Oil & Gas,NSE"
          className="num w-full rounded-md border border-input bg-background p-2 text-xs outline-none focus:ring-1 focus:ring-ring"
        />
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => uploadCsv("append")} className="gap-2">
            <Upload className="size-4" /> Append
          </Button>
          <Button size="sm" variant="destructive" disabled={busy} onClick={() => uploadCsv("replace")} className="gap-2">
            <Upload className="size-4" /> Replace all
          </Button>
        </div>
      </div>

      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter stocks…" className="max-w-xs" />
      {stocks.isLoading ? <Skeleton className="h-64 w-full" /> : <DataTable rows={stocks.data ?? []} columns={columns} search={search} />}
    </div>
  );
}

function DataSection() {
  const settings = useSettings();
  const logs = useRunLogs({ job: "daily_data_refresh" });
  const qc = useQueryClient();
  const auto = ((settings.data as any)?.["auto_refresh"] as any)?.enabled !== false;
  const lastRefresh = ((settings.data as any)?.["last_refresh"] as any)?.at as string | null;
  const lastRun = logs.data?.[0];
  const lastError = (logs.data ?? []).find((l: any) => l.status === "failed");

  async function toggleAuto(v: boolean) {
    const { error } = await supabase
      .from("app_settings")
      .update({ value: { enabled: v }, updated_at: new Date().toISOString() })
      .eq("key", "auto_refresh");
    if (error) return void toast.error(error.message);
    toast.success(v ? "Daily auto-refresh enabled" : "Daily auto-refresh paused");
    qc.invalidateQueries({ queryKey: ["app_settings"] });
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Data Source & Refresh" subtitle="Prices come from the Yahoo Finance public chart endpoint — no API key needed." />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="terminal-panel space-y-3 p-4">
          <h3 className="text-sm font-semibold">Source</h3>
          <p className="num break-all text-xs text-muted-foreground">
            https://query1.finance.yahoo.com/v8/finance/chart/&lt;TICKER&gt;?range=5y&amp;interval=1d
          </p>
          <p className="text-xs text-muted-foreground">
            If you later switch to a paid provider, its key is stored as an encrypted backend secret (never in a
            table) — ask in chat to swap providers and the key entry form will open.
          </p>
        </div>
        <div className="terminal-panel space-y-3 p-4">
          <h3 className="text-sm font-semibold">Schedule</h3>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Daily auto-refresh (3:35 PM IST)</span>
            <Switch checked={auto} onCheckedChange={toggleAuto} />
          </div>
          <div className="text-xs text-muted-foreground">
            Last successful refresh: <span className="num text-foreground">{lastRefresh ? new Date(lastRefresh).toLocaleString("en-IN") : "never"}</span>
          </div>
          <RefreshButton />
        </div>
      </div>

      <div className="terminal-panel space-y-2 p-4">
        <h3 className="text-sm font-semibold">Last data run</h3>
        {logs.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : lastRun ? (
          <div className="space-y-2 text-xs">
            <div className="num">
              {new Date(lastRun.started_at).toLocaleString("en-IN")} ·{" "}
              <span className={lastRun.status === "success" ? "text-up" : lastRun.status === "failed" ? "text-down" : "text-warn"}>
                {lastRun.status}
              </span>{" "}
              · {fmtInt(lastRun.rows_written)} rows
            </div>
            {lastRun.failed_tickers?.length > 0 && (
              <div className="text-muted-foreground">
                Failed tickers ({lastRun.failed_tickers.length}):{" "}
                <span className="num text-down">{lastRun.failed_tickers.join(", ")}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No data run recorded yet.</p>
        )}
        {lastError?.error && (
          <p className="rounded border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
            Last error: {lastError.error}
          </p>
        )}
      </div>
    </div>
  );
}

function ScreenerSection() {
  const configs = useScreenerConfigs();
  const qc = useQueryClient();
  const runOne = useServerFn(runOneScreener);
  const [running, setRunning] = useState<string | null>(null);

  async function update(name: string, patch: Record<string, unknown>) {
    const { error } = await supabase
      .from("screener_configs")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("name", name);
    if (error) return void toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["screener_configs"] });
  }

  async function run(name: string) {
    setRunning(name);
    try {
      const res: any = await runOne({ data: { name } });
      toast.success(`${name}: ${res.rows} matches`);
      await qc.invalidateQueries();
    } catch (err: any) {
      toast.error(err?.message ?? "Run failed");
    } finally {
      setRunning(null);
    }
  }

  const numericFields: Record<string, { key: string; label: string }[]> = {
    monthly_ema20: [{ key: "ema_period", label: "EMA period" }],
    high_volume: [{ key: "top_n", label: "Top N" }],
    sector_strength: [
      { key: "daily_months", label: "Daily window (months)" },
      { key: "weekly_months", label: "Weekly window (months)" },
      { key: "monthly_months", label: "Monthly window (months)" },
    ],
    support_touched_turn_bullish: [
      { key: "lookback_days", label: "Support lookback (days)" },
      { key: "support_buffer_pct", label: "Support buffer (%)" },
      { key: "min_turn_bullish_pct", label: "Bullish bounce (%)" },
    ],
  };

  return (
    <div className="space-y-4">
      <SectionHeader title="Screener Config" subtitle="Disable a screener to skip it on the next run, or trigger one on demand." />
      {configs.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="space-y-3">
          {(configs.data ?? []).map((c: any) => {
            const meta = SCREENER_TABS.find((t) => t.key === c.name);
            const params = (c.params ?? {}) as any;
            return (
              <div key={c.name} className="terminal-panel space-y-3 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold">{c.label}</h3>
                    <p className="text-xs text-muted-foreground">{meta?.blurb}</p>
                  </div>
                  <Switch checked={c.enabled} onCheckedChange={(v) => update(c.name, { enabled: v })} />
                  <Button size="sm" variant="secondary" disabled={running === c.name} onClick={() => run(c.name)} className="gap-2">
                    <Play className="size-3.5" /> {running === c.name ? "Running…" : "Run now"}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {(numericFields[c.name] ?? []).map((f) => (
                    <div key={f.key} className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">{f.label}</Label>
                      <Input
                        type="number"
                        className="num h-8 w-32"
                        defaultValue={params[f.key] ?? ""}
                        onBlur={(e) => update(c.name, { params: { ...params, [f.key]: Number(e.target.value) } })}
                      />
                    </div>
                  ))}
                  {c.name === "todays_breakout" && (
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Breakout lookbacks (days, comma separated)</Label>
                      <Input
                        className="num h-8 w-48"
                        defaultValue={(params.lookbacks ?? [5, 20, 60]).join(",")}
                        onBlur={(e) =>
                          update(c.name, {
                            params: {
                              ...params,
                              lookbacks: e.target.value
                                .split(",")
                                .map((x) => Number(x.trim()))
                                .filter((n) => n > 0),
                            },
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LogsSection() {
  const [job, setJob] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const logs = useRunLogs({ job, from, to });

  const columns: Column<any>[] = [
    { key: "job", header: "Job", value: (r) => r.job_name },
    { key: "when", header: "Started", value: (r) => r.started_at, render: (r) => <span className="num">{new Date(r.started_at).toLocaleString("en-IN")}</span> },
    {
      key: "status",
      header: "Status",
      value: (r) => r.status,
      render: (r) => (
        <span className={cn("num text-xs", r.status === "success" ? "text-up" : r.status === "failed" ? "text-down" : "text-warn")}>
          {r.status}
        </span>
      ),
    },
    { key: "rows", header: "Rows", align: "right", numeric: true, value: (r) => r.rows_written },
    { key: "err", header: "Error", value: (r) => r.error ?? "", render: (r) => <span className="text-xs text-down">{r.error ?? "—"}</span> },
  ];

  const jobs = useMemo(() => ["all", "daily_data_refresh", ...SCREENER_TABS.map((t) => t.key)], []);

  return (
    <div className="space-y-4">
      <SectionHeader title="Run Logs" subtitle="Every data refresh and screener execution." />
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Job</Label>
          <select
            value={job}
            onChange={(e) => setJob(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            {jobs.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-40" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-40" />
        </div>
      </div>
      {logs.isLoading ? <Skeleton className="h-64 w-full" /> : <DataTable rows={logs.data ?? []} columns={columns} />}
    </div>
  );
}

function WatchlistSection() {
  const watchlist = useWatchlist();
  const qc = useQueryClient();
  const columns: Column<any>[] = [
    { key: "ticker", header: "Ticker", value: (r) => r.ticker, className: "num" },
    { key: "added", header: "Added", value: (r) => r.added_at, render: (r) => <span className="num">{new Date(r.added_at).toLocaleString("en-IN")}</span> },
    {
      key: "del",
      header: "",
      align: "right",
      value: () => "",
      render: (r) => (
        <button
          className="text-muted-foreground hover:text-destructive"
          onClick={async () => {
            await supabase.from("watchlist").delete().eq("ticker", r.ticker);
            qc.invalidateQueries({ queryKey: ["watchlist"] });
          }}
        >
          <Trash2 className="size-4" />
        </button>
      ),
    },
  ];
  return (
    <div className="space-y-4">
      <SectionHeader title="Watchlist Oversight" subtitle="Every starred ticker across the app." />
      {watchlist.isLoading ? <Skeleton className="h-40 w-full" /> : <DataTable rows={watchlist.data ?? []} columns={columns} />}
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}
