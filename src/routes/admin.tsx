import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Users, BookOpen, MessageSquare, Star, ShieldCheck, Loader2, Mail, Inbox, Flag, Check } from "lucide-react";
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
  const [reports, setReports] = useState<any[]>([]);
  const [reportBooks, setReportBooks] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([
      supabase.from("profiles").select("*", { count: "exact" }),
      supabase.from("books").select("*").order("created_at", { ascending: false }),
      supabase.from("messages").select("id", { count: "exact", head: true }),
      supabase.from("reviews").select("*").order("created_at", { ascending: false }),
      supabase.from("contact_messages").select("*").order("created_at", { ascending: false }),
      supabase.from("reports").select("*").order("created_at", { ascending: false }),
    ]).then(async ([p, b, m, r, c, rep]) => {
      setProfiles(p.data ?? []);
      setBooks(b.data ?? []);
      setReviews(r.data ?? []);
      setContactMsgs(c.data ?? []);
      setReports(rep.data ?? []);
      const ids = Array.from(new Set((rep.data ?? []).map((x: any) => x.book_id)));
      if (ids.length) {
        const { data: bs } = await supabase.from("books").select("id, title, image_url").in("id", ids);
        const map: Record<string, any> = {};
        (bs ?? []).forEach((bk: any) => { map[bk.id] = bk; });
        setReportBooks(map);
      }
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
  const pendingReports = reports.filter(r => r.statut === "en_attente").length;

  const updateReportStatus = async (id: string, statut: string) => {
    const { error } = await supabase.from("reports").update({ statut }).eq("id", id);
    if (error) return toast.error(error.message);
    setReports(prev => prev.map(r => r.id === id ? { ...r, statut } : r));
    toast.success("Statut mis à jour");
  };

  const deleteReport = async (id: string) => {
    if (!confirm("Supprimer ce signalement ?")) return;
    const { error } = await supabase.from("reports").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setReports(prev => prev.filter(r => r.id !== id));
  };

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
          <TabsTrigger value="reports" className="relative">
            <Flag size={14} className="mr-1.5" /> Signalements
            {pendingReports > 0 && (
              <Badge className="ml-2 h-5 min-w-5 px-1.5 bg-destructive text-destructive-foreground">{pendingReports}</Badge>
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

        <TabsContent value="contact" className="space-y-2">
          {contactMsgs.length === 0 && <p className="text-muted-foreground text-center py-8">Aucun message</p>}
          {contactMsgs.map(m => {
            const isOpen = openMsgId === m.id;
            return (
              <Card key={m.id} className={`p-3 ${!m.is_read ? "border-destructive/40 bg-destructive/5" : ""}`}>
                <div className="flex items-start gap-3">
                  <button onClick={() => openMessage(m.id, m.is_read)} className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {!m.is_read && <Badge className="bg-destructive text-destructive-foreground h-5 text-[10px]">Nouveau</Badge>}
                      <p className="font-semibold truncate">{m.subject}</p>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {m.name} &lt;{m.email}&gt; · {new Date(m.created_at).toLocaleString("fr-FR")}
                    </p>
                    {isOpen && (
                      <div className="mt-3 p-3 bg-muted/50 rounded-lg whitespace-pre-wrap text-sm">{m.message}</div>
                    )}
                  </button>
                  <a href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject)}`}
                    className="p-2 text-primary hover:bg-primary/10 rounded-lg" title="Répondre par email">
                    <Mail size={16} />
                  </a>
                  <Button size="icon" variant="ghost" onClick={() => deleteContactMsg(m.id)} className="text-destructive">
                    <Trash2 size={16} />
                  </Button>
                </div>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="reports" className="space-y-2">
          {reports.length === 0 && <p className="text-muted-foreground text-center py-8">Aucun signalement</p>}
          {reports.map(r => {
            const bk = reportBooks[r.book_id];
            const isPending = r.statut === "en_attente";
            return (
              <Card key={r.id} className={`p-3 ${isPending ? "border-destructive/40 bg-destructive/5" : ""}`}>
                <div className="flex items-start gap-3">
                  {bk?.image_url && <img src={bk.image_url} alt="" className="w-14 h-14 object-cover rounded shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant={isPending ? "destructive" : "secondary"} className="h-5 text-[10px]">{r.statut}</Badge>
                      <Badge variant="outline" className="h-5 text-[10px]">{r.raison}</Badge>
                    </div>
                    {bk ? (
                      <Link to="/book/$id" params={{ id: r.book_id }} className="font-semibold hover:underline truncate block">{bk.title}</Link>
                    ) : (
                      <p className="font-semibold text-muted-foreground italic">Annonce supprimée</p>
                    )}
                    {r.description && <p className="text-xs text-muted-foreground mt-1">{r.description}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString("fr-FR")}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    {isPending && (
                      <>
                        <Button size="icon" variant="ghost" onClick={() => updateReportStatus(r.id, "traite")} className="text-emerald-600" title="Marquer traité">
                          <Check size={16} />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => updateReportStatus(r.id, "rejete")} className="text-muted-foreground" title="Rejeter">
                          <Flag size={16} />
                        </Button>
                      </>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => deleteReport(r.id)} className="text-destructive">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
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
