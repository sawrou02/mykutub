import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BookCard } from "@/components/BookCard";
import type { Book } from "@/lib/types";
import { Loader2 } from "lucide-react";

type Props =
  | { kind: "similar"; bookId: string; title?: string; limit?: number }
  | { kind: "recommended"; userId: string; title?: string; limit?: number };

export function BookSuggestions(props: Props) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const limit = props.limit ?? 6;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const promise =
      props.kind === "similar"
        ? supabase.rpc(
            "get_similar_books" as never,
            {
              _book_id: props.bookId,
              _limit: limit,
            } as never,
          )
        : supabase.rpc(
            "get_recommended_books" as never,
            {
              _user_id: props.userId,
              _limit: limit,
            } as never,
          );
    promise.then(({ data }) => {
      if (cancelled) return;
      setBooks((data as Book[] | null) ?? []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [props, limit]);

  if (loading) {
    return (
      <div className="py-8 flex items-center justify-center text-muted-foreground">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }

  if (books.length === 0) return null;

  const heading = props.title ?? (props.kind === "similar" ? "Livres similaires" : "Pour vous");

  return (
    <section className="mt-6">
      <h2 className="font-headline font-bold text-lg mb-3">{heading}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {books.map((b) => (
          <BookCard key={b.id} book={b} />
        ))}
      </div>
    </section>
  );
}
