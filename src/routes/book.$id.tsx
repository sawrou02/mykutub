import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, MapPin, Share2, Heart, MessageCircle, Truck, Package, Star, CalendarDays, Clock, ShieldCheck, BookOpen, Palette, Flag, Info } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Book } from "@/lib/mykutub";
import { SellerReviews } from "@/components/SellerReviews";
import { BookReservation } from "@/components/BookReservation";
import { OnlineStatusLabel } from "@/components/OnlineDot";
import { ReportDialog } from "@/components/ReportDialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/book/$id")({
  loader: async ({ params }) => {
    const { data } = await supabase.from("books").select("*").eq("id", params.id).single();
    return { book: (data as Book | null) ?? null };
  },
  head: ({ params, loaderData }) => {
    const book = loaderData?.book ?? null;
    const title = book?.title ?? "Livre";
    const desc = (book?.description ?? "Livre de science islamique d'occasion sur MYKUTUB.").slice(0, 160);
    const image = book?.image_url ?? "https://mykutub.lovable.app/og-cover.jpg";
    const url = `https://mykutub.lovable.app/book/${params.id}`;
    return {
      meta: [
        { title: `${title} | MYKUTUB` },
        { name: "description", content: desc },
        { property: "og:type", content: "product" },
        { property: "og:title", content: `${title} | MYKUTUB` },
        { property: "og:description", content: desc },
        { property: "og:image", content: image },
        { property: "og:url", content: url },
        { name: "twitter:image", content: image },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: book
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                name: book.title,
                description: book.description ?? undefined,
                image: book.image_url ?? undefined,
                offers: {
                  "@type": "Offer",
                  price: book.is_donation ? "0" : String(book.price ?? "0"),
                  priceCurrency: "EUR",
                  availability: "https://schema.org/InStock",
                  url,
                },
              }),
            },
          ]
        : [],
    };
  },
  component: BookDetailPage,
});

