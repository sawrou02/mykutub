import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, ChevronRight, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import type { Chat } from "@/lib/mykutub";

export const Route = createFileRoute("/messages/")({
  component: MessagesPage,
});

function MessagesPage() {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase.from("chats").select("*").contains("participants", [user.id])
      .order("last_message_at", { ascending: false })
      .then(({ data }) => {
        setChats((data as Chat[]) ?? []);
        setLoading(false);
      });

    const channel = supabase.channel("chats-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "chats" }, () => {
        supabase.from("chats").select("*").contains("participants", [user.id])
          .order("last_message_at", { ascending: false })
          .then(({ data }) => setChats((data as Chat[]) ?? []));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <MessageSquare size={60} className="text-muted-foreground/30 mb-4" />
        <h1 className="text-xl font-bold">Connectez-vous pour voir vos messages</h1>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-card border-b px-6 py-6 shadow-sm">
        <h1 className="font-headline font-black text-3xl text-primary tracking-tight">Messages</h1>
      </header>

      <div className="p-4">
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input placeholder="Rechercher une conversation..." className="pl-12 h-14 bg-card border-none rounded-2xl shadow-sm" />
        </div>

        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-card rounded-3xl animate-pulse" />)
          ) : chats.length > 0 ? (
            chats.map(chat => {
              const lastUpdate = chat.last_message_at ? new Date(chat.last_message_at) : null;
              const isUnread = chat.unread_by?.includes(user.id);
              return (
                <Link key={chat.id} to="/messages/$id" params={{ id: chat.id }}
                  className="flex items-center gap-4 p-4 rounded-3xl bg-card hover:bg-muted/30 transition-all border border-transparent hover:border-border group shadow-sm">
                  <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-muted flex-shrink-0">
                    {chat.book_image_url && <img src={chat.book_image_url} alt={chat.book_title ?? ""} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0 py-1">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h3 className="font-black text-sm truncate">Conversation</h3>
                      <span className="text-[10px] text-muted-foreground font-bold">
                        {lastUpdate ? formatDistanceToNow(lastUpdate, { addSuffix: true, locale: fr }) : ""}
                      </span>
                    </div>
                    <p className="text-[11px] font-black text-primary mb-1 truncate uppercase tracking-tight">{chat.book_title}</p>
                    <p className={`text-xs truncate ${isUnread ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                      {chat.last_message}
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    {isUnread && <div className="w-3 h-3 rounded-full bg-secondary shadow-lg" />}
                    <ChevronRight size={16} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
              <div className="p-8 bg-muted/50 rounded-full text-muted-foreground/30">
                <MessageSquare size={60} />
              </div>
              <div>
                <p className="font-black text-xl">Silence radio...</p>
                <p className="text-sm text-muted-foreground font-medium mt-1">
                  Vos conversations s'afficheront ici une fois<br/>que vous aurez contacté un vendeur.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
