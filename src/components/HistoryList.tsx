import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ShoppingBag, Tag, Gift, PackageCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Book } from "@/lib/mykutub";

type Section = "sales" | "purchases" | "donations";

const SECTIONS: { key: Section; label: string; icon: typeof Tag; empty: string }[] = [
  { key: "sales", label: "Ventes", icon: Tag, empty: "Aucune vente pour le moment." },
  {
    key: "purchases",
    label: "Achats",
    icon: ShoppingBag,
    empty: "Aucun achat pour le moment.",
  },
  { key: "donations", label: "Dons", icon: Gift, empty: "Aucun don pour le moment." },
];

const STATUS_LABEL: Record<string, string> = {
  reserved: "Réservé",
  sold: "Vendu",
  available: "Disponible",
};

export function HistoryList() {
  const { user } = useAuth();
  const [section, setSection] = useState<Section>("sales");
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<Book[]>([]);
  const [purchases, setPurchases] = useState<Book[]>([]);
  const [donations, setDonations] = useState<Book[]>([]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      supabase
        .from("books")
        .select("*")
        .eq("seller_id", user.id)
        .eq("is_donation", false)
        .in("status", ["reserved", "sold"])
        .order("updated_at", { ascending: false }),
      supabase
        .from("books")
        .select("*")
        .eq("reserved_by", user.id)
        .order("reserved_at", { ascending: false }),
      supabase
        .from("books")
        .select("*")
        .eq("seller_id", user.id)
        .eq("is_donation", true)
        .order("created_at", { ascending: false }),
    ]).then(([s, p, d]) => {
      setSales((s.data as Book[]) ?? []);
      setPurchases((p.data as Book[]) ?? []);
      setDonations((d.data as Book[]) ?? []);
      setLoading(false);
    });
  }, [user]);

  const current =
    section === "sales" ? sales : section === "purchases" ? purchases : donations;
  const currentMeta = SECTIONS.find((s) => s.key === section)!;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const count =
            s.key === "sales"
              ? sales.length
              : s.key === "purchases"
                ? purchases.length
                : donations.length;
          const active = section === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setSection(s.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 h-9 rounded-full text-sm font-semibold whitespace-nowrap border transition-colors shrink-0",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:bg-muted",
              )}
            >
              <Icon size={14} />
              {s.label}
              <span
                className={cn(
                  "text-[10px] font-bold rounded-full px-1.5 py-0.5",
                  active ? "bg-primary-foreground/20" : "bg-muted",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </div>
      ) : current.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <PackageCheck size={40} className="text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">{currentMeta.empty}</p>
        </div>
      ) : (
        <ul className="divide-y bg-card rounded-2xl border overflow-hidden">
          {current.map((b) => (
            <li key={b.id}>
              <Link
                to="/book/$id"
                params={{ id: b.id }}
                className="flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors"
              >
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                  {b.image_url ? (
                    <img
                      src={b.image_url}
                      alt={b.title}
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{b.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {b.is_donation
                      ? "Don"
                      : `${Number(b.price).toFixed(2)} €`}
                    {" · "}
                    {(b.status && STATUS_LABEL[b.status]) ?? b.status ?? ""}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
