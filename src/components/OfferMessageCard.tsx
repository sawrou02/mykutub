import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Tag, Check, X, Undo2, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PriceOffer } from "@/lib/types";
import { CounterOfferModal } from "@/components/CounterOfferModal";
import { notifyOfferEmail, type OfferEmailKind } from "@/lib/offers";

type Props = {
  offerId: string;
  mine: boolean;
};

const STATUS_LABEL: Record<PriceOffer["status"], string> = {
  pending: "En attente",
  countered: "Contre-proposée",
  accepted: "Acceptée",
  rejected: "Refusée",
  withdrawn: "Retirée",
  expired: "Expirée",
  shipped: "Expédiée",
  received: "Reçue",
};

const STATUS_COLOR: Record<PriceOffer["status"], string> = {
  pending: "bg-amber-100 text-amber-800",
  countered: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  withdrawn: "bg-gray-100 text-gray-700",
  expired: "bg-gray-100 text-gray-700",
  shipped: "bg-indigo-100 text-indigo-800",
  received: "bg-emerald-100 text-emerald-800",
};

type Action = "accept" | "reject" | "withdraw" | "accept_counter" | "reject_counter";

const RPC_FOR_ACTION = {
  accept: "accept_price_offer",
  reject: "reject_price_offer",
  withdraw: "withdraw_price_offer",
  accept_counter: "accept_counter_offer",
  reject_counter: "reject_counter_offer",
} as const satisfies Record<Action, string>;

export function OfferMessageCard({ offerId, mine }: Props) {
  const { user } = useAuth();
  const [offer, setOffer] = useState<PriceOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Action | null>(null);
  const [counterOpen, setCounterOpen] = useState(false);

  const fetchOffer = async () => {
    const { data } = await supabase
      .from("price_offers")
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
      <div className="rounded-xl border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm">
        <Loader2 size={14} className="inline animate-spin mr-1.5" />
        Chargement de la proposition…
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="rounded-xl border bg-card px-3 py-2 text-xs text-muted-foreground italic shadow-sm">
        Proposition introuvable
      </div>
    );
  }

  const isSeller = user?.id === offer.seller_id;
  const isBuyer = user?.id === offer.buyer_id;
  const isPending = offer.status === "pending";
  const isCountered = offer.status === "countered";

  const EMAIL_KIND_FOR_ACTION: Record<Action, OfferEmailKind> = {
    accept: "accepted",
    reject: "rejected",
    withdraw: "withdrawn",
    accept_counter: "counter_accepted",
    reject_counter: "counter_rejected",
  };

  const doAction = async (action: Action) => {
    setBusy(action);
    const { error } = await supabase.rpc(RPC_FOR_ACTION[action], {
      _offer_id: offerId,
    });
    setBusy(null);
    if (error) {
      const msg = error.message ?? "Erreur";
      if (msg.includes("already reserved by another buyer")) {
        toast.error("Ce livre est déjà réservé par un autre acheteur");
      } else {
        toast.error(msg);
      }
      return;
    }
    const successMsg: Record<Action, string> = {
      accept: "Proposition acceptée — livre réservé",
      reject: "Proposition refusée",
      withdraw: "Proposition retirée",
      accept_counter: "Contre-proposition acceptée — livre réservé",
      reject_counter: "Contre-proposition refusée",
    };
    toast.success(successMsg[action]);
    if (offer && user) {
      void notifyOfferEmail({ offer, user, kind: EMAIL_KIND_FOR_ACTION[action] });
    }
    fetchOffer();
  };

  // Active price : counter_price if countered, else proposed_price
  const activePrice =
    isCountered && offer.counter_price ? offer.counter_price : offer.proposed_price;
  const discount = offer.original_price
    ? Math.round((1 - activePrice / offer.original_price) * 100)
    : 0;

  return (
    <>
      <div
        className={cn(
          "rounded-2xl border bg-card shadow-sm max-w-[85%] md:max-w-[420px] overflow-hidden",
          mine ? "border-primary/30" : "border-border",
        )}
      >
        <div className="px-3 py-2 bg-primary/5 border-b flex items-center gap-1.5">
          <Tag size={14} className="text-primary" />
          <span className="text-xs font-semibold text-primary uppercase tracking-wide">
            {isCountered ? "Contre-proposition" : "Proposition de prix"}
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
            <span className="text-xs text-muted-foreground">
              {isCountered ? "Contre-proposition du vendeur" : "Prix proposé"}
            </span>
            <span className="text-xl font-bold">{activePrice.toFixed(2)} €</span>
          </div>
          {isCountered && (
            <div className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
              <span>Offre initiale</span>
              <span>{offer.proposed_price.toFixed(2)} €</span>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
            <span>Prix affiché</span>
            <span className="line-through">{offer.original_price.toFixed(2)} €</span>
          </div>
          {discount > 0 && <div className="text-xs text-green-700 font-semibold">−{discount}%</div>}
          {(isCountered ? offer.counter_message : offer.message) && (
            <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words pt-1">
              {isCountered ? offer.counter_message : offer.message}
            </p>
          )}
        </div>

        {isPending && (isSeller || isBuyer) && (
          <div className="px-3 py-2 border-t bg-muted/30 flex flex-wrap gap-2">
            {isSeller && (
              <>
                <Button
                  size="sm"
                  onClick={() => doAction("accept")}
                  disabled={busy !== null}
                  className="flex-1 min-w-[100px] h-9 rounded-full font-semibold bg-green-600 hover:bg-green-700"
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
                  onClick={() => setCounterOpen(true)}
                  disabled={busy !== null}
                  className="flex-1 min-w-[100px] h-9 rounded-full font-semibold"
                >
                  <ArrowRightLeft size={14} className="mr-1" /> Contre-proposer
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => doAction("reject")}
                  disabled={busy !== null}
                  className="flex-1 min-w-[100px] h-9 rounded-full font-semibold"
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

        {isCountered && isBuyer && (
          <div className="px-3 py-2 border-t bg-muted/30 flex gap-2">
            <Button
              size="sm"
              onClick={() => doAction("accept_counter")}
              disabled={busy !== null}
              className="flex-1 h-9 rounded-full font-semibold bg-green-600 hover:bg-green-700"
            >
              {busy === "accept_counter" ? (
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
              onClick={() => doAction("reject_counter")}
              disabled={busy !== null}
              className="flex-1 h-9 rounded-full font-semibold"
            >
              {busy === "reject_counter" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <>
                  <X size={14} className="mr-1" /> Refuser
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      <CounterOfferModal
        open={counterOpen}
        onOpenChange={setCounterOpen}
        offerId={offerId}
        buyerOffer={offer.proposed_price}
        listedPrice={offer.original_price}
      />
    </>
  );
}
