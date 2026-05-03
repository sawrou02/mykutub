import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Settings, LogOut, Package, Heart, UserCircle, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookCard } from "@/components/BookCard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Book } from "@/lib/mykutub";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [myBooks, setMyBooks] = useState<Book[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("books").select("*").eq("seller_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setMyBooks((data as Book[]) ?? []));
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette annonce ?")) return;
    const { error } = await supabase.from("books").delete().eq("id", id);
    if (error) toast.error("Erreur lors de la suppression");
    else {
      setMyBooks(b => b.filter(x => x.id !== id));
      toast.success("Annonce supprimée");
    }
  };

  if (authLoading) return <div className="p-10 text-center">Chargement...</div>;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center space-y-6">
        <UserCircle size={80} className="text-muted-foreground" />
        <h1 className="text-2xl font-bold">Connectez-vous pour voir votre profil</h1>
        <Button onClick={() => navigate({ to: "/login" })} className="w-full h-14 text-lg font-bold rounded-xl">
          Se connecter
        </Button>
      </div>
    );
  }

  const displayName = user.user_metadata?.display_name || user.email?.split("@")[0] || "Utilisateur";

  return (
    <div className="bg-background min-h-screen pb-24">
      <header className="bg-card border-b px-6 py-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-card shadow-md">
              <UserCircle className="text-primary" size={48} />
            </div>
            <div>
              <h1 className="font-headline font-bold text-2xl tracking-tight">{displayName}</h1>
              <p className="text-sm text-muted-foreground mb-2">Membre MYKUTUB</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full"><Settings size={20} /></Button>
        </div>
      </header>

      <div className="p-4">
        <Tabs defaultValue="ads">
          <TabsList className="w-full bg-transparent border-b rounded-none h-12 mb-6">
            <TabsTrigger value="ads" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary font-bold">
              Mes Annonces
            </TabsTrigger>
            <TabsTrigger value="likes" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary font-bold">
              Favoris
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ads">
            <div className="grid grid-cols-2 gap-4">
              {myBooks.map(book => (
                <div key={book.id} className="relative group">
                  <BookCard book={book} />
                  <button onClick={(e) => { e.preventDefault(); handleDelete(book.id); }}
                    className="absolute top-2 left-2 p-2 bg-destructive text-destructive-foreground rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <Link to="/publish" className="aspect-[3/4] border-2 border-dashed border-primary/20 rounded-2xl flex flex-col items-center justify-center text-primary/60 hover:bg-primary/5 transition-colors gap-2">
                <Package size={32} />
                <span className="font-bold text-xs uppercase tracking-wider">Nouvelle annonce</span>
              </Link>
            </div>
          </TabsContent>

          <TabsContent value="likes">
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Heart size={40} className="text-muted-foreground mb-4" />
              <p className="font-bold text-lg">Aucun favori</p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-8 space-y-3">
          <h2 className="font-headline font-bold text-lg px-2">Paramètres</h2>
          <div className="bg-card rounded-2xl overflow-hidden shadow-sm border">
            <button onClick={handleLogout} className="w-full flex items-center justify-between p-4 hover:bg-destructive/10 text-destructive transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-lg"><LogOut size={18} /></div>
                <span className="font-bold text-sm">Déconnexion</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
