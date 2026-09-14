import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { refreshChunk, runAllScreeners, seedUniverse } from "@/lib/data.functions";

const CHUNK = 20;

export function RefreshButton({ compact = false }: { compact?: boolean }) {
  const seed = useServerFn(seedUniverse);
  const chunk = useServerFn(refreshChunk);
  const screeners = useServerFn(runAllScreeners);
  const qc = useQueryClient();
  const [progress, setProgress] = useState<string | null>(null);

  async function run() {
    setProgress("starting…");
    try {
      await seed({});
      let offset = 0;
      let total = Infinity;
      const failed: string[] = [];
      const failureReasons: string[] = [];
      while (offset < total) {
        const res: any = await chunk({ data: { offset, limit: CHUNK } });
        total = res.total ?? 0;
        failed.push(...(res.failed ?? []));
        failureReasons.push(...(res.failures ?? []));
        offset += CHUNK;
        setProgress(`prices ${Math.min(offset, total)}/${total}`);
      }
      setProgress("running screeners…");
      await screeners({});
      await qc.invalidateQueries();
      toast.success(
        failed.length
          ? `Refresh done — ${failed.length} tickers failed${failureReasons[0] ? `: ${failureReasons[0]}` : ""}`
          : "Data refreshed and screeners updated",
      );
    } catch (err: any) {
      const msg = String(
        err?.message ??
          err?.cause?.message ??
          err?.data?.message ??
          err?.data?.error ??
          (typeof err === "string" ? err : ""),
      );
      if (msg.includes("Admin access") || msg.includes("Unauthorized") || err?.status === 401) {
        toast.error("Sign in as the admin to refresh market data.");
      } else {
        toast.error(msg || "Refresh failed. Check Admin > Data & Refresh > Logs for details.");
      }
    } finally {
      setProgress(null);
    }

  }

  const busy = progress !== null;
  return (
    <Button size="sm" variant="default" onClick={run} disabled={busy} className="gap-2">
      <RefreshCw className={busy ? "size-4 animate-spin" : "size-4"} />
      <span className={compact ? "hidden sm:inline" : ""}>{busy ? progress : "Refresh Data"}</span>
    </Button>
  );
}
