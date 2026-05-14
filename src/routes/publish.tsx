import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Camera, ChevronLeft, Eye, Heart, Loader2, Truck, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CATEGORIES, CONDITIONS, ALL_CITIES } from "@/lib/mykutub";

export const Route = createFileRoute("/publish")({
  component: PublishPage,
});

function PreviewCard({
  imagePreview,
  title,
  price,
  city,
  isDonation,
  canDeliver,
  sellerName,
}: {
  imagePreview: string | null;
  title: string;
  price: string;
  city: string;
  isDonation: boolean;
  canDeliver: boolean;
  sellerName: string;
}) {
  const initial = (sellerName || "?").trim().charAt(0).toUpperCase();
  return (
    <div className="block">
      <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 bg-primary">
          {initial}
        </div>
        <span className="text-[11px] font-medium text-foreground truncate">{sellerName || "Vous"}</span>
      </div>

      <div className="relative aspect-square overflow-hidden bg-muted rounded-lg">
        {imagePreview ? (
          <img src={imagePreview} alt={title || "aperçu"} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <Camera size={32} />
          </div>
        )}
        <button
          type="button"
          disabled
          className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-white/90 text-foreground shadow-sm"
          aria-label="Favori"
        >
          <Heart size={12} />
        </button>
        {isDonation && (
          <span className="absolute top-1.5 left-1.5 bg-secondary text-secondary-foreground text-[8px] font-bold uppercase px-1.5 py-0.5 rounded">
            Sadaqa
          </span>
        )}
      </div>
      <div className="pt-1.5 space-y-0.5">
        <h3 className={cn("font-semibold text-[13px] leading-tight line-clamp-2", !title && "text-muted-foreground italic")}>
          {title || "Titre du livre"}
        </h3>
        <p className="font-bold text-sm text-foreground">
          {isDonation ? "Don" : price ? `${price} €` : "— €"}
        </p>
        {canDeliver && (
          <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Truck size={10} /> Livraison possible
          </p>
        )}
        <p className="text-[10px] text-muted-foreground truncate">
          {city || "Ville"} · {new Date().toLocaleDateString("fr-FR")}
        </p>
      </div>
    </div>
  );
}

function PublishPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDonation, setIsDonation] = useState(false);
  const [canDeliver, setCanDeliver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [city, setCity] = useState("");
  const [price, setPrice] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      toast.error("Image trop volumineuse (max 1 Mo).");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) {
      toast.error("Connexion requise.");
      navigate({ to: "/login" });
      return;
    }
    if (!imagePreview) {
      toast.error("Veuillez ajouter une photo.");
      return;
    }
    setLoading(true);
    const data = {
      title,
      category,
      condition,
      city,
      description,
      price: isDonation ? 0 : Number(price),
      is_donation: isDonation,
      can_deliver: canDeliver,
      seller_id: user.id,
      seller_name: user.user_metadata?.display_name || user.email?.split("@")[0] || "Utilisateur",
      image_url: imagePreview,
    };
    const { error } = await supabase.from("books").insert(data);
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Annonce publiée !");
      navigate({ to: "/" });
    }
  }

  const categoriesNoTout = CATEGORIES.filter(c => c !== "Tout");
  const sellerName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Vous";

  const previewProps = { imagePreview, title, price, city, isDonation, canDeliver, sellerName };

  return (
    <div className="bg-background min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-card border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => history.back()} className="p-2"><ChevronLeft size={24} /></button>
        <h1 className="font-headline text-xl font-bold">Publier une annonce</h1>
      </header>

      <div className="max-w-6xl mx-auto lg:grid lg:grid-cols-[1fr_320px] lg:gap-8 lg:px-6">
        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          <div>
            <Label className="text-xs font-bold uppercase tracking-widest mb-2 block">Photo *</Label>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            {imagePreview ? (
              <div className="relative aspect-[3/4] w-full max-w-xs mx-auto rounded-2xl overflow-hidden bg-muted">
                <img src={imagePreview} alt="aperçu" className="absolute inset-0 w-full h-full object-cover" />
                <button type="button" onClick={() => { setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  className="absolute top-2 right-2 p-2 bg-destructive text-destructive-foreground rounded-full">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="aspect-[3/4] w-full max-w-xs mx-auto border-2 border-dashed border-primary/30 rounded-2xl flex flex-col items-center justify-center gap-3 text-primary/60 hover:bg-primary/5">
                <Camera size={40} />
                <span className="font-bold text-xs uppercase tracking-wider">Ajouter une photo</span>
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs font-bold uppercase tracking-widest">Titre *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="h-11" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-bold uppercase tracking-widest">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest">Catégorie *</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger className="h-11"><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>
                  {categoriesNoTout.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest">État *</Label>
              <Select value={condition} onValueChange={setCondition} required>
                <SelectTrigger className="h-11"><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-widest">Ville *</Label>
            <Select value={city} onValueChange={setCity} required>
              <SelectTrigger className="h-11"><SelectValue placeholder="Choisir" /></SelectTrigger>
              <SelectContent>
                {ALL_CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3 p-4 bg-secondary/10 rounded-2xl">
            <Checkbox id="donation" checked={isDonation} onCheckedChange={(v) => setIsDonation(!!v)} />
            <Label htmlFor="donation" className="font-bold text-sm cursor-pointer">Je donne ce livre (Sadaqa)</Label>
          </div>

          <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-2xl">
            <Checkbox id="delivery" checked={canDeliver} onCheckedChange={(v) => setCanDeliver(!!v)} className="mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="delivery" className="font-bold text-sm cursor-pointer">Livraison possible</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Cochez si vous proposez la livraison à l'acheteur.</p>
            </div>
          </div>

          {!isDonation && (
            <div className="space-y-1.5">
              <Label htmlFor="price" className="text-xs font-bold uppercase tracking-widest">Prix (€) *</Label>
              <Input id="price" type="number" min={0} step={0.5} value={price} onChange={(e) => setPrice(e.target.value)} required className="h-11" />
            </div>
          )}

          {/* Mobile preview trigger */}
          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button type="button" variant="outline" className="w-full h-12 rounded-2xl gap-2 font-bold">
                  <Eye size={16} /> Voir l'aperçu
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-3xl">
                <SheetHeader className="text-left mb-4">
                  <SheetTitle>Aperçu de l'annonce</SheetTitle>
                </SheetHeader>
                <div className="max-w-[220px] mx-auto pb-6">
                  <PreviewCard {...previewProps} />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <Button type="submit" disabled={loading} className="w-full h-14 rounded-2xl text-base font-bold">
            {loading ? <Loader2 className="animate-spin" /> : "Publier l'annonce"}
          </Button>
        </form>

        {/* Desktop preview panel */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 pt-4">
            <div className="bg-card border rounded-3xl p-5">
              <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <Eye size={14} /> Aperçu en direct
              </div>
              <div className="max-w-[240px] mx-auto">
                <PreviewCard {...previewProps} />
              </div>
              <p className="text-[11px] text-muted-foreground text-center mt-4">
                Voici comment votre annonce apparaîtra dans le catalogue.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
