import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offerId: string;
  sellerId: string;
  chatId: string | null;
  onDone?: () => void;
};

export function LeaveReviewModal({
  open,
  onOpenChange,
  offerId,
  sellerId,
  chatId,
  onDone,
}: Props) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user || rating === 0) {
      toast.error("Choisis une note de 1 à 5");
      return;
    }
    setBusy(true);
    const reviewerName =
      (user.user_metadata as { display_name?: string } | undefined)?.display_name ??
      user.email?.split("@")[0] ??
      "Acheteur";
    const { data, error } = await supabase
      .from("reviews")
      .insert({
        seller_id: sellerId,
        reviewer_id: user.id,
        reviewer_name: reviewerName,
        rating,
        comment: comment.trim() || null,
        chat_id: chatId,
      })
      .select("id")
      .single();
    if (error || !data) {
      setBusy(false);
      toast.error(error?.message ?? "Erreur lors du dépôt de l'avis");
      return;
    }
    await supabase.rpc("link_review_to_offer", {
      _offer_id: offerId,
      _review_id: data.id,
    });
    setBusy(false);
    toast.success("Merci pour ton avis !");
    onOpenChange(false);
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star size={20} /> Laisser un avis au vendeur
          </DialogTitle>
          <DialogDescription>
            Comment s'est passée la transaction ? Ton avis aidera les futurs acheteurs.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 py-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                className="p-1"
                aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
              >
                <Star
                  size={32}
                  className={cn(
                    "transition-colors",
                    (hover || rating) >= n
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground",
                  )}
                />
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Commentaire (facultatif)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            rows={3}
          />
        </div>
        <div className="flex gap-2 justify-end mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Plus tard
          </Button>
          <Button onClick={submit} disabled={busy || rating === 0}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : "Publier l'avis"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
