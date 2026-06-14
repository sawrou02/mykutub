import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Tag,
  Inbox,
  Send,
  Check,
  X,
  Undo2,
  MessageCircle,
  Loader2,
  Truck,
  PackageCheck,
  PackageX,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PriceOffer } from "@/lib/types";
import { notifyOfferEmail, type OfferEmailKind } from "@/lib/offers";
import { ShippedModal } from "@/components/ShippedModal";
import { LeaveReviewModal } from "@/components/LeaveReviewModal";

type OfferRow = PriceOffer & {
  book?: { id: string; title: string; image_url: string | null } | null;
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

export function MyOffersList() {
  const { user } = useAuth();
  const [received, setReceived] = useState<OfferRow[]>([]);
  const [sent, setSent] = useState<OfferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const fetchAll = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: recv }, { data: snt }] = await Promise.all([
      supabase
        .from("price_offers")
        .select("*, book:books(id, title, image_url)")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("price_offers")
        .select("*, book:books(id, title, image_url)")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false }),
    ]);
    setReceived((recv as OfferRow[] | null) ?? []);
    setSent((snt as OfferRow[] | null) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    if (!user) return;
    const channel = supabase
      .channel(`my_offers_${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "price_offers" }, () =>
        fetchAll(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const EMAIL_KIND_FOR_RPC: Record<string, OfferEmailKind> = {
    accept_price_offer: "accepted",
    reject_price_offer: "rejected",
    withdraw_price_offer: "withdrawn",
    accept_counter_offer: "counter_accepted",
    reject_counter_offer: "counter_rejected",
  };

  const act = async (
    action:
      | "accept_price_offer"
      | "reject_price_offer"
      | "withdraw_price_offer"
      | "accept_counter_offer"
      | "reject_counter_offer",
    offer: OfferRow,
  ) => {
    setBusy(offer.id);
    const { error } = await supabase.rpc(action, { _offer_id: offer.id });
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
    toast.success("Mise à jour");
    if (user) {
      void notifyOfferEmail({ offer, user, kind: EMAIL_KIND_FOR_RPC[action] });
    }
    fetchAll();
  };

  if (loading) {
    return (
      <div className="py-20 flex items-center justify-center text-muted-foreground">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="received">
      <TabsList className="w-full mb-4">
        <TabsTrigger value="received" className="flex-1 gap-1.5">
          <Inbox size={14} /> Reçues
          {received.length > 0 && (
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 rounded-full">
              {received.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="sent" className="flex-1 gap-1.5">
          <Send size={14} /> Envoyées
          {sent.length > 0 && (
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 rounded-full">
              {sent.length}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="received">
        <OfferList
          offers={received}
          emptyText="Aucune proposition reçue pour le moment."
          renderActions={(o) =>
            o.status === "pending" ? (
              <>
                <Button
                  size="sm"
                  onClick={() => act("accept_price_offer", o)}
                  disabled={busy !== null}
                  className="flex-1 h-9 rounded-full bg-green-600 hover:bg-green-700"
                >
                  {busy === o.id ? (
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
                  onClick={() => act("reject_price_offer", o)}
                  disabled={busy !== null}
                  className="flex-1 h-9 rounded-full"
                >
                  <X size={14} className="mr-1" /> Refuser
                </Button>
              </>
            ) : null
          }
        />
      </TabsContent>

      <TabsContent value="sent">
        <OfferList
          offers={sent}
          emptyText="Vous n'avez envoyé aucune proposition."
          renderActions={(o) => {
            if (o.status === "pending") {
              return (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => act("withdraw_price_offer", o)}
                  disabled={busy !== null}
                  className="flex-1 h-9 rounded-full"
                >
                  <Undo2 size={14} className="mr-1" /> Retirer
                </Button>
              );
            }
            if (o.status === "countered") {
              return (
                <>
                  <Button
                    size="sm"
                    onClick={() => act("accept_counter_offer", o)}
                    disabled={busy !== null}
                    className="flex-1 h-9 rounded-full bg-green-600 hover:bg-green-700"
                  >
                    <Check size={14} className="mr-1" /> Accepter la contre-prop.
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => act("reject_counter_offer", o)}
                    disabled={busy !== null}
                    className="flex-1 h-9 rounded-full"
                  >
                    <X size={14} className="mr-1" /> Refuser
                  </Button>
                </>
              );
            }
            return null;
          }}
        />
      </TabsContent>
    </Tabs>
  );
}

function OfferList({
  offers,
  emptyText,
  renderActions,
}: {
  offers: OfferRow[];
  emptyText: string;
  renderActions: (offer: OfferRow) => React.ReactNode;
}) {
  if (offers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Tag size={40} className="text-muted-foreground mb-4" />
        <p className="font-bold text-lg">Aucune proposition</p>
        <p className="text-sm text-muted-foreground mt-1">{emptyText}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {offers.map((o) => {
        const activePrice =
          o.status === "countered" && o.counter_price ? o.counter_price : o.proposed_price;
        const discount = o.original_price
          ? Math.round((1 - activePrice / o.original_price) * 100)
          : 0;
        return (
          <li key={o.id} className="bg-card rounded-2xl border p-3 flex gap-3">
            <Link to="/book/$id" params={{ id: o.book_id }} className="flex-shrink-0">
              {o.book?.image_url ? (
                <img
                  src={o.book.image_url}
                  alt={o.book?.title ?? ""}
                  className="w-16 h-16 rounded-lg object-cover border"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-muted" />
              )}
            </Link>
            <div className="flex-1 min-w-0">
              <Link
                to="/book/$id"
                params={{ id: o.book_id }}
                className="font-semibold text-sm truncate block hover:underline"
              >
                {o.book?.title ?? "Livre supprimé"}
              </Link>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-lg font-bold">{activePrice.toFixed(2)} €</span>
                <span className="text-xs text-muted-foreground line-through">
                  {o.original_price.toFixed(2)} €
                </span>
                {discount > 0 && (
                  <span className="text-xs text-green-700 font-semibold">−{discount}%</span>
                )}
              </div>
              {o.status === "countered" && (
                <p className="text-[11px] text-blue-700 font-medium">
                  Contre-proposition (offre initiale {o.proposed_price.toFixed(2)} €)
                </p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full",
                    STATUS_COLOR[o.status],
                  )}
                >
                  {STATUS_LABEL[o.status]}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(o.created_at).toLocaleDateString("fr-FR")}
                </span>
              </div>
              <div className="flex gap-2 mt-2">
                {renderActions(o)}
                {o.chat_id && (
                  <Button asChild size="sm" variant="ghost" className="h-9 rounded-full text-xs">
                    <Link
                      to="/messages/$id"
                      params={{ id: o.chat_id }}
                      search={{ draft: undefined }}
                    >
                      <MessageCircle size={14} className="mr-1" /> Ouvrir le chat
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
