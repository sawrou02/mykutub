import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Tag, Check, X, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PriceOffer } from "@/lib/types";

type Props = {
  offerId: string;
  mine: boolean;
};

const STATUS_LABEL: Record<PriceOffer["status"], string> = {
  pending: "En attente",
  accepted: "Acceptée",
  rejected: "Refusée",
  withdrawn: "Retirée",
};

const STATUS_COLOR: Record<PriceOffer["status"], string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  withdrawn: "bg-gray-100 text-gray-700",
};

export function OfferMessageCard({ offerId, mine }: Props) {
  const { user } = useAuth();
  const [offer, setOffer] = useState<PriceOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"accept" | "reject" | "withdraw" | null>(null);

  const fetchOffer = async () => {
    const { data } = await supabase
      .from("price_offers" as never)
      .select("*")
      .eq("id", offerId)
      .maybeSingle();
    setOffer(data as PriceOffer | null);
    setLoading(false);
  };

  useEffect(() => {
    fetchOffer();
    const channel = supabase
      .channel(`price_offer_${offerId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "price_offers",
          filter: `id=eq.${offerId}`,
        },
        () => fetchOffer(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offerId]);

  if (loading) {
    return (
      <div className="rounded-xl border bg-white px-3 py-2 text-sm text-muted-foreground shadow-sm">
        <Loader2 size={14} className="inline animate-spin mr-1.5" />
        Chargement de la proposition…
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="rounded-xl border bg-white px-3 py-2 text-xs text-muted-foreground italic shadow-sm">
        Proposition introuvable
      </div>
    );
  }

  const isSeller = user?.id === offer.seller_id;
  const isBuyer = user?.id === offer.buyer_id;
  const isPending = offer.status === "pending";

  const doAction = async (action: "accept" | "reject" | "withdraw") => {
    const rpcName =
      action === "accept"
        ? "accept_price_offer"
        : action === "reject"
          ? "reject_price_offer"
          : "withdraw_price_offer";
    setBusy(action);
    const { error } = await supabase.rpc(rpcName as never, { _offer_id: offerId } as never);
    setBusy(null);
    if (error) {
      toast.error(error.message ?? "Erreur");
      return;
    }
    toast.success(
      action === "accept"
        ? "Proposition acceptée"
        : action === "reject"
          ? "Proposition refusée"
          : "Proposition retirée",
    );
    fetchOffer();
  };

  const discount = offer.original_price
    ? Math.round((1 - offer.proposed_price / offer.original_price) * 100)
    : 0;

  return (
    <div
      className={cn(
        "rounded-2xl border bg-white shadow-sm max-w-[85%] md:max-w-[420px] overflow-hidden",
        mine ? "border-primary/30" : "border-border",
      )}
    >
      <div className="px-3 py-2 bg-primary/5 border-b flex items-center gap-1.5">
        <Tag size={14} className="text-primary" />
        <span className="text-xs font-semibold text-primary uppercase tracking-wide">
          Proposition de prix
        </span>
        <span
          className={cn(
            "ml-auto text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full",
            STATUS_COLOR[offer.status],
          )}
        >
          {STATUS_LABEL[offer.status]}
        </span>
      </div>

      <div className="px-3 py-2.5 space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs text-muted-foreground">Prix proposé</span>
          <span className="text-xl font-bold">{offer.proposed_price.toFixed(2)} €</span>
        </div>
        <div className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
          <span>Prix affiché</span>
          <span className="line-through">{offer.original_price.toFixed(2)} €</span>
        </div>
        {discount > 0 && <div className="text-xs text-green-700 font-semibold">−{discount}%</div>}
        {offer.message && (
          <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words pt-1">
            {offer.message}
          </p>
        )}
      </div>

      {isPending && (isSeller || isBuyer) && (
        <div className="px-3 py-2 border-t bg-muted/30 flex gap-2">
          {isSeller && (
            <>
              <Button
                size="sm"
                onClick={() => doAction("accept")}
                disabled={busy !== null}
                className="flex-1 h-9 rounded-full font-semibold bg-green-600 hover:bg-green-700"
              >
                {busy === "accept" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    <Check size={14} className="mr-1" /> Accepter
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => doAction("reject")}
                disabled={busy !== null}
                className="flex-1 h-9 rounded-full font-semibold"
              >
                {busy === "reject" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    <X size={14} className="mr-1" /> Refuser
                  </>
                )}
              </Button>
            </>
          )}
          {isBuyer && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => doAction("withdraw")}
              disabled={busy !== null}
              className="flex-1 h-9 rounded-full font-semibold"
            >
              {busy === "withdraw" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <>
                  <Undo2 size={14} className="mr-1" /> Retirer ma proposition
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
