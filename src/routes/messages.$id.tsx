import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Send, MoreVertical, User, Flag, Trash2, BookOpen, User as UserIcon, Check, CheckCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
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

function ChatDetailPage() {
  const { id: chatId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [otherTyping, setOtherTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<number | null>(null);
  const lastTypingSent = useRef(0);

  useEffect(() => {
    supabase.from("chats").select("*").eq("id", chatId).single()
      .then(({ data }) => setChat(data as Chat | null));
    supabase.from("messages").select("*").eq("chat_id", chatId).order("created_at", { ascending: true })
      .then(({ data }) => setMessages((data as Message[]) ?? []));
  }, [chatId]);

  // Realtime: messages + typing presence
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`chat-${chatId}`, { config: { broadcast: { self: false } } })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        (payload) => setMessages((prev) => [...prev, payload.new as Message]),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        (payload) =>
          setMessages((prev) => prev.map((m) => (m.id === (payload.new as Message).id ? (payload.new as Message) : m))),
      )
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload?.user_id && payload.user_id !== user.id) {
          setOtherTyping(true);
          window.setTimeout(() => setOtherTyping(false), 3000);
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, user]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, otherTyping]);

  // Mark chat unread cleared + mark messages read
  useEffect(() => {
    if (!chat || !user) return;
    if (chat.unread_by?.includes(user.id)) {
      const newUnread = chat.unread_by.filter((id) => id !== user.id);
      supabase.from("chats").update({ unread_by: newUnread }).eq("id", chatId).then(() => {});
    }
    // mark messages where I'm the recipient as read
    supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("chat_id", chatId)
      .neq("sender_id", user.id)
      .is("read_at", null)
      .then(() => {});
  }, [chat, user, chatId, messages.length]);

  const broadcastTyping = () => {
    if (!user) return;
    const now = Date.now();
    if (now - lastTypingSent.current < 1500) return;
    lastTypingSent.current = now;
    supabase.channel(`chat-${chatId}`).send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: user.id },
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

  if (!chat) return <div className="p-10 text-center">Chargement...</div>;

  const otherId = chat.participants.find((p) => p !== user?.id);
  const otherName = messages.find((m) => m.sender_id !== user?.id)?.sender_name || "Utilisateur";
  const initials = otherName.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  const ChatPane = (
    <div className="flex flex-col h-full bg-muted/20 max-w-[800px] w-full mx-auto">
      {/* Top bar */}
      <header className="bg-card border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate({ to: "/messages" })} className="p-1 md:hidden">
            <ChevronLeft size={24} className="text-primary" />
          </button>
          <div className="relative">
            <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold border">
              {initials || <UserIcon size={20} />}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5">
              <OnlineDot userId={otherId} size={12} />
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-base leading-tight truncate">{otherName}</p>
            {otherTyping ? (
              <p className="text-xs text-primary italic">en train d'écrire…</p>
            ) : (
              <OnlineStatusLabel userId={otherId} />
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 hover:bg-muted rounded-full transition-colors border">
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
        <div className="bg-card border-b px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              {chat.book_image_url && (
                <img src={chat.book_image_url} alt={chat.book_title ?? ""} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-black text-primary text-sm uppercase tracking-tight truncate">
                {chat.book_title}
              </p>
              <p className="text-xs text-muted-foreground">Discussion en cours</p>
            </div>
          </div>
          <Link
            to="/book/$id"
            params={{ id: chat.book_id }}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/5 transition-colors flex-shrink-0"
          >
            <BookOpen size={16} />
            Voir
          </Link>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((m) => {
          const mine = m.sender_id === user?.id;
          const time = new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[75%] px-4 py-2.5 rounded-2xl text-sm shadow-sm",
                  mine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-card border rounded-bl-md",
                )}
              >
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
                <div className={cn("flex items-center gap-1 mt-1 justify-end", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  <span className="text-[10px]">{time}</span>
                  {mine && (
                    m.read_at ? (
                      <CheckCheck size={12} className="text-sky-300" />
                    ) : (
                      <Check size={12} />
                    )
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {otherTyping && (
          <div className="flex justify-start">
            <div className="bg-card border rounded-2xl rounded-bl-md px-4 py-2.5 shadow-sm">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0.3s]" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-card border-t p-3 flex items-center gap-2">
        <Input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            broadcastTyping();
            if (typingTimer.current) window.clearTimeout(typingTimer.current);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Écrire un message..."
          className="flex-1 rounded-full bg-muted/50 border-none h-11"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className={cn(
            "p-3 rounded-full transition-colors",
            input.trim() ? "bg-primary text-primary-foreground" : "text-muted-foreground bg-muted",
          )}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="md:flex md:h-[calc(100vh-4rem)] md:max-w-6xl md:mx-auto md:my-4 md:border md:rounded-lg md:overflow-hidden">
      <aside className="hidden md:block md:w-[280px] md:border-r md:h-full">
        <ContactsSidebar activeChatId={chatId} />
      </aside>
      <section className="flex-1 h-screen md:h-full">{ChatPane}</section>
    </div>
  );
}
