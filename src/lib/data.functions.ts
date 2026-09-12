import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function ensureUniverse(db: any) {
  const { count } = await db.from("stocks").select("ticker", { count: "exact", head: true });
  if ((count ?? 0) > 0) return 0;
  const { NIFTY_UNIVERSE } = await import("./nifty-universe");
  const rows = NIFTY_UNIVERSE.map((r) => ({ ...r, exchange: "NSE", active: true }));
  const { error } = await db.from("stocks").upsert(rows, { onConflict: "ticker" });
  if (error) throw new Error(error.message);
  return rows.length;
}

/** Seeds the stock universe if empty. Safe to call repeatedly. */
export const seedUniverse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
  await assertAdmin(context);
  const db = await admin();
  const inserted = await ensureUniverse(db);
  return { inserted };
  });

async function assertAdmin(context: any) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Admin access required to refresh data.");
}

/** Fetches prices for a slice of the universe. The client loops over slices. */
export const refreshChunk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { offset: number; limit: number }) => ({
    offset: Math.max(0, Number(d?.offset ?? 0)),
    limit: Math.min(40, Math.max(1, Number(d?.limit ?? 20))),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    await ensureUniverse(db);
    const { refreshMarketData } = await import("./pipeline.server");
    const { data: cfg } = await db
      .from("screener_configs")
      .select("params")
      .eq("name", "monthly_ema20")
      .maybeSingle();
    const res = await refreshMarketData(db, {
      emaPeriod: ((cfg?.params as any)?.ema_period as number) ?? 20,
      offset: data.offset,
      limit: data.limit,
    });
    return res;
  });

/** Runs every enabled screener and stamps the refresh timestamp. */
export const runAllScreeners = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
  await assertAdmin(context);
  const db = await admin();
  const { runScreener, logRun } = await import("./screeners.server");
  const { data: configs } = await db.from("screener_configs").select("*").order("sort_order");
  const out: Record<string, number | string> = {};
  for (const cfg of configs ?? []) {
    if (!cfg.enabled) {
      out[cfg.name] = "disabled";
      continue;
    }
    try {
      const res = await logRun(db, cfg.name, async () => ({
        rows: (await runScreener(db, cfg.name as any, cfg.params as any)) ?? 0,
      }));
      out[cfg.name] = res.rows;
    } catch (err: any) {
      out[cfg.name] = `error: ${err?.message ?? err}`;
    }
  }
  await db
    .from("app_settings")
    .upsert({ key: "last_refresh", value: { at: new Date().toISOString() }, updated_at: new Date().toISOString() });
  return out;
  });

/** Admin: run a single screener on demand. */
export const runOneScreener = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string }) => ({ name: String(d?.name ?? "") }))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const db = await admin();
    const { runScreener, logRun, SCREENERS } = await import("./screeners.server");
    if (!(SCREENERS as readonly string[]).includes(data.name)) throw new Error("Unknown screener");
    const { data: cfg } = await db
      .from("screener_configs")
      .select("params")
      .eq("name", data.name)
      .maybeSingle();
    const res = await logRun(db, data.name, async () => ({
      rows: (await runScreener(db, data.name as any, cfg?.params ?? {})) ?? 0,
    }));
    return res;
  });

/** One-time bootstrap: creates the single admin account when none exists. */
export const bootstrapAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; password: string }) => ({
    email: String(d?.email ?? "").trim().toLowerCase(),
    password: String(d?.password ?? ""),
  }))
  .handler(async ({ data }) => {
    const ADMIN_EMAIL = "chandrastockmarket@gmail.com";
    if (data.email !== ADMIN_EMAIL) throw new Error("This app has a single fixed admin address.");
    if (data.password.length < 8) throw new Error("Password must be at least 8 characters.");
    const db = await admin();
    const { count } = await db.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("An admin account already exists.");

    const { data: created, error } = await db.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    const { error: re } = await db.from("user_roles").insert({ user_id: created.user!.id, role: "admin" });
    if (re) throw new Error(re.message);
    return { ok: true };
  });

/** Whether an admin account has been created yet (drives the setup screen). */
export const adminExists = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  const { count } = await db.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
  return { exists: (count ?? 0) > 0 };
});
