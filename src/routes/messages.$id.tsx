import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Send, MoreVertical, User, Flag, Trash2, BookOpen, User as UserIcon, Check, CheckCheck, Smile } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { Chat, Message } from "@/lib/mykutub";
import { ContactsSidebar } from "@/components/ContactsSidebar";
import { OnlineDot, OnlineStatusLabel } from "@/components/OnlineDot";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/messages/$id")({
  component: ChatDetailPage,
});

type ProfileLite = { id: string; display_name: string | null; avatar_url: string | null };

// Subtle WhatsApp-like background pattern (SVG, light)
const CHAT_BG = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'><g fill='%23128C7E' fill-opacity='0.04'><circle cx='10' cy='10' r='2'/><circle cx='40' cy='30' r='1.5'/><circle cx='70' cy='15' r='2'/><circle cx='25' cy='55' r='1.5'/><circle cx='60' cy='65' r='2'/></g></svg>\")";

function dateLabel(d: Date) {
  const today = new Date();
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return "Aujourd'hui";
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (sameDay(d, yesterday)) return "Hier";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}

function ChatDetailPage() {
  const { id: chatId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherProfile, setOtherProfile] = useState<ProfileLite | null>(null);
  const [input, setInput] = useState("");
  const [otherTyping, setOtherTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastTypingSent = useRef(0);

  useEffect(() => {
    supabase.from("chats").select("*").eq("id", chatId).single()
      .then(({ data }) => setChat(data as Chat | null));
    supabase.from("messages").select("*").eq("chat_id", chatId).order("created_at", { ascending: true })
      .then(({ data }) => setMessages((data as Message[]) ?? []));
  }, [chatId]);

  useEffect(() => {
    if (!chat || !user) return;
    const otherId = chat.participants.find((p) => p !== user.id);
    if (!otherId) return;
    supabase.from("profiles").select("id,display_name,avatar_url").eq("id", otherId).single()
      .then(({ data }) => setOtherProfile(data as ProfileLite | null));
  }, [chat, user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`chat-${chatId}`, { config: { broadcast: { self: false } } })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        (payload) => setMessages((prev) => [...prev, payload.new as Message]))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        (payload) => setMessages((prev) => prev.map((m) => (m.id === (payload.new as Message).id ? (payload.new as Message) : m))))
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload?.user_id && payload.user_id !== user.id) {
          setOtherTyping(true);
          window.setTimeout(() => setOtherTyping(false), 3000);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [chatId, user]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, otherTyping]);

  useEffect(() => {
    if (!chat || !user) return;
    if (chat.unread_by?.includes(user.id)) {
      const newUnread = chat.unread_by.filter((id) => id !== user.id);
      supabase.from("chats").update({ unread_by: newUnread }).eq("id", chatId).then(() => {});
    }
    supabase.from("messages").update({ read_at: new Date().toISOString() })
      .eq("chat_id", chatId).neq("sender_id", user.id).is("read_at", null).then(() => {});
  }, [chat, user, chatId, messages.length]);

  const broadcastTyping = () => {
    if (!user) return;
    const now = Date.now();
    if (now - lastTypingSent.current < 1500) return;
    lastTypingSent.current = now;
    supabase.channel(`chat-${chatId}`).send({
      type: "broadcast", event: "typing", payload: { user_id: user.id },
    });
  };

  const handleSend = async () => {
    if (!input.trim() || !user || !chat) return;
    const text = input.trim();
    setInput("");
    const recipientId = chat.participants.find((p) => p !== user.id);
    const senderName = user.user_metadata?.display_name || user.email?.split("@")[0] || "Utilisateur";
    await supabase.from("messages").insert({
      chat_id: chatId, sender_id: user.id, sender_name: senderName, text,
    });
    await supabase.from("chats").update({
      last_message: text,
      last_message_at: new Date().toISOString(),
      unread_by: recipientId ? [recipientId] : [],
    }).eq("id", chatId);
  };

  const handleDeleteChat = async () => {
    if (!confirm("Supprimer la conversation ?")) return;
    await supabase.from("chats").delete().eq("id", chatId);
    toast.success("Conversation supprimée");
    navigate({ to: "/messages" });
  };

  // Group messages with date separators
  const grouped = useMemo(() => {
    const out: Array<{ type: "date"; label: string; key: string } | { type: "msg"; msg: Message }> = [];
    let lastDay = "";
    for (const m of messages) {
      const d = new Date(m.created_at);
      const key = d.toDateString();
      if (key !== lastDay) {
        out.push({ type: "date", label: dateLabel(d), key });
        lastDay = key;
      }
      out.push({ type: "msg", msg: m });
    }
    return out;
  }, [messages]);

  if (!chat) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <p className="text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  const otherId = chat.participants.find((p) => p !== user?.id);
  const otherName = otherProfile?.display_name
    || messages.find((m) => m.sender_id !== user?.id)?.sender_name
    || "Utilisateur";
  const initials = otherName.split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase();

  const ChatPane = (
    <div className="flex flex-col h-full" style={{ background: "#efeae2", backgroundImage: CHAT_BG }}>
      {/* Top bar */}
      <header className="bg-card border-b px-3 md:px-4 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate({ to: "/messages" })} className="p-1 md:hidden -ml-1" aria-label="Retour">
            <ChevronLeft size={24} />
          </button>
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden border">
              {otherProfile?.avatar_url ? (
                <img src={otherProfile.avatar_url} alt={otherName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-muted-foreground">{initials || <UserIcon size={18} />}</span>
              )}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5">
              <OnlineDot userId={otherId} size={11} />
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm leading-tight truncate">{otherName}</p>
            {otherTyping ? (
              <p className="text-xs text-primary italic">en train d'écrire…</p>
            ) : (
              <OnlineStatusLabel userId={otherId} />
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 hover:bg-muted rounded-full transition-colors" aria-label="Options">
              <MoreVertical size={18} className="text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl">
            <DropdownMenuItem
              onClick={() => otherId && navigate({ to: "/user/$id", params: { id: otherId }, search: { chatId } })}
              disabled={!otherId}
              className="py-3 cursor-pointer"
            >
              <User size={16} className="mr-2" /> Voir le profil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => toast.success("Signalement envoyé")} className="py-3 text-amber-600 cursor-pointer">
              <Flag size={16} className="mr-2" /> Signaler
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDeleteChat} className="py-3 text-destructive cursor-pointer">
              <Trash2 size={16} className="mr-2" /> Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Book strip */}
      {chat.book_id && (
        <div className="bg-card/95 backdrop-blur border-b px-4 py-2 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded overflow-hidden bg-muted flex-shrink-0">
              {chat.book_image_url && (
                <img src={chat.book_image_url} alt={chat.book_title ?? ""} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-xs uppercase tracking-tight truncate text-primary">
                {chat.book_title}
              </p>
              <p className="text-[10px] text-muted-foreground">Discussion en cours</p>
            </div>
          </div>
          <Link
            to="/book/$id" params={{ id: chat.book_id }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/5 transition-colors flex-shrink-0"
          >
            <BookOpen size={14} /> Voir
          </Link>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto thin-scroll px-3 md:px-6 py-4 space-y-1.5">
        {grouped.map((item) => {
          if (item.type === "date") {
            return (
              <div key={item.key} className="flex justify-center my-3">
                <span className="text-[11px] font-medium px-3 py-1 rounded-md bg-white/80 text-muted-foreground shadow-sm">
                  {item.label}
                </span>
              </div>
            );
          }
          const m = item.msg;
          const mine = m.sender_id === user?.id;
          const time = new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
          return (
            <div key={m.id} className={cn("flex animate-in fade-in slide-in-from-bottom-1 duration-200", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[78%] md:max-w-[65%] px-3 py-1.5 rounded-lg text-sm shadow-sm",
                  mine
                    ? "rounded-tr-sm text-white"
                    : "rounded-tl-sm bg-white text-foreground",
                )}
                style={mine ? { background: "#008069" } : undefined}
              >
                <p className="whitespace-pre-wrap break-words leading-snug">{m.text}</p>
                <div className={cn("flex items-center gap-1 -mb-0.5 mt-0.5 justify-end", mine ? "text-white/80" : "text-muted-foreground")}>
                  <span className="text-[10px]">{time}</span>
                  {mine && (
                    m.read_at
                      ? <CheckCheck size={14} className="text-sky-200" />
                      : <Check size={14} />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {otherTyping && (
          <div className="flex justify-start">
            <div className="bg-white rounded-lg rounded-tl-sm px-3 py-2 shadow-sm">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0.3s]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-2 md:px-4 py-2 flex items-end gap-2 flex-shrink-0" style={{ background: "#f0f2f5" }}>
        <button
          type="button"
          className="p-2.5 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Emoji"
        >
          <Smile size={22} />
        </button>
        <div className="flex-1 bg-white rounded-lg shadow-sm">
          <textarea
            value={input}
            onChange={(e) => { setInput(e.target.value); broadcastTyping(); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder="Écrire un message..."
            rows={1}
            className="w-full resize-none px-4 py-2.5 rounded-lg bg-transparent outline-none text-sm max-h-32"
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className={cn(
            "p-2.5 rounded-full transition-all flex-shrink-0",
            input.trim() ? "text-white scale-100" : "text-muted-foreground bg-muted scale-90",
          )}
          style={input.trim() ? { background: "#008069" } : undefined}
          aria-label="Envoyer"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden">
      <aside className="hidden md:flex w-[280px] border-r flex-shrink-0 h-full">
        <ContactsSidebar activeChatId={chatId} />
      </aside>
      <section className="flex-1 h-full min-w-0">{ChatPane}</section>
    </div>
  );
}
