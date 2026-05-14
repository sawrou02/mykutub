import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { OnlineDot } from "@/components/OnlineDot";
import { cn } from "@/lib/utils";
import type { Chat } from "@/lib/mykutub";
import { MessageSquare, Search, User as UserIcon } from "lucide-react";

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
    if (!q) return chats;
    return chats.filter((c) => {
      const otherId = c.participants.find((p) => p !== user.id);
      const name = (otherId && profiles[otherId]?.display_name) || "";
      return name.toLowerCase().includes(q)
        || (c.book_title ?? "").toLowerCase().includes(q)
        || (c.last_message ?? "").toLowerCase().includes(q);
    });
  }, [chats, profiles, search, user]);

  if (!user) return null;

  const myName = me?.display_name || user.user_metadata?.display_name || user.email?.split("@")[0] || "Moi";
  const myInitials = myName.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col h-full" style={{ background: "#f0f2f5" }}>
      {/* My profile header */}
      <div className="px-4 py-3 flex items-center gap-3 bg-card border-b">
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
      <div className="px-3 py-2 bg-card border-b">
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
            const initials = contactName.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
            const lastUpdate = chat.last_message_at ? new Date(chat.last_message_at) : null;
            return (
              <Link
                key={chat.id}
                to="/messages/$id"
                params={{ id: chat.id }}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 transition-colors border-b border-border/40",
                  isActive ? "bg-primary/10" : "bg-card hover:bg-muted/50",
                )}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden border">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt={contactName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground">{initials || <UserIcon size={18} />}</span>
                    )}
                  </div>
                  <span className="absolute bottom-0 right-0">
                    <OnlineDot userId={otherId} size={12} />
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline gap-2">
                    <p className="font-semibold text-sm truncate">{contactName}</p>
                    <span className={cn("text-[10px] flex-shrink-0", isUnread ? "text-primary font-semibold" : "text-muted-foreground")}>
                      {lastUpdate ? formatTime(lastUpdate) : ""}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2 mt-0.5">
                    <p className={cn("text-xs truncate", isUnread ? "font-semibold text-foreground" : "text-muted-foreground")}>
                      {chat.last_message || chat.book_title || "Nouvelle conversation"}
                    </p>
                    {isUnread && (
                      <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center">
                        1
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
