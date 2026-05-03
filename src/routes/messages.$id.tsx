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

  return (
    <div className="flex flex-col h-screen bg-muted/20">
      <header className="sticky top-0 z-50 bg-card border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate({ to: "/messages" })} className="p-1"><ChevronLeft size={24} className="text-primary" /></button>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">?</div>
            <div>
              <p className="font-bold text-sm leading-none">{chat.book_title || "Conversation"}</p>
              <p className="text-[10px] text-muted-foreground mt-1">En ligne</p>
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 hover:bg-muted rounded-full transition-colors">
              <MoreVertical size={20} className="text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl">
            <DropdownMenuItem onClick={() => navigate({ to: "/profile" })} className="py-3 cursor-pointer">
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

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(m => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card rounded-bl-sm"}`}>
                {m.text}
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
