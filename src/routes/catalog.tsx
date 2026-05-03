import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal, MapPin, X, Check } from "lucide-react";
import { BookCard } from "@/components/BookCard";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { CATEGORIES, CONDITIONS, ALL_CITIES, type Book } from "@/lib/mykutub";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose,
} from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export const Route = createFileRoute("/catalog")({
  component: Home,
});

function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("Tout");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"recent" | "price-asc" | "price-desc">("recent");

  useEffect(() => {
    let active = true;
    supabase.from("books").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      if (!active) return;
      setBooks((data as Book[]) ?? []);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

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
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md px-4 py-4 space-y-4 border-b">
        <div className="flex items-center justify-between">
          <button onClick={() => { setSearchQuery(""); setSelectedCategory("Tout"); }} className="hover:opacity-80 transition-opacity active:scale-95 transform duration-200">
            <h1 className="font-headline text-2xl font-bold text-primary tracking-tight">MYKUTUB</h1>
          </button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("rounded-full border-primary/20 gap-2 h-9 px-3", selectedCity && "bg-primary/5 border-primary text-primary")}>
                <MapPin size={16} className={selectedCity ? "text-primary" : "text-muted-foreground"} />
                <span className="text-xs font-bold">{selectedCity || "Toute la France"}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0" align="end">
              <Command>
                <CommandInput placeholder="Rechercher une ville..." />
                <CommandList>
                  <CommandEmpty>Aucune ville trouvée.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem onSelect={() => setSelectedCity(null)} className="cursor-pointer font-bold">
                      <Check className={cn("mr-2 h-4 w-4", !selectedCity ? "opacity-100" : "opacity-0")} />
                      Toute la France
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
        </div>

        <div className="flex gap-2">
          <div className="relative group flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input placeholder="Livre, auteur..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-12 bg-muted/50 border-none rounded-xl" />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <X size={16} />
              </button>
            )}
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="secondary" size="icon" className={cn("h-12 w-12 rounded-xl", (selectedConditions.length > 0 || sortBy !== "recent") && "bg-primary text-primary-foreground")}>
                <SlidersHorizontal size={20} />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] flex flex-col">
              <SheetHeader className="text-left border-b pb-4">
                <SheetTitle className="text-2xl font-black text-primary">Filtres</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto py-6 space-y-8">
                <div className="space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground">État du livre</h3>
                  <div className="flex flex-wrap gap-2">
                    {CONDITIONS.map(c => (
                      <Badge key={c} variant={selectedConditions.includes(c) ? "default" : "outline"} onClick={() => toggleCondition(c)} className="cursor-pointer px-4 py-2 text-xs font-bold">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Trier par</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {[{ id: "recent", label: "Plus récents" }, { id: "price-asc", label: "Prix croissant" }, { id: "price-desc", label: "Prix décroissant" }].map(o => (
                      <Button key={o.id} variant={sortBy === o.id ? "default" : "outline"} onClick={() => setSortBy(o.id as typeof sortBy)} className="justify-start font-bold h-12 rounded-xl">
                        {o.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <SheetFooter className="border-t pt-6 flex flex-col gap-3 mt-auto">
                <Button onClick={() => { setSelectedConditions([]); setSortBy("recent"); }} variant="ghost" className="w-full font-bold">Réinitialiser</Button>
                <SheetClose asChild>
                  <Button className="w-full h-14 rounded-2xl font-bold bg-primary text-lg">Appliquer</Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>

        <ScrollArea className="w-full whitespace-nowrap -mx-4 px-4 pb-1">
          <div className="flex space-x-2">
            {CATEGORIES.map(cat => (
              <Badge key={cat} onClick={() => setSelectedCategory(cat)} variant={selectedCategory === cat ? "default" : "secondary"} className={cn("px-4 py-2 cursor-pointer text-xs font-bold border", selectedCategory === cat ? "bg-primary border-primary" : "bg-card border-border text-muted-foreground")}>
                {cat}
              </Badge>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>
      </header>

      <div className="px-4 py-6">
        <div className="bg-primary rounded-2xl p-6 text-primary-foreground relative overflow-hidden shadow-lg">
          <div className="relative z-10 space-y-2 max-w-[85%]">
            <h2 className="font-headline text-xl font-black leading-tight">Partagez le savoir</h2>
            <p className="text-sm opacity-90">Donnez une seconde vie à vos livres de science islamique.</p>
          </div>
        </div>
      </div>

      <div className="px-4 grid grid-cols-2 gap-4 pb-8">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-muted rounded-2xl animate-pulse" />
          ))
        ) : filteredBooks.length === 0 ? (
          <div className="col-span-2 text-center py-20 text-muted-foreground">
            Aucun livre trouvé.
          </div>
        ) : (
          filteredBooks.map(book => <BookCard key={book.id} book={book} />)
        )}
      </div>
    </div>
  );
}
