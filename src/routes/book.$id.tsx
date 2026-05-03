import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, MapPin, Share2, ShieldCheck, BookOpen, MessageCircle, Truck, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Book } from "@/lib/mykutub";
import { SellerReviews } from "@/components/SellerReviews";

export const Route = createFileRoute("/book/$id")({
  component: BookDetailPage,
});

function BookDetailPage() {
  const { id: bookId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    supabase.from("books").select("*").eq("id", bookId).single()
      .then(({ data }) => { setBook(data as Book | null); setLoading(false); });
  }, [bookId]);

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

  if (loading) return <div className="p-10 text-center">Chargement...</div>;
  if (!book) return <div className="p-10 text-center">Livre introuvable</div>;

  return (
    <div className="bg-background min-h-screen pb-20">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl z-50 flex items-center justify-between px-3 h-12">
        <button onClick={() => history.back()} className="p-1.5 rounded-full bg-card/90 backdrop-blur-md shadow-sm">
          <ChevronLeft size={16} />
        </button>
        <button onClick={handleShare} className="p-1.5 rounded-full bg-card/90 backdrop-blur-md shadow-sm"><Share2 size={16} /></button>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="relative aspect-[4/3] sm:aspect-[16/9] w-full bg-muted">
          <img src={book.image_url} alt={book.title} className="absolute inset-0 w-full h-full object-cover" />
          {book.is_donation && (
            <Badge className="absolute bottom-3 left-3 bg-secondary text-secondary-foreground text-[10px] font-bold uppercase px-2 py-0.5">Sadaqa</Badge>
          )}
        </div>

        <div className="px-4 py-4 space-y-4 bg-card">
          <div className="space-y-2">
            <p className="font-bold text-xl text-foreground">
              {book.is_donation ? "Gratuit" : `${book.price} €`}
            </p>
            <h1 className="font-semibold text-base leading-tight">{book.title}</h1>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin size={12} /> {book.city}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 text-[11px]">
            <Badge variant="outline" className="rounded-md py-0.5 px-2 font-normal">
              <BookOpen size={10} className="mr-1" /> {book.category}
            </Badge>
            <Badge variant="outline" className="rounded-md py-0.5 px-2 font-normal">
              <ShieldCheck size={10} className="mr-1" /> {book.condition}
            </Badge>
            <Badge variant="outline" className={`rounded-md py-0.5 px-2 font-normal ${book.can_deliver ? "border-green-600/30 text-green-700 bg-green-50" : ""}`}>
              {book.can_deliver ? <><Truck size={10} className="mr-1" /> Livraison</> : <><Package size={10} className="mr-1" /> Retrait</>}
            </Badge>
          </div>

          <div className="border-t pt-3">
            <h2 className="font-semibold text-sm mb-1.5">Description</h2>
            <p className="text-muted-foreground text-xs leading-relaxed whitespace-pre-wrap">{book.description || "Aucune description fournie."}</p>
          </div>

          <div className="border-t pt-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Vendeur</p>
              <p className="font-semibold text-sm">{book.seller_name}</p>
            </div>
          </div>

          <div className="border-t pt-3">
            <SellerReviews sellerId={book.seller_id} />
          </div>
        </div>
      </div>

      {user?.id !== book.seller_id && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl p-3 bg-card/95 backdrop-blur-xl border-t z-50">
          <Button disabled={creating} onClick={handleContactSeller}
            className="w-full h-10 rounded-full text-sm font-semibold flex items-center justify-center gap-1.5">
            {creating ? "Ouverture..." : <><MessageCircle size={14} /> Contacter le vendeur</>}
          </Button>
        </div>
      )}
    </div>
  );
}
