import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal, MapPin, X, Check, History, Trash2 } from "lucide-react";
import { BookCard } from "@/components/BookCard";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { CATEGORIES, CONDITIONS, ALL_CITIES, type Book } from "@/lib/mykutub";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose,
} from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/catalog")({
  head: () => ({
    meta: [
      { title: "Catalogue — Livres islamiques d'occasion | MYKUTUB" },
      { name: "description", content: "Parcourez des centaines de livres de science islamique d'occasion : Tafsir, Hadith, Fiqh, Aqida, Sira. Prix accessibles, vendeurs vérifiés, livraison en France." },
      { property: "og:title", content: "Catalogue — Livres islamiques d'occasion | MYKUTUB" },
      { property: "og:description", content: "Tafsir, Hadith, Fiqh, Aqida, Sira et plus. Vendeurs vérifiés, prix accessibles." },
      { property: "og:url", content: "https://mykutub.lovable.app/catalog" },
    ],
    links: [{ rel: "canonical", href: "https://mykutub.lovable.app/catalog" }],
  }),
  component: Catalog,
});

function Catalog() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("Tout");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"recent" | "price-asc" | "price-desc">("recent");
  const [history, setHistory] = useState<{ id: string; query: string }[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.from("books").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      if (!active) return;
      setBooks((data as Book[]) ?? []);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const loadHistory = () => {
    if (!user) { setHistory([]); return; }
    supabase.from("search_history").select("id, query")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(8)
      .then(({ data }) => setHistory((data as { id: string; query: string }[]) ?? []));
  };

  useEffect(() => { loadHistory(); }, [user]);

  // Debounced save
  useEffect(() => {
    if (!user || !searchQuery.trim() || searchQuery.trim().length < 2) return;
    const q = searchQuery.trim();
    const t = setTimeout(async () => {
      await supabase.from("search_history").insert({ user_id: user.id, query: q });
      loadHistory();
    }, 1200);
    return () => clearTimeout(t);
  }, [searchQuery, user]);

  const clearHistory = async () => {
    if (!user) return;
    await supabase.from("search_history").delete().eq("user_id", user.id);
    setHistory([]);
  };

  const filteredBooks = useMemo(() => {
    return books.filter(b => {
      const okCat = selectedCategory === "Tout" || b.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const okSearch = b.title.toLowerCase().includes(q) || (b.description?.toLowerCase() || "").includes(q);
      const okCity = !selectedCity || b.city === selectedCity;
      const okCond = selectedConditions.length === 0 || selectedConditions.includes(b.condition);
      return okCat && okSearch && okCity && okCond;
    }).sort((a, b) => {
      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      return 0;
    });
  }, [books, selectedCategory, searchQuery, selectedCity, selectedConditions, sortBy]);

  const toggleCondition = (c: string) =>
    setSelectedConditions(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]);

  return (
    <div className="max-w-7xl mx-auto w-full px-4 md:px-8 py-6 md:py-10">
      <div className="mb-6 md:mb-10">
        <h1 className="font-headline text-3xl md:text-5xl font-black">{t("catalog.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("catalog.subtitle")}</p>
      </div>

      <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-md py-4 -mx-4 px-4 md:-mx-8 md:px-8 space-y-4 border-b mb-6">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder={t("catalog.placeholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              className="pl-10 h-12 bg-muted/50 border-none rounded-xl"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <X size={16} />
              </button>
            )}
            {searchFocused && !searchQuery && history.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-card border rounded-xl shadow-lg z-50 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <History size={12} /> {t("common.recentSearches")}
                  </div>
                  <button onMouseDown={(e) => { e.preventDefault(); clearHistory(); }} className="text-xs text-destructive hover:underline flex items-center gap-1">
                    <Trash2 size={12} /> {t("common.clearHistory")}
                  </button>
                </div>
                <ul className="max-h-64 overflow-y-auto">
                  {history.map(h => (
                    <li key={h.id}>
                      <button
                        onMouseDown={(e) => { e.preventDefault(); setSearchQuery(h.query); setSearchFocused(false); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                      >
                        <Search size={14} className="text-muted-foreground" />
                        {h.query}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("rounded-xl h-12 gap-2 px-4", selectedCity && "bg-primary/5 border-primary text-primary")}>
                <MapPin size={16} />
                <span className="text-xs font-bold">{selectedCity || t("common.allFrance")}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0" align="end">
              <Command>
                <CommandInput placeholder={t("catalog.cityPlaceholder")} />
                <CommandList>
                  <CommandEmpty>{t("catalog.cityEmpty")}</CommandEmpty>
                  <CommandGroup>
                    <CommandItem onSelect={() => setSelectedCity(null)} className="cursor-pointer font-bold">
                      <Check className={cn("mr-2 h-4 w-4", !selectedCity ? "opacity-100" : "opacity-0")} />
                      {t("common.allFrance")}
                    </CommandItem>
                    {ALL_CITIES.map(city => (
                      <CommandItem key={city} onSelect={() => setSelectedCity(city)} className="cursor-pointer">
                        <Check className={cn("mr-2 h-4 w-4", selectedCity === city ? "opacity-100" : "opacity-0")} />
                        {city}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="secondary" size="icon" className={cn("h-12 w-12 rounded-xl", (selectedConditions.length > 0 || sortBy !== "recent") && "bg-primary text-primary-foreground")}>
                <SlidersHorizontal size={20} />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] flex flex-col">
              <SheetHeader className="text-left border-b pb-4">
                <SheetTitle className="text-2xl font-black text-primary">{t("common.filters")}</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto py-6 space-y-8">
                <div className="space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground">{t("catalog.condition")}</h3>
                  <div className="flex flex-wrap gap-2">
                    {CONDITIONS.map(c => (
                      <Badge key={c} variant={selectedConditions.includes(c) ? "default" : "outline"} onClick={() => toggleCondition(c)} className="cursor-pointer px-4 py-2 text-xs font-bold">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground">{t("catalog.sortBy")}</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {[{ id: "recent", label: t("catalog.sortRecent") }, { id: "price-asc", label: t("catalog.sortPriceAsc") }, { id: "price-desc", label: t("catalog.sortPriceDesc") }].map(o => (
                      <Button key={o.id} variant={sortBy === o.id ? "default" : "outline"} onClick={() => setSortBy(o.id as typeof sortBy)} className="justify-start font-bold h-12 rounded-xl">
                        {o.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <SheetFooter className="border-t pt-6 flex flex-col gap-3 mt-auto">
                <Button onClick={() => { setSelectedConditions([]); setSortBy("recent"); }} variant="ghost" className="w-full font-bold">{t("common.reset")}</Button>
                <SheetClose asChild>
                  <Button className="w-full h-14 rounded-2xl font-bold bg-primary text-lg">{t("common.apply")}</Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>

        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex space-x-2">
            {CATEGORIES.map(cat => (
              <Badge key={cat} onClick={() => setSelectedCategory(cat)} variant={selectedCategory === cat ? "default" : "secondary"} className={cn("px-4 py-2 cursor-pointer text-xs font-bold border", selectedCategory === cat ? "bg-primary border-primary" : "bg-card border-border text-muted-foreground")}>
                {cat}
              </Badge>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 pb-8">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-muted rounded-2xl animate-pulse" />
          ))
        ) : filteredBooks.length === 0 ? (
          <div className="col-span-full text-center py-20 text-muted-foreground">
            {t("common.noResults")}
          </div>
        ) : (
          filteredBooks.map(book => <BookCard key={book.id} book={book} />)
        )}
      </div>
    </div>
  );
}
