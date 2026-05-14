import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Users, BookOpen, MessageSquare, Star, ShieldCheck, Loader2, Mail, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  const navigate = useNavigate();
  const { isAdmin, loading } = useIsAdmin();
  const [stats, setStats] = useState({ users: 0, books: 0, messages: 0, reviews: 0 });
  const [books, setBooks] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [contactMsgs, setContactMsgs] = useState<any[]>([]);
  const [openMsgId, setOpenMsgId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([
      supabase.from("profiles").select("*", { count: "exact" }),
      supabase.from("books").select("*").order("created_at", { ascending: false }),
      supabase.from("messages").select("id", { count: "exact", head: true }),
      supabase.from("reviews").select("*").order("created_at", { ascending: false }),
      supabase.from("contact_messages").select("*").order("created_at", { ascending: false }),
    ]).then(([p, b, m, r, c]) => {
      setProfiles(p.data ?? []);
      setBooks(b.data ?? []);
      setReviews(r.data ?? []);
      setContactMsgs(c.data ?? []);
      setStats({
        users: p.count ?? 0,
        books: b.data?.length ?? 0,
        messages: m.count ?? 0,
        reviews: r.data?.length ?? 0,
      });
    });
  }, [isAdmin]);

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto p-10 text-center space-y-4">
        <ShieldCheck size={48} className="mx-auto text-muted-foreground" />
        <h1 className="text-2xl font-bold">Accès refusé</h1>
        <p className="text-muted-foreground">Cette page est réservée aux administrateurs.</p>
        <Button onClick={() => navigate({ to: "/" })}>Retour à l'accueil</Button>
      </div>
    );
  }

  const deleteBook = async (id: string) => {
    if (!confirm("Supprimer cette annonce ?")) return;
    const { error } = await supabase.from("books").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setBooks(b => b.filter(x => x.id !== id));
    toast.success("Annonce supprimée");
  };

  const deleteReview = async (id: string) => {
    if (!confirm("Supprimer cet avis ?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setReviews(r => r.filter(x => x.id !== id));
    toast.success("Avis supprimé");
  };

  const openMessage = async (id: string, isRead: boolean) => {
    setOpenMsgId(prev => prev === id ? null : id);
    if (!isRead) {
      const { error } = await supabase.from("contact_messages").update({ is_read: true }).eq("id", id);
      if (!error) setContactMsgs(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m));
    }
  };

  const deleteContactMsg = async (id: string) => {
    if (!confirm("Supprimer ce message ?")) return;
    const { error } = await supabase.from("contact_messages").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setContactMsgs(prev => prev.filter(m => m.id !== id));
    toast.success("Message supprimé");
  };

  const unreadCount = contactMsgs.filter(m => !m.is_read).length;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 pb-24 space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="text-primary" size={28} />
        <h1 className="font-headline text-3xl font-bold">Administration</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Users size={20} />} label="Utilisateurs" value={stats.users} />
        <StatCard icon={<BookOpen size={20} />} label="Annonces" value={stats.books} />
        <StatCard icon={<MessageSquare size={20} />} label="Messages" value={stats.messages} />
        <StatCard icon={<Star size={20} />} label="Avis" value={stats.reviews} />
      </div>

      <Tabs defaultValue="books">
        <TabsList>
          <TabsTrigger value="books">Annonces</TabsTrigger>
          <TabsTrigger value="reviews">Avis</TabsTrigger>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="contact" className="relative">
            <Inbox size={14} className="mr-1.5" /> Contact
            {unreadCount > 0 && (
              <Badge className="ml-2 h-5 min-w-5 px-1.5 bg-destructive text-destructive-foreground">{unreadCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="books" className="space-y-2">
          {books.map(b => (
            <Card key={b.id} className="p-3 flex items-center gap-3">
              <img src={b.image_url} alt="" className="w-14 h-14 object-cover rounded" />
              <div className="flex-1 min-w-0">
                <Link to="/book/$id" params={{ id: b.id }} className="font-semibold hover:underline truncate block">{b.title}</Link>
                <p className="text-xs text-muted-foreground">{b.seller_name} · {b.city} · {b.is_donation ? "Don" : `${b.price}€`}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => deleteBook(b.id)} className="text-destructive">
                <Trash2 size={16} />
              </Button>
            </Card>
          ))}
          {books.length === 0 && <p className="text-muted-foreground text-center py-8">Aucune annonce</p>}
        </TabsContent>

        <TabsContent value="reviews" className="space-y-2">
          {reviews.map(r => (
            <Card key={r.id} className="p-3 flex items-start gap-3">
              <Star className="text-amber-500 mt-1" size={18} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{r.reviewer_name} · {r.rating}/5</p>
                {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
              </div>
              <Button size="icon" variant="ghost" onClick={() => deleteReview(r.id)} className="text-destructive">
                <Trash2 size={16} />
              </Button>
            </Card>
          ))}
          {reviews.length === 0 && <p className="text-muted-foreground text-center py-8">Aucun avis</p>}
        </TabsContent>

        <TabsContent value="users" className="space-y-2">
          {profiles.map(p => (
            <Card key={p.id} className="p-3 flex items-center justify-between">
              <div>
                <p className="font-semibold">{p.display_name ?? "Sans nom"}</p>
                <p className="text-xs text-muted-foreground font-mono">{p.id.slice(0, 8)}…</p>
              </div>
              <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">{icon}{label}</div>
      <p className="text-3xl font-bold font-headline">{value}</p>
    </Card>
  );
}
