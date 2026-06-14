// send-offer-notification-email: 1 email / offer / 30 min
// Triggered after price offer state changes (creation, accept, reject,
// counter, accept_counter, reject_counter, withdraw).
//
// Recipient preference column reused : notify_messages (offers are
// essentially structured chat events).
import {
  corsHeaders,
  renderEmail,
  sendResendEmail,
  siteLink,
  shouldSend,
  logSent,
} from "../_shared/email.ts";

type Kind =
  | "received"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "countered"
  | "counter_accepted"
  | "counter_rejected"
  | "shipped"
  | "delivered"
  | "not_received";

interface Body {
  userId: string; // recipient
  recipientName?: string;
  otherName: string;
  bookTitle: string;
  price: number;
  kind: Kind;
  offerId: string;
  chatId?: string | null;
  trackingCarrier?: string | null;
  trackingNumber?: string | null;
}

function buildContent(b: Body): { subject: string; bodyHtml: string; button: string } {
  const priceStr = `${b.price.toFixed(2)} €`;
  switch (b.kind) {
    case "received":
      return {
        subject: `💰 Nouvelle proposition de prix — ${b.bookTitle}`,
        bodyHtml: `<p>Salam <strong>${b.recipientName ?? ""}</strong>,</p>
          <p><strong>${b.otherName}</strong> vous propose <strong>${priceStr}</strong> pour
          « ${b.bookTitle} ».</p>
          <p>Vous pouvez accepter, refuser ou contre-proposer un autre prix depuis la conversation.</p>`,
        button: "Voir la proposition",
      };
    case "accepted":
      return {
        subject: `✅ Proposition acceptée — ${b.bookTitle}`,
        bodyHtml: `<p>Salam <strong>${b.recipientName ?? ""}</strong>,</p>
          <p>Bonne nouvelle ! <strong>${b.otherName}</strong> a accepté votre proposition de
          <strong>${priceStr}</strong> pour « ${b.bookTitle} ». Le livre vous est réservé —
          finalisez la transaction dans la conversation.</p>`,
        button: "Finaliser",
      };
    case "rejected":
      return {
        subject: `❌ Proposition refusée — ${b.bookTitle}`,
        bodyHtml: `<p>Salam <strong>${b.recipientName ?? ""}</strong>,</p>
          <p><strong>${b.otherName}</strong> a refusé votre proposition de
          <strong>${priceStr}</strong> pour « ${b.bookTitle} ». Vous pouvez en faire
          une nouvelle si vous le souhaitez.</p>`,
        button: "Revoir le livre",
      };
    case "withdrawn":
      return {
        subject: `🔄 Proposition retirée — ${b.bookTitle}`,
        bodyHtml: `<p>Salam <strong>${b.recipientName ?? ""}</strong>,</p>
          <p><strong>${b.otherName}</strong> a retiré sa proposition de
          <strong>${priceStr}</strong> pour « ${b.bookTitle} ».</p>`,
        button: "Voir la conversation",
      };
    case "countered":
      return {
        subject: `🔁 Contre-proposition reçue — ${b.bookTitle}`,
        bodyHtml: `<p>Salam <strong>${b.recipientName ?? ""}</strong>,</p>
          <p><strong>${b.otherName}</strong> vous propose <strong>${priceStr}</strong>
          en contrepartie pour « ${b.bookTitle} ».</p>
          <p>Vous pouvez accepter ou refuser cette contre-proposition depuis la conversation.</p>`,
        button: "Voir la contre-proposition",
      };
    case "counter_accepted":
      return {
        subject: `✅ Contre-proposition acceptée — ${b.bookTitle}`,
        bodyHtml: `<p>Salam <strong>${b.recipientName ?? ""}</strong>,</p>
          <p><strong>${b.otherName}</strong> a accepté votre contre-proposition de
          <strong>${priceStr}</strong> pour « ${b.bookTitle} ». Le livre est réservé.</p>`,
        button: "Finaliser",
      };
    case "counter_rejected":
      return {
        subject: `❌ Contre-proposition refusée — ${b.bookTitle}`,
        bodyHtml: `<p>Salam <strong>${b.recipientName ?? ""}</strong>,</p>
          <p><strong>${b.otherName}</strong> a refusé votre contre-proposition de
          <strong>${priceStr}</strong> pour « ${b.bookTitle} ».</p>`,
        button: "Voir la conversation",
      };
    case "shipped": {
      const tracking =
        b.trackingNumber && b.trackingNumber.length > 0
          ? `<p>Suivi : <strong>${b.trackingCarrier ? `${b.trackingCarrier} ` : ""}${b.trackingNumber}</strong></p>`
          : "";
      return {
        subject: `📦 Colis expédié — ${b.bookTitle}`,
        bodyHtml: `<p>Salam <strong>${b.recipientName ?? ""}</strong>,</p>
          <p><strong>${b.otherName}</strong> a expédié « ${b.bookTitle} ». Dès réception,
          pensez à confirmer la livraison dans la conversation pour finaliser la transaction.</p>
          ${tracking}`,
        button: "Voir l'expédition",
      };
    }
    case "delivered":
      return {
        subject: `✅ Colis bien reçu — ${b.bookTitle}`,
        bodyHtml: `<p>Salam <strong>${b.recipientName ?? ""}</strong>,</p>
          <p><strong>${b.otherName}</strong> a confirmé la réception du colis pour
          « ${b.bookTitle} ». La transaction est terminée — bravo !</p>`,
        button: "Voir la transaction",
      };
    case "not_received":
      return {
        subject: `⚠️ Colis non encore reçu — ${b.bookTitle}`,
        bodyHtml: `<p>Salam <strong>${b.recipientName ?? ""}</strong>,</p>
          <p><strong>${b.otherName}</strong> indique ne pas encore avoir reçu le colis
          pour « ${b.bookTitle} ». Merci de vérifier le suivi et de rester en contact
          avec l'acheteur.</p>`,
        button: "Ouvrir la conversation",
      };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const b: Body = await req.json();
    const allow = await shouldSend({
      userId: b.userId,
      emailType: "price_offer",
      preferenceCol: "notify_messages",
    });
    if (!allow.ok)
      return new Response(JSON.stringify({ skipped: allow.reason }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    // Throttle : 1 email / offer / 30 min, 5 / jour / user (géré par la RPC).
    const reserved = await logSent(b.userId, "price_offer", b.offerId, 30);
    if (!reserved)
      return new Response(JSON.stringify({ skipped: "throttled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const { subject, bodyHtml, button } = buildContent(b);
    const link = b.chatId ? siteLink(`/messages/${b.chatId}`) : siteLink("/offers");
    const html = renderEmail({
      title: subject,
      bodyHtml,
      buttons: [{ label: button, url: link }],
      recipientEmail: allow.email!,
    });
    await sendResendEmail(allow.email!, subject, html);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
