import { useEffect, useState } from "react";
import { CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Stats = {
  total_received: number;
  accepted_count: number;
  rejected_count: number;
  pending_count: number;
  countered_count: number;
  expired_count: number;
  withdrawn_count: number;
  acceptance_rate: number | null;
  avg_response_seconds: number | null;
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)} h`;
  const days = hours / 24;
  return `${Math.round(days)} j`;
}

type Props = {
  sellerId: string;
  variant?: "inline" | "card";
};

export function SellerStats({ sellerId, variant = "inline" }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // Cast as never until Lovable regenerates types.ts with the new RPC.
    supabase
      .rpc("get_seller_stats" as never, { _seller_id: sellerId } as never)
      .then(({ data }) => {
        if (cancelled) return;
        const row = (data as Stats[] | null)?.[0] ?? null;
        setStats(row);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sellerId]);

  if (loading || !stats) return null;

  const decided = stats.accepted_count + stats.rejected_count;
  if (decided === 0 && stats.avg_response_seconds === null) {
    // No history to show yet.
    return null;
  }

  if (variant === "card") {
    return (
      <div className="rounded-2xl border bg-card p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Statistiques propositions
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {stats.acceptance_rate !== null && (
            <Stat
              icon={<CheckCircle2 size={16} className="text-green-600" />}
              label="Taux d'acceptation"
              value={`${stats.acceptance_rate}%`}
              hint={`${stats.accepted_count} acceptée${stats.accepted_count > 1 ? "s" : ""} / ${decided}`}
            />
          )}
          {stats.avg_response_seconds !== null && (
            <Stat
              icon={<Clock size={16} className="text-primary" />}
              label="Temps de réponse"
              value={formatDuration(stats.avg_response_seconds)}
              hint="en moyenne"
            />
          )}
        </div>
      </div>
    );
  }

  // inline variant : compact chips
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
      {stats.acceptance_rate !== null && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-semibold">
          <CheckCircle2 size={11} />
          {stats.acceptance_rate}% accepté
        </span>
      )}
      {stats.avg_response_seconds !== null && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
          <Clock size={11} />
          répond en {formatDuration(stats.avg_response_seconds)}
        </span>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-lg font-bold mt-0.5">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
