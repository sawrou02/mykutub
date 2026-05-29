import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { sendEmail } from "@/lib/email";
import type { PriceOffer } from "@/lib/types";

export type OfferEmailKind =
  | "received"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "countered"
  | "counter_accepted"
  | "counter_rejected";

const COUNTER_KINDS: OfferEmailKind[] = ["countered", "counter_accepted", "counter_rejected"];

function deriveDisplayName(user: User): string {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  return (meta?.display_name as string | undefined) ?? user.email?.split("@")[0] ?? "Utilisateur";
}

/**
 * Best-effort email notification to the other party of a price offer.
 * Throttled and pref-checked server-side. Never throws.
 */
export async function notifyOfferEmail(opts: {
  offer: PriceOffer;
  user: User;
  kind: OfferEmailKind;
}): Promise<void> {
  const recipientId =
    opts.offer.buyer_id === opts.user.id ? opts.offer.seller_id : opts.offer.buyer_id;

  const price =
    COUNTER_KINDS.includes(opts.kind) && opts.offer.counter_price
      ? opts.offer.counter_price
      : opts.offer.proposed_price;

  const [{ data: book }, { data: profile }] = await Promise.all([
    supabase.from("books").select("title").eq("id", opts.offer.book_id).maybeSingle(),
    supabase.from("profiles").select("display_name").eq("id", recipientId).maybeSingle(),
  ]);

  await sendEmail("send-offer-notification-email", {
    userId: recipientId,
    recipientName: (profile as { display_name: string | null } | null)?.display_name ?? undefined,
    otherName: deriveDisplayName(opts.user),
    bookTitle: (book as { title: string } | null)?.title ?? "votre livre",
    price,
    kind: opts.kind,
    offerId: opts.offer.id,
    chatId: opts.offer.chat_id,
  });
}
