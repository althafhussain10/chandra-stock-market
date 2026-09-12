import { createFileRoute } from "@tanstack/react-router";

/**
 * Scheduled daily refresh (pg_cron calls this after market close, 3:35 PM IST).
 * Honours the auto_refresh toggle in app_settings.
 */
export const Route = createFileRoute("/api/public/hooks/daily-refresh")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin;
        const { data: setting } = await db
          .from("app_settings")
          .select("value")
          .eq("key", "auto_refresh")
          .maybeSingle();
        if (setting && (setting.value as any)?.enabled === false) {
          return Response.json({ skipped: "auto refresh disabled" });
        }

        const { refreshMarketData } = await import("@/lib/pipeline.server");
        const { runScreener, logRun } = await import("@/lib/screeners.server");

        const result = await logRun(db, "daily_data_refresh", async () => {
          const r = await refreshMarketData(db);
          return { rows: r.rows, failed: r.failed };
        });

        const { data: configs } = await db.from("screener_configs").select("*").order("sort_order");
        for (const cfg of configs ?? []) {
          if (!cfg.enabled) continue;
          try {
            await logRun(db, cfg.name, async () => ({
              rows: (await runScreener(db, cfg.name as any, cfg.params as any)) ?? 0,
            }));
          } catch (err) {
            console.error("screener failed", cfg.name, err);
          }
        }

        await db.from("app_settings").upsert({
          key: "last_refresh",
          value: { at: new Date().toISOString() },
          updated_at: new Date().toISOString(),
        });

        return Response.json({ ok: true, rows: result.rows });
      },
    },
  },
});
