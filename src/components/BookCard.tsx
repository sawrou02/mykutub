import { Link } from "@tanstack/react-router";
import { MapPin, Heart, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Book } from "@/lib/mykutub";

export function BookCard({ book }: { book: Book }) {
  const [isLiked, setIsLiked] = useState(false);
  return (
    <Link to="/book/$id" params={{ id: book.id }}>
      <Card className="overflow-hidden border-none shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300 bg-card group h-full flex flex-col rounded-2xl">
        <div className="relative aspect-[3/4] overflow-hidden bg-muted">
          <img
            src={book.image_url}
            alt={book.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <button
            onClick={(e) => { e.preventDefault(); setIsLiked(!isLiked); }}
            className="absolute top-2 right-2 p-2 rounded-full bg-card/90 backdrop-blur-sm text-muted-foreground hover:text-destructive transition-all z-10 shadow-sm"
          >
            <Heart size={14} fill={isLiked ? "currentColor" : "transparent"} className={cn(isLiked && "text-destructive scale-110")} />
          </button>
          {book.is_donation && (
            <Badge className="absolute top-2 left-2 bg-secondary text-secondary-foreground font-black text-[9px] uppercase tracking-widest px-2 py-0.5 shadow-md">
              Sadaqa
            </Badge>
          )}
          <div className="absolute bottom-2 left-2 flex items-center gap-1">
            <span className="text-[9px] font-black text-white bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded uppercase tracking-tighter">
              {book.condition}
            </span>
            {book.can_deliver && (
              <span className="text-[9px] font-black text-white bg-green-600/80 backdrop-blur-sm px-2 py-0.5 rounded uppercase tracking-tighter flex items-center gap-1">
                <Truck size={9} /> Livraison
              </span>
            )}
          </div>
        </div>
        <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="font-headline font-bold text-sm line-clamp-2 leading-tight group-hover:text-primary transition-colors">
              {book.title}
            </h3>
            <div className="flex items-center text-muted-foreground text-[10px] font-medium">
              <MapPin size={10} className="mr-1 text-secondary" />
              {book.city}
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <p className="font-headline font-black text-primary text-lg tracking-tight">
              {book.is_donation ? "GRATUIT" : `${book.price}€`}
            </p>
            <Badge variant="outline" className="text-[9px] font-bold py-0 h-4 border-primary/20 bg-primary/5 text-primary">
              {book.category}
            </Badge>
          </div>
        </div>
      </Card>
    </Link>
  );
}
