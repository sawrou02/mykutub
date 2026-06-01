import { useEffect, useState } from "react";
import { Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Badge = { id: string; label: string; color: string };

const COLOR_CLASSES: Record<string, string> = {
  emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
  amber: "bg-amber-100 text-amber-700 border-amber-200",
  sky: "bg-sky-100 text-sky-700 border-sky-200",
  rose: "bg-rose-100 text-rose-700 border-rose-200",
  violet: "bg-violet-100 text-violet-700 border-violet-200",
};

export function UserBadgesList({
  userId,
  className,
  size = "sm",
}: {
  userId: string;
  className?: string;
  size?: "xs" | "sm";
}) {
  const [badges, setBadges] = useState<Badge[]>([]);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("user_badges")
      .select("id, label, color")
      .eq("user_id", userId)
      .then(({ data }) => setBadges((data as Badge[]) ?? []));
  }, [userId]);

  if (badges.length === 0) return null;
  const px = size === "xs" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]";
  return (
    <div className={cn("inline-flex flex-wrap items-center gap-1", className)}>
      {badges.map((b) => (
        <span
          key={b.id}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border font-semibold",
            px,
            COLOR_CLASSES[b.color] || COLOR_CLASSES.emerald,
          )}
          title={b.label}
        >
          <Award size={size === "xs" ? 9 : 10} />
          {b.label}
        </span>
      ))}
    </div>
  );
}
