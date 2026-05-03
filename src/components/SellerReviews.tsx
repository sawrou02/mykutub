import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "./StarRating";
import { toast } from "sonner";
import type { Review } from "@/lib/mykutub";

export function SellerReviews({ sellerId, chatId }: { sellerId: string; chatId?: string }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.from("reviews").select("*").eq("seller_id", sellerId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setReviews((data as Review[]) ?? []));
  }, [sellerId]);

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const canReview = !!user && user.id !== sellerId && !!chatId;
  const alreadyReviewed = !!user && reviews.some(r => r.reviewer_id === user.id && r.chat_id === chatId);

  const submit = async () => {
    if (!user || rating === 0) return;
    setSubmitting(true);
    const { data, error } = await supabase.from("reviews").insert({
      seller_id: sellerId,
      reviewer_id: user.id,
      reviewer_name: user.user_metadata?.display_name || user.email?.split("@")[0] || "Utilisateur",
      rating, comment: comment || null, chat_id: chatId,
    }).select().single();
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    setReviews(r => [data as Review, ...r]);
    setRating(0); setComment("");
    toast.success("Merci pour votre avis !");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-headline font-bold text-lg">{t("common.reviews")}</h3>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2">
            <StarRating value={Math.round(avg)} readOnly size={14} />
            <span className="text-sm font-bold">{avg.toFixed(1)} ({reviews.length})</span>
          </div>
        )}
      </div>

      {canReview && !alreadyReviewed && (
        <div className="border rounded-2xl p-4 space-y-3 bg-muted/30">
          <p className="text-sm font-bold">{t("common.leaveReview")}</p>
          <StarRating value={rating} onChange={setRating} />
          <Textarea placeholder={t("common.comment")} value={comment} onChange={e => setComment(e.target.value)} maxLength={500} rows={3} />
          <Button onClick={submit} disabled={submitting || rating === 0} size="sm">{t("common.submit")}</Button>
        </div>
      )}

      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("common.noReviews")}</p>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <div key={r.id} className="border-b pb-3 last:border-0">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm">{r.reviewer_name}</span>
                <StarRating value={r.rating} readOnly size={12} />
              </div>
              {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
