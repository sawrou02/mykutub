import { Link } from "@tanstack/react-router";
import { Heart, Truck } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Book } from "@/lib/mykutub";

export function BookCard({ book }: { book: Book }) {
  const [isLiked, setIsLiked] = useState(false);
  return (
    <Link to="/book/$id" params={{ id: book.id }} className="block group">
      <div className="relative aspect-square overflow-hidden bg-muted rounded-lg">
        <img
          src={book.image_url}
          alt={book.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <button
          onClick={(e) => { e.preventDefault(); setIsLiked(!isLiked); }}
          className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-white/90 text-foreground hover:text-destructive shadow-sm"
          aria-label="Favori"
        >
          <Heart size={12} fill={isLiked ? "currentColor" : "transparent"} className={cn(isLiked && "text-destructive")} />
        </button>
        {book.is_donation && (
          <span className="absolute top-1.5 left-1.5 bg-secondary text-secondary-foreground text-[8px] font-bold uppercase px-1.5 py-0.5 rounded">
            Sadaqa
          </span>
        )}
      </div>
      <div className="pt-1.5 space-y-0.5">
        <h3 className="font-semibold text-[13px] leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {book.title}
        </h3>
        <p className="font-bold text-sm text-foreground">
          {book.is_donation ? "Gratuit" : `${book.price} €`}
        </p>
        {book.can_deliver && (
          <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Truck size={10} /> Livraison possible
          </p>
        )}
        <p className="text-[10px] text-muted-foreground truncate">
          {book.city}
        </p>
      </div>
    </Link>
  );
}
