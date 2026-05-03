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

  if (loading) return <div className="p-10 text-center">Chargement...</div>;
  if (!book) return <div className="p-10 text-center">Livre introuvable</div>;

  return (
    <div className="bg-card min-h-screen pb-32">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-xl z-50 flex items-center justify-between px-4 h-14">
        <button onClick={() => history.back()} className="p-2 rounded-full bg-card/80 backdrop-blur-md shadow-sm">
          <ChevronLeft size={20} />
        </button>
        <button onClick={handleShare} className="p-2 rounded-full bg-card/80 backdrop-blur-md shadow-sm"><Share2 size={20} /></button>
      </div>

      <div className="relative aspect-[3/4] w-full bg-muted">
        <img src={book.image_url} alt={book.title} className="absolute inset-0 w-full h-full object-cover" />
        {book.is_donation && (
          <div className="absolute bottom-6 left-6 z-10">
            <Badge className="bg-secondary text-secondary-foreground font-black px-4 py-2 text-sm uppercase tracking-widest shadow-lg">Sadaqa</Badge>
          </div>
        )}
      </div>

      <div className="px-6 py-8 space-y-8 bg-card -mt-4 rounded-t-3xl relative z-10 shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
        <div className="space-y-4">
          <div className="flex justify-between items-start gap-4">
            <h1 className="font-headline text-2xl font-bold leading-tight flex-1">{book.title}</h1>
            <p className="font-headline text-3xl font-black text-primary">
              {book.is_donation ? "GRATUIT" : `${book.price}€`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded-lg border-primary/20 text-primary py-1.5 px-3 font-bold bg-primary/5">
              <BookOpen size={14} className="mr-1.5" /> {book.category}
            </Badge>
            <Badge variant="outline" className="rounded-lg border-border py-1.5 px-3 font-medium">
              <ShieldCheck size={14} className="mr-1.5" /> {book.condition}
            </Badge>
            <Badge variant="outline" className={`rounded-lg py-1.5 px-3 font-medium ${book.can_deliver ? "border-green-600/30 text-green-700 bg-green-50" : "border-border text-muted-foreground"}`}>
              {book.can_deliver ? <><Truck size={14} className="mr-1.5" /> Livraison possible</> : <><Package size={14} className="mr-1.5" /> Retrait uniquement</>}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-y py-6 border-dashed">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Localisation</span>
            <div className="flex items-center font-bold text-sm"><MapPin size={16} className="mr-2 text-primary" />{book.city}</div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Vendeur</span>
            <div className="flex items-center font-bold text-sm">{book.seller_name}</div>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="font-headline font-bold text-lg text-primary border-l-4 border-secondary pl-3">Description</h2>
          <p className="text-muted-foreground leading-relaxed text-sm">{book.description || "Aucune description fournie."}</p>
        </div>

        <div className="pt-4 border-t">
          <SellerReviews sellerId={book.seller_id} />
        </div>
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-xl p-4 bg-card/80 backdrop-blur-xl border-t z-50 pb-8">
        <Button disabled={creating} onClick={handleContactSeller}
          className="w-full h-14 rounded-2xl text-lg font-bold flex items-center justify-center gap-2 bg-primary">
          {creating ? "Ouverture..." : <><MessageCircle size={22} /> Contacter le vendeur</>}
        </Button>
      </div>
    </div>
  );
}
