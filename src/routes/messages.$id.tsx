import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Send, MoreVertical, User, Flag, Trash2, BookOpen, User as UserIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { Chat, Message } from "@/lib/mykutub";

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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from("chats").select("*").eq("id", chatId).single()
      .then(({ data }) => setChat(data as Chat | null));
    supabase.from("messages").select("*").eq("chat_id", chatId).order("created_at", { ascending: true })
      .then(({ data }) => setMessages((data as Message[]) ?? []));

    const channel = supabase.channel(`chat-${chatId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        (payload) => setMessages(prev => [...prev, payload.new as Message]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [chatId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // mark read
  useEffect(() => {
    if (chat && user && chat.unread_by?.includes(user.id)) {
      const newUnread = chat.unread_by.filter(id => id !== user.id);
      supabase.from("chats").update({ unread_by: newUnread }).eq("id", chatId).then(() => {});
    }
  }, [chat, user, chatId]);

  const handleSend = async () => {
    if (!input.trim() || !user || !chat) return;
    const text = input.trim();
    setInput("");
    const recipientId = chat.participants.find(p => p !== user.id);
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

  const otherId = chat.participants.find(p => p !== user?.id);
  const otherName = messages.find(m => m.sender_id !== user?.id)?.sender_name || "Utilisateur";
  const initials = otherName.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col h-screen bg-muted/20">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-card border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate({ to: "/messages" })} className="p-1">
            <ChevronLeft size={24} className="text-primary" />
          </button>
          <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold border">
            {initials || <UserIcon size={20} />}
          </div>
          <div>
            <p className="font-bold text-base leading-tight">{otherName}</p>
            <p className="text-xs text-emerald-600 flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              En ligne
            </p>
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
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(m => {
          const mine = m.sender_id === user?.id;
          const time = new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                  mine
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-card border rounded-bl-md"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
                <p className={`text-[10px] mt-1 text-right ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {time}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-card border-t p-3 flex items-center gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Écrire un message..." className="flex-1 rounded-full bg-muted/50 border-none h-11" />
        <button onClick={handleSend} disabled={!input.trim()}
          className={`p-3 rounded-full transition-colors ${input.trim() ? "bg-primary text-primary-foreground" : "text-muted-foreground bg-muted"}`}>
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
