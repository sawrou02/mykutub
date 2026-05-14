import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { OnlineDot } from "@/components/OnlineDot";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Chat } from "@/lib/mykutub";
import { MessageSquare } from "lucide-react";

/** Contact list rendered as a sidebar, used both standalone and beside chat. */
export function ContactsSidebar({ activeChatId }: { activeChatId?: string }) {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const load = () =>
      supabase
        .from("chats")
        .select("*")
        .contains("participants", [user.id])
        .order("last_message_at", { ascending: false })
        .then(({ data }) => {
          setChats((data as Chat[]) ?? []);
          setLoading(false);
        });
    load();
    const channel = supabase
      .channel(`chats-sidebar-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chats" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (!user) return null;

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="px-4 py-3 border-b">
        <h2 className="font-bold text-base">Messages</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 rounded bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <MessageSquare size={32} className="text-muted-foreground/30 mb-2" />
            <p className="text-sm font-semibold">Aucune conversation</p>
            <p className="text-xs text-muted-foreground mt-1">
              Contactez un vendeur pour démarrer.
            </p>
          </div>
        ) : (
          chats.map((chat) => {
            const isActive = activeChatId === chat.id || pathname === `/messages/${chat.id}`;
            const isUnread = chat.unread_by?.includes(user.id);
            const otherId = chat.participants.find((p) => p !== user.id);
            const lastUpdate = chat.last_message_at ? new Date(chat.last_message_at) : null;
            return (
              <Link
                key={chat.id}
                to="/messages/$id"
                params={{ id: chat.id }}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 border-b transition-colors",
                  isActive ? "bg-primary/10" : "hover:bg-muted/40",
                )}
              >
                <div className="relative w-11 h-11 rounded-md overflow-hidden bg-muted flex-shrink-0">
                  {chat.book_image_url && (
                    <img src={chat.book_image_url} alt={chat.book_title ?? ""} className="w-full h-full object-cover" />
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5">
                    <OnlineDot userId={otherId} size={11} />
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline gap-2">
                    <p className="text-[11px] font-semibold text-primary truncate">{chat.book_title}</p>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">
                      {lastUpdate ? formatDistanceToNow(lastUpdate, { addSuffix: true, locale: fr }) : ""}
                    </span>
                  </div>
                  <p className={cn("text-xs truncate mt-0.5", isUnread ? "font-semibold text-foreground" : "text-muted-foreground")}>
                    {chat.last_message}
                  </p>
                </div>
                {isUnread && <div className="w-2 h-2 rounded-full bg-destructive flex-shrink-0" />}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
