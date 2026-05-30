import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, Download, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { DigitalBook } from "@/lib/types";

export const Route = createFileRoute("/bibliotheque")({
  component: BibliothequePage,
});

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function BibliothequePage() {
  const [query, setQuery] = useState("");
  const [books, setBooks] = useState<DigitalBook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(() => {
      supabase
        .rpc(
          "search_digital_books" as never,
          {
            _query: query || null,
            _language: null,
            _category: null,
            _limit: 60,
          } as never,
        )
        .then(({ data }) => {
          if (cancelled) return;
          setBooks((data as DigitalBook[] | null) ?? []);
          setLoading(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const handleDownload = async (book: DigitalBook) => {
    // Best-effort counter increment
    void supabase.rpc(
      "increment_digital_book_download" as never,
      {
        _book_id: book.id,
      } as never,
    );
    const url = book.external_url || book.file_url;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen pb-24 md:pb-12">
      <header className="bg-card border-b">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={22} className="text-primary" />
            <h1 className="font-headline font-bold text-2xl">Bibliothèque digitale</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Téléchargez gratuitement des livres au format PDF. Recherchez par titre ou par auteur.
          </p>
          <div className="relative max-w-xl">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Titre ou auteur..."
              className="pl-9 h-11"
            />
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="py-16 flex items-center justify-center text-muted-foreground">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : books.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold">
              {query ? "Aucun livre trouvé" : "Aucun livre disponible pour le moment"}
            </p>
            <p className="text-xs mt-1">
              {query
                ? "Essayez un autre mot-clé"
                : "Revenez bientôt — le catalogue s'enrichit régulièrement"}
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {books.map((b) => (
              <li
                key={b.id}
                className="bg-card border rounded-2xl p-4 flex gap-3 hover:shadow-md transition"
              >
                <div className="w-16 h-24 flex-shrink-0 rounded-md bg-muted overflow-hidden">
                  {b.cover_url ? (
                    <img src={b.cover_url} alt={b.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <BookOpen size={20} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col">
                  <h3 className="font-bold text-sm leading-snug line-clamp-2">{b.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{b.author}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[10px] text-muted-foreground">
                    <span className="px-1.5 py-0.5 rounded-full bg-muted">{b.language}</span>
                    {b.category && (
                      <span className="px-1.5 py-0.5 rounded-full bg-muted">{b.category}</span>
                    )}
                    {b.file_size_bytes && (
                      <span className="text-[10px]">{formatSize(b.file_size_bytes)}</span>
                    )}
                  </div>
                  {b.description && (
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                      {b.description}
                    </p>
                  )}
                  <Button
                    size="sm"
                    onClick={() => handleDownload(b)}
                    className="mt-auto mt-2 h-8 rounded-full text-xs font-semibold w-full"
                  >
                    <Download size={13} className="mr-1.5" />
                    Télécharger
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
