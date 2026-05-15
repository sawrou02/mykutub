import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { OnlineDot } from "@/components/OnlineDot";
import { cn } from "@/lib/utils";
import type { Chat } from "@/lib/mykutub";
import { MessageSquare, Search, User as UserIcon, BookOpen } from "lucide-react";

type ProfileLite = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

function formatTime(date: Date) {
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Hier";
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays < 7) return date.toLocaleDateString("fr-FR", { weekday: "short" });
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

export function ContactsSidebar({ activeChatId }: { activeChatId?: string }) {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [me, setMe] = useState<ProfileLite | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    supabase.from("profiles").select("id,display_name,avatar_url").eq("id", user.id).single()
      .then(({ data }) => setMe(data as ProfileLite | null));
    const load = async () => {
      const { data } = await supabase
        .from("chats").select("*")
        .contains("participants", [user.id])
        .order("last_message_at", { ascending: false });
      const list = (data as Chat[]) ?? [];
      setChats(list);
      const otherIds = Array.from(new Set(list.map((c) => c.participants.find((p) => p !== user.id)).filter(Boolean) as string[]));
      if (otherIds.length) {
        const { data: profs } = await supabase
          .from("profiles").select("id,display_name,avatar_url").in("id", otherIds);
        const map: Record<string, ProfileLite> = {};
        (profs as ProfileLite[] ?? []).forEach((p) => { map[p.id] = p; });
        setProfiles(map);
      }
      setLoading(false);
    };
    load();
    const channel = supabase
      .channel(`chats-sidebar-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chats" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const filtered = useMemo(() => {
    if (!user) return [];
    const q = search.trim().toLowerCase();
    return chats.filter((c) => {
      if (filter === "unread" && !c.unread_by?.includes(user.id)) return false;
      if (!q) return true;
      const otherId = c.participants.find((p) => p !== user.id);
      const name = (otherId && profiles[otherId]?.display_name) || "";
      return name.toLowerCase().includes(q)
        || (c.book_title ?? "").toLowerCase().includes(q)
        || (c.last_message ?? "").toLowerCase().includes(q);
    });
  }, [chats, profiles, search, user, filter]);

  const unreadCount = useMemo(() => {
    if (!user) return 0;
    return chats.filter((c) => c.unread_by?.includes(user.id)).length;
  }, [chats, user]);

  if (!user) return null;

  const myName = me?.display_name || user.user_metadata?.display_name || user.email?.split("@")[0] || "Moi";
  const myInitials = myName.split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col h-full bg-card">
      {/* My profile header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden border">
          {me?.avatar_url ? (
            <img src={me.avatar_url} alt={myName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-muted-foreground">{myInitials || <UserIcon size={18} />}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{myName}</p>
          <p className="text-xs text-muted-foreground">Mes conversations</p>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une conversation"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-muted/50 text-sm border-none outline-none focus:bg-muted"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-3 py-2 border-b flex items-center gap-2">
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors",
            filter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70",
          )}
        >
          Tout ({chats.length})
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1",
            filter === "unread" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70",
          )}
        >
          Non lus
          {unreadCount > 0 && (
            <span className={cn(
              "min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center",
              filter === "unread" ? "bg-primary-foreground text-primary" : "bg-destructive text-white",
            )}>{unreadCount}</span>
          )}
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto thin-scroll">
        {loading ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <MessageSquare size={32} className="text-muted-foreground/30 mb-2" />
            <p className="text-sm font-semibold">Aucune conversation</p>
          </div>
        ) : (
          filtered.map((chat) => {
            const isActive = activeChatId === chat.id || pathname === `/messages/${chat.id}`;
            const isUnread = chat.unread_by?.includes(user.id);
            const otherId = chat.participants.find((p) => p !== user.id);
            const profile = otherId ? profiles[otherId] : null;
            const contactName = profile?.display_name || "Utilisateur";
            const lastUpdate = chat.last_message_at ? new Date(chat.last_message_at) : null;
            return (
              <Link
                key={chat.id}
                to="/messages/$id"
                params={{ id: chat.id }}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 transition-colors border-b border-border/40 border-l-4 relative",
                  isActive
                    ? "bg-primary/5 border-l-primary"
                    : "border-l-transparent bg-card hover:bg-muted/40",
                )}
              >
                {/* Book thumbnail */}
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-14 rounded-md bg-muted overflow-hidden border flex items-center justify-center">
                    {chat.book_image_url ? (
                      <img src={chat.book_image_url} alt={chat.book_title ?? ""} className="w-full h-full object-cover" />
                    ) : (
                      <BookOpen size={18} className="text-muted-foreground/50" />
                    )}
                  </div>
                  <span className="absolute -bottom-1 -right-1">
                    <OnlineDot userId={otherId} size={10} />
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline gap-2">
                    <p className={cn("text-sm truncate", isUnread ? "font-bold" : "font-semibold")}>
                      {chat.book_title || "Conversation"}
                    </p>
                    <span className={cn("text-[10px] flex-shrink-0", isUnread ? "text-primary font-semibold" : "text-muted-foreground")}>
                      {lastUpdate ? formatTime(lastUpdate) : ""}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{contactName}</p>
                  <div className="flex justify-between items-center gap-2 mt-0.5">
                    <p className={cn("text-xs truncate", isUnread ? "font-semibold text-foreground" : "text-muted-foreground/80")}>
                      {chat.last_message || "Nouvelle conversation"}
                    </p>
                    {isUnread && (
                      <span className="flex-shrink-0 px-1.5 h-4 rounded-full bg-destructive text-white text-[9px] font-bold flex items-center justify-center uppercase tracking-wide">
                        Nouveau
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
