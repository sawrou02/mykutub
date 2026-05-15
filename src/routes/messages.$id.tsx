import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft, Send, MoreVertical, User, Flag, Trash2, BookOpen, User as UserIcon,
  Check, CheckCheck, Smile, Plus, Star, X, Info, Trash, UserMinus,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Chat, Message, Book } from "@/lib/mykutub";
import { ContactsSidebar } from "@/components/ContactsSidebar";
import { OnlineDot, OnlineStatusLabel } from "@/components/OnlineDot";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/messages/$id")({
  component: ChatDetailPage,
});

type ProfileLite = { id: string; display_name: string | null; avatar_url: string | null };

const SYSTEM_PREFIX = "__system__:";
const IMAGE_PREFIX = "__image__:";

const CHAT_BG = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'><g fill='%23128C7E' fill-opacity='0.04'><circle cx='10' cy='10' r='2'/><circle cx='40' cy='30' r='1.5'/><circle cx='70' cy='15' r='2'/><circle cx='25' cy='55' r='1.5'/><circle cx='60' cy='65' r='2'/></g></svg>\")";

function dateLabel(d: Date) {
  const today = new Date();
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return "Aujourd'hui";
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (sameDay(d, yesterday)) return "Hier";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}

function relativeTime(iso: string | null | undefined) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `il y a ${d} j`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

