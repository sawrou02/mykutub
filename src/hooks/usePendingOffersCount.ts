import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Count of price offers that require an action from the current user :
 * - received offers in status='pending' (seller must accept/refuse/counter)
 * - sent offers in status='countered' (buyer must accept/refuse the counter)
 *
 * Refetches on any change to price_offers via Realtime.
 */
export function usePendingOffersCount(): number {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }
    let cancelled = false;
    const refresh = async () => {
      const [recv, sent] = await Promise.all([
        supabase
          .from("price_offers" as never)
          .select("id", { count: "exact", head: true })
          .eq("seller_id", user.id)
          .eq("status", "pending"),
        supabase
          .from("price_offers" as never)
          .select("id", { count: "exact", head: true })
          .eq("buyer_id", user.id)
          .eq("status", "countered"),
      ]);
      if (cancelled) return;
      setCount((recv.count ?? 0) + (sent.count ?? 0));
    };
    refresh();
    const channel = supabase.channel(
      `pending_offers_${user.id}_${Math.random().toString(36).slice(2)}`,
    );
    channel
      .on(
        "postgres_changes" as never,
        { event: "*", schema: "public", table: "price_offers" },
        () => refresh(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  return count;
}
