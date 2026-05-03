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
    <div className="bg-background min-h-screen pb-20">
      <header className="sticky top-0 z-40 bg-card border-b px-4 py-3">
        <h1 className="font-bold text-base">Messages</h1>
      </header>

      <div className="max-w-3xl mx-auto p-3">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
          <Input placeholder="Rechercher..." className="pl-9 h-9 text-sm bg-card rounded-lg" />
        </div>

        <div className="divide-y border rounded-lg bg-card">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 animate-pulse bg-muted/30" />)
          ) : chats.length > 0 ? (
            chats.map(chat => {
              const lastUpdate = chat.last_message_at ? new Date(chat.last_message_at) : null;
              const isUnread = chat.unread_by?.includes(user.id);
              return (
                <Link key={chat.id} to="/messages/$id" params={{ id: chat.id }}
                  className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted/30 transition-colors">
                  <div className="relative w-11 h-11 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    {chat.book_image_url && <img src={chat.book_image_url} alt={chat.book_title ?? ""} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline gap-2">
                      <p className="text-[11px] font-semibold text-primary truncate">{chat.book_title}</p>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {lastUpdate ? formatDistanceToNow(lastUpdate, { addSuffix: true, locale: fr }) : ""}
                      </span>
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${isUnread ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                      {chat.last_message}
                    </p>
                  </div>
                  {isUnread && <div className="w-2 h-2 rounded-full bg-destructive flex-shrink-0" />}
                  <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />
                </Link>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare size={36} className="text-muted-foreground/30 mb-2" />
              <p className="font-semibold text-sm">Aucune conversation</p>
              <p className="text-xs text-muted-foreground mt-1">
                Contactez un vendeur pour démarrer une discussion.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