function ChatDetailPage() {
  const { id: chatId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherProfile, setOtherProfile] = useState<ProfileLite | null>(null);
  const [book, setBook] = useState<Book | null>(null);
  const [reviewStats, setReviewStats] = useState<{ avg: number; count: number }>({ avg: 0, count: 0 });
  const [input, setInput] = useState("");
  const [otherTyping, setOtherTyping] = useState(false);
  const [showBookInfo, setShowBookInfo] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [actionMsg, setActionMsg] = useState<Message | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastTypingSent = useRef(0);
  const longPressTimer = useRef<number | null>(null);

  useEffect(() => {
    supabase.from("chats").select("*").eq("id", chatId).single()
      .then(({ data }) => setChat(data as Chat | null));
    supabase.from("messages").select("*").eq("chat_id", chatId).order("created_at", { ascending: true })
      .then(({ data }) => setMessages((data as Message[]) ?? []));
  }, [chatId]);

  useEffect(() => {
    if (!chat || !user) return;
    const otherId = chat.participants.find((p) => p !== user.id);
    if (otherId) {
      supabase.from("profiles").select("id,display_name,avatar_url").eq("id", otherId).single()
        .then(({ data }) => setOtherProfile(data as ProfileLite | null));
    }
    if (chat.book_id) {
      supabase.from("books").select("*").eq("id", chat.book_id).maybeSingle()
        .then(({ data }) => setBook(data as Book | null));
    }
  }, [chat, user]);

  useEffect(() => {
    if (!book) return;
    supabase.from("reviews").select("rating").eq("seller_id", book.seller_id)
      .then(({ data }) => {
        const arr = (data as { rating: number }[]) ?? [];
        const count = arr.length;
        const avg = count ? arr.reduce((s, r) => s + r.rating, 0) / count : 0;
        setReviewStats({ avg, count });
      });
  }, [book]);

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

  const sendRaw = async (text: string) => {
    if (!user || !chat) return;
    const recipientId = chat.participants.find((p) => p !== user.id);
    const senderName = user.user_metadata?.display_name || user.email?.split("@")[0] || "Utilisateur";
    await supabase.from("messages").insert({
      chat_id: chatId, sender_id: user.id, sender_name: senderName, text,
    });
    const preview = text.startsWith(IMAGE_PREFIX) ? "📷 Photo" : text;
    await supabase.from("chats").update({
      last_message: preview,
      last_message_at: new Date().toISOString(),
      unread_by: recipientId ? [recipientId] : [],
    }).eq("id", chatId);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");
    await sendRaw(text);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    e.target.value = "";
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image trop volumineuse (max 5 Mo)");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `chat-attachments/${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("book-images").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("book-images").getPublicUrl(path);
      await sendRaw(`${IMAGE_PREFIX}${pub.publicUrl}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'envoi");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteChat = async () => {
    if (!confirm("Supprimer la conversation ?")) return;
    await supabase.from("chats").delete().eq("id", chatId);
    toast.success("Conversation supprimée");
    navigate({ to: "/messages" });
  };

  const deleteForEveryone = async (m: Message) => {
    if (!user || m.sender_id !== user.id) return;
    const ageMs = Date.now() - new Date(m.created_at).getTime();
    if (ageMs > 24 * 60 * 60 * 1000) {
      toast.error("Trop tard : la suppression pour tous n'est possible que dans les 24h.");
      return;
    }
    const { error } = await supabase.from("messages").update({
      deleted_for_everyone: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      text: "",
    }).eq("id", m.id);
    if (error) toast.error("Échec de la suppression");
    else setActionMsg(null);
  };

  const deleteForMe = async (m: Message) => {
    if (!user) return;
    const next = Array.from(new Set([...(m.hidden_for ?? []), user.id]));
    const { error } = await supabase.from("messages").update({ hidden_for: next }).eq("id", m.id);
    if (error) toast.error("Échec");
    else {
      setMessages((prev) => prev.map((x) => x.id === m.id ? { ...x, hidden_for: next } : x));
      setActionMsg(null);
    }
  };

  const startLongPress = (m: Message) => {
    if (m.sender_id !== user?.id || m.deleted_for_everyone) return;
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => setActionMsg(m), 500);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) { window.clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };

  const visibleMessages = useMemo(
    () => messages.filter((m) => !(m.hidden_for ?? []).includes(user?.id ?? "")),
    [messages, user?.id],
  );

  const grouped = useMemo(() => {
    const out: Array<{ type: "date"; label: string; key: string } | { type: "msg"; msg: Message }> = [];
    let lastDay = "";
    for (const m of visibleMessages) {
      const d = new Date(m.created_at);
      const key = d.toDateString();
      if (key !== lastDay) {
        out.push({ type: "date", label: dateLabel(d), key });
        lastDay = key;
      }
      out.push({ type: "msg", msg: m });
    }
    return out;
  }, [visibleMessages]);

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

  const bookStatus = book?.status ?? "available";
  const statusLabel = bookStatus === "available" ? "Disponible" : bookStatus === "reserved" ? "Réservé" : "Donné";
  const statusColor =
    bookStatus === "available" ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : bookStatus === "reserved" ? "bg-amber-100 text-amber-700 border-amber-200"
    : "bg-muted text-muted-foreground border-border";

  const BookInfoPanel = book ? (
    <div className="flex flex-col h-full bg-card overflow-y-auto thin-scroll">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <p className="font-semibold text-sm">Détails de l'annonce</p>
        <button onClick={() => setShowBookInfo(false)} className="md:hidden p-1 hover:bg-muted rounded">
          <X size={18} />
        </button>
      </div>
      <div className="p-4 space-y-4">
        <Link to="/book/$id" params={{ id: book.id }} className="block">
          <div className="aspect-[4/3] w-full rounded-lg overflow-hidden bg-muted border">
            {book.image_url ? (
              <img src={book.image_url} alt={book.title} className="w-full h-full object-cover hover:scale-105 transition-transform" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen size={40} className="text-muted-foreground/40" />
              </div>
            )}
          </div>
        </Link>

        <div>
          <h2 className="font-bold text-base leading-tight line-clamp-2">{book.title}</h2>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border", statusColor)}>
              {statusLabel}
            </span>
            <span className="text-base font-bold text-primary">
              {book.is_donation ? "Gratuit" : `${book.price} €`}
            </span>
          </div>
        </div>

        {/* Seller rating */}
        <div className="border-t pt-3">
          <p className="text-xs text-muted-foreground mb-1">Vendeur</p>
          <p className="font-semibold text-sm">{book.seller_name}</p>
          {reviewStats.count > 0 ? (
            <div className="flex items-center gap-1.5 mt-1">
              <Star size={14} className="fill-amber-400 text-amber-400" />
              <span className="text-sm font-semibold">{reviewStats.avg.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({reviewStats.count} avis)</span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">Aucun avis</p>
          )}
        </div>

        <div className="border-t pt-3">
          <p className="text-xs text-muted-foreground">Dernière activité</p>
          <p className="text-sm font-medium">{relativeTime(chat.last_message_at ?? chat.created_at)}</p>
        </div>

        <Link
          to="/book/$id"
          params={{ id: book.id }}
          className="block w-full text-center px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
        >
          Voir l'annonce
        </Link>
      </div>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-card">
      <BookOpen size={40} className="text-muted-foreground/30 mb-2" />
      <p className="text-sm font-semibold">Aucun livre lié</p>
      <p className="text-xs text-muted-foreground mt-1">Cette conversation n'est rattachée à aucune annonce.</p>
    </div>
  );

  const ChatPane = (
    <div className="flex flex-col h-full" style={{ background: "#efeae2", backgroundImage: CHAT_BG }}>
      {/* Top bar */}
      <header className="bg-card border-b px-3 md:px-4 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate({ to: "/messages" })} className="p-1 md:hidden -ml-1" aria-label="Retour à la liste">
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
        <div className="flex items-center gap-1">
          {book && (
            <button
              onClick={() => setShowBookInfo(true)}
              className="lg:hidden p-2 hover:bg-muted rounded-full transition-colors"
              aria-label="Voir le livre"
            >
              <Info size={18} className="text-primary" />
            </button>
          )}
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
        </div>
      </header>

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
          const isSystem = m.text.startsWith(SYSTEM_PREFIX);
          const isImage = m.text.startsWith(IMAGE_PREFIX);
          const mine = m.sender_id === user?.id;
          const time = new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

          if (isSystem) {
            return (
              <div key={m.id} className="flex justify-center my-2">
                <p className="text-[11px] italic text-muted-foreground bg-white/70 px-3 py-1 rounded-md shadow-sm max-w-[80%] text-center">
                  {m.text.slice(SYSTEM_PREFIX.length).trim()}
                </p>
              </div>
            );
          }

          return (
            <div key={m.id} className={cn("flex animate-in fade-in slide-in-from-bottom-1 duration-200", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[78%] md:max-w-[65%] rounded-lg text-sm shadow-sm overflow-hidden",
                  isImage ? "p-1" : "px-3 py-1.5",
                  mine ? "rounded-tr-sm text-white" : "rounded-tl-sm bg-white text-foreground",
                )}
                style={mine ? { background: "#008069" } : undefined}
              >
                {isImage ? (
                  <a href={m.text.slice(IMAGE_PREFIX.length)} target="_blank" rel="noreferrer" className="block">
                    <img
                      src={m.text.slice(IMAGE_PREFIX.length)}
                      alt="Pièce jointe"
                      className="rounded max-w-[260px] max-h-[260px] object-cover"
                    />
                  </a>
                ) : (
                  <p className="whitespace-pre-wrap break-words leading-snug">{m.text}</p>
                )}
                <div className={cn("flex items-center gap-1 mt-0.5 px-1 justify-end", mine ? "text-white/80" : "text-muted-foreground")}>
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
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoUpload}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="p-2.5 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
          aria-label="Envoyer une photo"
          title="Envoyer une photo"
        >
          <Plus size={22} />
        </button>
        <button
          type="button"
          className="p-2.5 text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
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
            placeholder={uploading ? "Envoi de la photo..." : "Écrire un message..."}
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
      <aside className="hidden md:flex w-[300px] border-r flex-shrink-0 h-full">
        <ContactsSidebar activeChatId={chatId} />
      </aside>
      <section className="flex-1 h-full min-w-0">{ChatPane}</section>
      <aside className="hidden lg:flex w-[320px] border-l flex-shrink-0 h-full">
        {BookInfoPanel}
      </aside>

      {/* Mobile/tablet drawer for book info */}
      {showBookInfo && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <button
            className="flex-1 bg-black/40"
            onClick={() => setShowBookInfo(false)}
            aria-label="Fermer"
          />
          <div className="w-full max-w-sm h-full bg-card shadow-xl animate-in slide-in-from-right duration-200">
            {BookInfoPanel}
          </div>
        </div>
      )}
    </div>
  );
}
