import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Lock, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brand } from "@/components/Brand";
import { adminExists, bootstrapAdmin } from "@/lib/data.functions";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ denied: s['denied'] === true || s['denied'] === "true" }),
  head: () => ({
    meta: [
      { title: "Admin Sign In — Chandra Screener" },
      { name: "description", content: "Private admin sign-in for the Chandra NSE stock screener dashboard." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Admin Sign In — Chandra Screener" },
      { property: "og:description", content: "Private admin access to screener configuration and data refresh." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { denied } = Route.useSearch();
  const check = useServerFn(adminExists);
  const bootstrap = useServerFn(bootstrapAdmin);
  const existing = useQuery({ queryKey: ["admin_exists"], queryFn: () => check({}) });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const setupMode = existing.data?.exists === false;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (setupMode) {
        await bootstrap({ data: { email, password } });
        toast.success("Admin account created. Signing you in…");
        await existing.refetch();
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      navigate({ to: "/admin", replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="terminal-panel w-full max-w-sm p-6">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Brand className="h-8" />
          <span className="rounded bg-admin/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-admin">
            Admin
          </span>
        </div>
        {denied && (
          <p className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
            <ShieldAlert className="mt-0.5 size-3.5 shrink-0" /> That account doesn't have admin access.
          </p>
        )}
        <h1 className="mb-1 text-base font-semibold">{setupMode ? "Create the admin account" : "Admin sign in"}</h1>
        <p className="mb-5 text-xs text-muted-foreground">
          {setupMode
            ? "This is a one-time setup. Afterwards sign-up is closed permanently."
            : "Only the admin account can reach this area."}
        </p>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs">
              Email
            </Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full gap-2" disabled={busy || existing.isLoading}>
            <Lock className="size-4" />
            {busy ? "Working…" : setupMode ? "Create admin & sign in" : "Sign in"}
          </Button>
        </form>
      </div>
    </main>
  );
}
