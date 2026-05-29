import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { notifyOfferEmail } from "@/lib/offers";
import type { PriceOffer } from "@/lib/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offerId: string;
  buyerOffer: number;
  listedPrice: number;
};

const MAX_MESSAGE = 2500;

export function CounterOfferModal({ open, onOpenChange, offerId, buyerOffer, listedPrice }: Props) {
  const { user } = useAuth();
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      // Pre-fill with the midpoint between buyer offer and listed price
      const mid = Math.round(((buyerOffer + listedPrice) / 2) * 100) / 100;
      setPrice(mid.toFixed(2));
      setMessage("");
    }
  }, [open, buyerOffer, listedPrice]);

  const parsed = Number(price.replace(",", "."));
  const canSubmit =
    Number.isFinite(parsed) && parsed > buyerOffer && parsed <= listedPrice && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const { error } = await supabase.rpc("counter_price_offer", {
      _offer_id: offerId,
      _counter_price: parsed,
      _counter_message: message.trim() || undefined,
    });
    setSubmitting(false);
    if (error) {
      const msg = error.message ?? "Erreur";
      if (msg.includes("higher than the buyer offer")) {
        toast.error("Le prix doit être supérieur à l'offre de l'acheteur");
      } else if (msg.includes("exceed listed price")) {
        toast.error("Le prix ne peut pas dépasser le prix affiché");
      } else if (msg.includes("not pending")) {
        toast.error("Cette proposition n'est plus en attente");
      } else {
        toast.error(msg);
      }
      return;
    }
    toast.success("Contre-proposition envoyée");
    onOpenChange(false);

    // Best-effort email to the buyer
    if (user) {
      const { data } = await supabase
        .from("price_offers")
        .select("*")
        .eq("id", offerId)
        .maybeSingle();
      const offer = data as PriceOffer | null;
      if (offer) {
        void notifyOfferEmail({ offer, user, kind: "countered" });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contre-proposer un prix</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">Offre de l'acheteur</span>
            <span className="font-semibold">{buyerOffer.toFixed(2)} €</span>
          </div>
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">Prix affiché</span>
            <span className="font-semibold">{listedPrice.toFixed(2)} €</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="counter-price">Votre contre-proposition</Label>
          <div className="relative">
            <Input
              id="counter-price"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              €
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Doit être entre {(buyerOffer + 0.01).toFixed(2)} € et {listedPrice.toFixed(2)} €
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="counter-message">Message (optionnel)</Label>
          <Textarea
            id="counter-message"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
            placeholder="Expliquez votre contre-proposition..."
            rows={3}
          />
          <p className="text-xs text-muted-foreground text-right">
            {message.length}/{MAX_MESSAGE}
          </p>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full h-11 rounded-full font-semibold"
        >
          {submitting && <Loader2 size={16} className="mr-1.5 animate-spin" />}
          Envoyer la contre-proposition
        </Button>
      </DialogContent>
    </Dialog>
  );
}