const AVATAR_COLORS = [
  "bg-rose-500", "bg-amber-500", "bg-emerald-500", "bg-sky-500",
  "bg-indigo-500", "bg-fuchsia-500", "bg-orange-500", "bg-teal-500",
];
function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function BookDetailPage() {
  const { id: bookId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [rating, setRating] = useState<{ avg: number; count: number } | null>(null);
  const [sellerJoined, setSellerJoined] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("books").select("*").eq("id", bookId).single()
      .then(({ data }) => { setBook(data as Book | null); setLoading(false); });
  }, [bookId]);

  useEffect(() => {
    if (!book?.seller_id) return;
    supabase.from("reviews").select("rating").eq("seller_id", book.seller_id)
      .then(({ data }) => {
        if (data?.length) {
          const avg = data.reduce((s, r) => s + (r.rating ?? 0), 0) / data.length;
          setRating({ avg, count: data.length });
        }
      });
    supabase.from("profiles").select("created_at").eq("id", book.seller_id).single()
      .then(({ data }) => setSellerJoined((data as any)?.created_at ?? null));
  }, [book?.seller_id]);

  const handleContactSeller = async () => {
    if (!user) { toast.error("Connexion requise."); navigate({ to: "/login" }); return; }
    if (!book) return;
    if (user.id === book.seller_id) { toast.error("Vous ne pouvez pas vous contacter vous-même."); return; }

    setCreating(true);
    try {
      const { data: existing } = await supabase.from("chats").select("*")
        .eq("book_id", bookId)
        .contains("participants", [user.id, book.seller_id]);
      let chatId = existing?.[0]?.id;
      if (!chatId) {
        const { data: created, error } = await supabase.from("chats").insert({
          participants: [user.id, book.seller_id],
          book_id: bookId,
          book_title: book.title,
          book_image_url: book.image_url,
          last_message: "Conversation démarrée",
          last_message_at: new Date().toISOString(),
          unread_by: [book.seller_id],
        }).select("id").single();
        if (error) throw error;
        chatId = created!.id;
      }
      navigate({ to: "/messages/$id", params: { id: chatId } });
    } catch {
      toast.error("Impossible de démarrer la conversation.");
    } finally {
      setCreating(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const title = book?.title ?? "MYKUTUB";
    if (navigator.share) {
      try { await navigator.share({ title, url }); return; } catch { /* cancelled */ }
    }
    try { await navigator.clipboard.writeText(url); toast.success("Lien copié !"); }
    catch { toast.error("Impossible de copier le lien."); }
  };

  const initial = useMemo(() => (book?.seller_name?.[0] ?? "?").toUpperCase(), [book?.seller_name]);
  const joinedLabel = useMemo(() => {
    if (!sellerJoined) return null;
    return new Date(sellerJoined).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  }, [sellerJoined]);

  if (loading) return <div className="p-10 text-center">Chargement...</div>;
  if (!book) return <div className="p-10 text-center">Livre introuvable</div>;

  const isOwner = user?.id === book.seller_id;
  const createdLabel = new Date(book.created_at).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  }) + " à " + new Date(book.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="bg-muted/30 min-h-screen pb-24 lg:pb-10">
      {/* Breadcrumb + back button */}
      <div className="max-w-6xl mx-auto px-4 lg:px-6 pt-4 lg:pt-6 space-y-3">
        <Button asChild variant="outline" size="sm" className="rounded-full gap-1.5 h-9 font-medium">
          <Link to="/catalog"><ChevronLeft size={16} /> Retour au catalogue</Link>
        </Button>
        <nav aria-label="Fil d'Ariane" className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
          <Link to="/" className="hover:text-foreground hover:underline">Accueil</Link>
          <span>›</span>
          <Link to="/catalog" className="hover:text-foreground hover:underline">Catalogue</Link>
          <span>›</span>
          <span className="text-foreground font-medium truncate max-w-[200px] sm:max-w-none">{book.title}</span>
        </nav>
      </div>

      <div className="max-w-6xl mx-auto lg:px-6 lg:pt-4">
        <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-6">
          {/* LEFT column */}
          <div className="space-y-4">
            {/* Image */}
            <div className="relative aspect-[4/3] sm:aspect-[16/10] w-full bg-muted lg:rounded-xl overflow-hidden">
              <img src={book.image_url} alt={book.title} className="absolute inset-0 w-full h-full object-cover" />
              {book.is_donation && (
                <span className="absolute bottom-3 left-3 bg-secondary text-secondary-foreground text-[11px] font-bold uppercase px-2.5 py-1 rounded">Don</span>
              )}
              <div className="absolute top-3 right-3 flex gap-2">
                <button onClick={handleShare} className="p-2 rounded-full bg-card/95 shadow"><Share2 size={16} /></button>
                <button className="p-2 rounded-full bg-card/95 shadow"><Heart size={16} /></button>
              </div>
            </div>

            {/* Title + price card */}
            <div className="bg-card lg:rounded-xl border px-4 lg:px-6 py-4 space-y-2">
              <h1 className="font-bold text-xl lg:text-2xl leading-tight">{book.title}</h1>
              <p className="font-bold text-2xl lg:text-3xl text-emerald-700">
                {book.is_donation ? "Don" : `${book.price} €`}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock size={12} /> {createdLabel}</span>
              </div>
              <div className="inline-flex items-center gap-1 text-xs font-medium bg-sky-50 text-sky-700 px-2.5 py-1 rounded-full mt-1">
                <MapPin size={12} /> À {book.city}
              </div>
            </div>

            {/* Reservation status */}
            <BookReservation book={book} onBookChange={setBook} />


            <div className="bg-card lg:rounded-xl border px-4 lg:px-6 py-5">
              <h2 className="font-bold text-lg mb-4">Les informations clés</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                <InfoRow icon={<ShieldCheck size={16} />} label="État" value={book.condition} />
                <InfoRow icon={<BookOpen size={16} />} label="Catégorie" value={book.category} />
                <InfoRow
                  icon={book.can_deliver ? <Truck size={16} /> : <Package size={16} />}
                  label="Remise"
                  value={book.can_deliver ? "Livraison possible" : "Remise en main propre"}
                />
              </div>
            </div>

            {/* Description */}
            <div className="bg-card lg:rounded-xl border px-4 lg:px-6 py-5">
              <h2 className="font-bold text-lg mb-2">Description</h2>
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {book.description || "Aucune description fournie."}
              </p>
            </div>

            {/* Location */}
            <div className="bg-card lg:rounded-xl border px-4 lg:px-6 py-5">
              <h2 className="font-bold text-lg mb-2">Localisation</h2>
              <p className="text-sm font-medium">{book.city}</p>
              <div className="mt-3 aspect-[16/9] w-full rounded-lg overflow-hidden border bg-muted">
                <iframe
                  title="map"
                  className="w-full h-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(book.city + ", France")}&output=embed`}
                />
              </div>
            </div>

            {/* Sold by */}
            <div className="bg-card lg:rounded-xl border px-4 lg:px-6 py-5">
              <h2 className="font-bold text-lg mb-3">Vendu par</h2>
              <div className="flex items-center gap-3">
                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-white font-bold", colorFor(book.seller_id))}>
                  {initial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-base truncate">{book.seller_name}</p>
                  <OnlineStatusLabel userId={book.seller_id} />
                  {rating ? (
                    <div className="flex items-center gap-1 text-xs mt-0.5">
                      <Star size={12} className="fill-amber-500 text-amber-500" />
                      <span className="font-semibold">{rating.avg.toFixed(1)}</span>
                      <span className="text-muted-foreground">({rating.count})</span>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5">Aucun avis</p>
                  )}
                </div>
              </div>
              {joinedLabel && (
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarDays size={14} /> Membre depuis {joinedLabel}
                </div>
              )}

              <div className="mt-5 border-t pt-4">
                <SellerReviews sellerId={book.seller_id} />
              </div>

              <div className="mt-4 pt-4 border-t flex items-center gap-4 text-xs text-muted-foreground">
                <button className="flex items-center gap-1.5 hover:text-foreground"><Flag size={13} /> Signaler l'annonce</button>
                <button className="flex items-center gap-1.5 hover:text-foreground"><Info size={13} /> Vos droits</button>
              </div>
            </div>
          </div>

          {/* RIGHT column — sticky seller card (desktop) */}
          <aside className="hidden lg:block">
            <div className="sticky top-4 space-y-3">
              <div className="bg-card rounded-xl border p-5">
                <div className="flex items-center gap-3">
                  <div className={cn("w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg", colorFor(book.seller_id))}>
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-lg truncate">{book.seller_name}</p>
                    {rating ? (
                      <div className="flex items-center gap-1 text-xs">
                        <Star size={12} className="fill-amber-500 text-amber-500" />
                        <span className="font-semibold">{rating.avg.toFixed(1)}</span>
                        <span className="text-muted-foreground">({rating.count})</span>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Aucun avis</p>
                    )}
                  </div>
                </div>

                {!isOwner && (
                  <div className="mt-4 space-y-2">
                    <Button
                      onClick={handleContactSeller}
                      disabled={creating}
                      className="w-full h-11 rounded-full font-semibold bg-primary"
                    >
                      <MessageCircle size={16} className="mr-1.5" />
                      {creating ? "Ouverture..." : "Contacter"}
                    </Button>
                  </div>
                )}
                {isOwner && (
                  <p className="mt-4 text-xs text-center text-muted-foreground">Ceci est votre annonce</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Sticky bottom contact (mobile) */}
      {!isOwner && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3 bg-card/95 backdrop-blur-xl border-t z-50">
          <Button disabled={creating} onClick={handleContactSeller}
            className="w-full h-11 rounded-full text-sm font-semibold flex items-center justify-center gap-1.5">
            {creating ? "Ouverture..." : <><MessageCircle size={16} /> Contacter le vendeur</>}
          </Button>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground/70 shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold truncate">{value}</p>
      </div>
    </div>
  );
}
