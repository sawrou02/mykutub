import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: {
    id: string;
    title: string;
    price: number;
    image_url: string | null;
  };
};

const MAX_MESSAGE = 2500;

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function PriceOfferModal({ open, onOpenChange, book }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const presets = useMemo(
    () => ({
      ten: round2(book.price * 0.9),
      twenty: round2(book.price * 0.8),
    }),
    [book.price],
  );

  const [selected, setSelected] = useState<"ten" | "twenty" | "custom">("ten");
  const [customPrice, setCustomPrice] = useState<string>("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected("ten");
      setCustomPrice("");
      setMessage("");
    }
  }, [open]);

  const effectivePrice = (() => {
    if (selected === "ten") return presets.ten;
    if (selected === "twenty") return presets.twenty;
    const parsed = Number(customPrice.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : NaN;
  })();

  const canSubmit =
    Number.isFinite(effectivePrice) &&
    effectivePrice >= 0 &&
    effectivePrice <= book.price &&
    !submitting;

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Connexion requise.");
      navigate({ to: "/login" });
      return;
    }
    if (!canSubmit) return;

    setSubmitting(true);
    const { data, error } = await supabase.rpc(
      "create_price_offer" as never,
      {
        _book_id: book.id,
        _proposed_price: effectivePrice,
        _message: message.trim() || null,
      } as never,
    );

    setSubmitting(false);

    if (error) {
      const msg = error.message ?? "Erreur lors de l'envoi de la proposition";
      if (msg.includes("Rate limit") || msg.includes("trop de propositions")) {
        toast.error("Trop de propositions envoyées récemment. Réessayez dans 1h.");
      } else if (msg.includes("duplicate") || msg.includes("price_offers_one")) {
        toast.error("Vous avez déjà une proposition en cours pour ce livre.");
      } else if (msg.includes("exceed listed price")) {
        toast.error("Le prix proposé ne peut pas dépasser le prix affiché.");
      } else if (msg.includes("not available")) {
        toast.error("Ce livre n'est plus disponible.");
      } else if (msg.includes("own book")) {
        toast.error("Vous ne pouvez pas proposer un prix sur votre propre livre.");
      } else {
        toast.error(msg);
      }
      return;
    }

    toast.success("Proposition envoyée");
    onOpenChange(false);

    // Navigate to the chat (data is offer_id; find chat via offer)
    const offerId = data as string | null;
    if (offerId) {
      const { data: offer } = await supabase
        .from("price_offers" as never)
        .select("chat_id")
        .eq("id", offerId)
        .maybeSingle();
      const chatId = (offer as { chat_id: string | null } | null)?.chat_id;
      if (chatId) {
        navigate({ to: "/messages/$id", params: { id: chatId }, search: { draft: undefined } });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Proposer un nouveau prix</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 py-2">
          {book.image_url ? (
            <img
              src={book.image_url}
              alt={book.title}
              className="w-14 h-14 rounded-md object-cover border"
            />
          ) : (
            <div className="w-14 h-14 rounded-md bg-muted" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{book.title}</p>
          </div>
          <div className="text-right font-bold">{book.price.toFixed(2)} €</div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <PresetCard
            selected={selected === "ten"}
            onClick={() => setSelected("ten")}
            price={presets.ten}
            label="Réduction de 10%"
          />
          <PresetCard
            selected={selected === "twenty"}
            onClick={() => setSelected("twenty")}
            price={presets.twenty}
            label="Réduction de 20%"
          />
          <button
            type="button"
            onClick={() => setSelected("custom")}
            className={cn(
              "rounded-xl border p-3 text-left transition",
              selected === "custom"
                ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                : "border-border hover:bg-muted/40",
            )}
          >
            <div className="text-lg font-bold leading-tight">Autre</div>
            <div className="text-xs text-muted-foreground">prix</div>
          </button>
        </div>

        {selected === "custom" && (
          <div className="space-y-1.5">
            <Label htmlFor="offer-custom-price">Mon offre (obligatoire)</Label>
            <div className="relative">
              <Input
                id="offer-custom-price"
                inputMode="decimal"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder={`Max ${book.price.toFixed(2)}`}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                €
              </span>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="offer-message">Message (optionnel)</Label>
          <Textarea
            id="offer-message"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
            placeholder="Écrivez au vendeur..."
            rows={4}
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
          Proposer
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function PresetCard({
  selected,
  onClick,
  price,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  price: number;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border p-3 text-left transition",
        selected
          ? "border-primary ring-2 ring-primary/30 bg-primary/5"
          : "border-border hover:bg-muted/40",
      )}
    >
      <div className="text-lg font-bold leading-tight">{price.toFixed(2)} €</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </button>
  );
}
