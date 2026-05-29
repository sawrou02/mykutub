import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  urls: string[];
  title: string;
  /** Currently unused at render time but kept for parent context */
  isDonation?: boolean;
  /** Overlays rendered on top of the active image (badges, share button, etc.) */
  children?: React.ReactNode;
};

/**
 * Single-image carousel : shows one image at a time, with prev/next
 * arrows and dot navigation. Wraps overlays via `children`.
 */
export function BookGallery({ urls, title, children }: Props) {
  const [idx, setIdx] = useState(0);

  if (urls.length === 0) {
    return (
      <div className="relative aspect-[4/3] sm:aspect-[16/10] w-full bg-muted lg:rounded-xl overflow-hidden">
        {children}
      </div>
    );
  }

  const active = Math.min(idx, urls.length - 1);
  const hasMany = urls.length > 1;

  return (
    <div className="relative aspect-[4/3] sm:aspect-[16/10] w-full bg-muted lg:rounded-xl overflow-hidden">
      <img
        src={urls[active]}
        alt={`${title} — photo ${active + 1}`}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {hasMany && (
        <>
          <button
            type="button"
            onClick={() => setIdx((i) => (i - 1 + urls.length) % urls.length)}
            aria-label="Photo précédente"
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-card/85 hover:bg-card shadow"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => setIdx((i) => (i + 1) % urls.length)}
            aria-label="Photo suivante"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-card/85 hover:bg-card shadow"
          >
            <ChevronRight size={18} />
          </button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {urls.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`Aller à la photo ${i + 1}`}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  i === active ? "bg-card w-5" : "bg-card/60 hover:bg-card/80",
                )}
              />
            ))}
          </div>
        </>
      )}

      {children}
    </div>
  );
}
