import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, UserCircle, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BookCard } from "@/components/BookCard";
import { SellerReviews } from "@/components/SellerReviews";
import type { Book } from "@/lib/mykutub";

export const Route = createFileRoute("/user/$id")({
  validateSearch: (s: Record<string, unknown>) => ({
    chatId: typeof s.chatId === "string" ? s.chatId : undefined,
  }),
  component: UserProfilePage,
});

function UserProfilePage() {
  const { id: userId } = Route.useParams();
  const { chatId } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ display_name: string | null } | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
      supabase.from("books").select("*").eq("seller_id", userId).order("created_at", { ascending: false }),
    ]).then(([p, b]) => {
      setProfile((p.data as any) ?? { display_name: null });
      setBooks((b.data as Book[]) ?? []);
      setLoading(false);
    });
  }, [userId]);

  const displayName = profile?.display_name || "Utilisateur";
  const initials = displayName.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();
  const isMe = user?.id === userId;

  if (loading) return <div className="p-10 text-center">Chargement...</div>;

  return (
    <div className="bg-background min-h-screen pb-24">
      <header className="bg-card border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={() => history.back()} className="p-1">
          <ChevronLeft size={24} className="text-primary" />
        </button>
        <h1 className="font-bold">Profil</h1>
      </header>

      <section className="bg-card border-b px-6 py-8">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-card shadow-md text-primary font-bold text-xl">
            {initials || <UserCircle size={48} />}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-headline font-bold text-2xl tracking-tight truncate">{displayName}</h2>
            <p className="text-sm text-muted-foreground">Membre MYKUTUB</p>
          </div>
          {!isMe && user && (
            <Link
              to="/messages"
              className="p-3 bg-primary text-primary-foreground rounded-full"
              aria-label="Message"
            >
              <MessageCircle size={18} />
            </Link>
          )}
        </div>
      </section>

      <div className="p-4 space-y-8">
        <section>
          <h3 className="font-headline font-bold text-lg mb-3">Annonces ({books.length})</h3>
          {books.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune annonce publiée.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {books.map(book => <BookCard key={book.id} book={book} />)}
            </div>
          )}
        </section>

        <section className="bg-card border rounded-2xl p-4">
          <SellerReviews sellerId={userId} chatId={chatId} />
        </section>
      </div>
    </div>
  );
}
