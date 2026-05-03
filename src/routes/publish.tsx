import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Camera, ChevronLeft, Loader2, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CATEGORIES, CONDITIONS, ALL_CITIES } from "@/lib/mykutub";

export const Route = createFileRoute("/publish")({
  component: PublishPage,
});

function PublishPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDonation, setIsDonation] = useState(false);
  const [canDeliver, setCanDeliver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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
    const fd = new FormData(e.currentTarget);
    const data = {
      title: fd.get("title") as string,
      category: fd.get("category") as string,
      condition: fd.get("condition") as string,
      city: fd.get("city") as string,
      description: fd.get("description") as string,
      price: isDonation ? 0 : Number(fd.get("price")),
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

  return (
    <div className="bg-background min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-card border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => history.back()} className="p-2"><ChevronLeft size={24} /></button>
        <h1 className="font-headline text-xl font-bold">Publier une annonce</h1>
      </header>

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
          <Input id="title" name="title" required className="h-11" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description" className="text-xs font-bold uppercase tracking-widest">Description</Label>
          <Textarea id="description" name="description" rows={4} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-widest">Catégorie *</Label>
            <Select name="category" required>
              <SelectTrigger className="h-11"><SelectValue placeholder="Choisir" /></SelectTrigger>
              <SelectContent>
                {categoriesNoTout.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-widest">État *</Label>
            <Select name="condition" required>
              <SelectTrigger className="h-11"><SelectValue placeholder="Choisir" /></SelectTrigger>
              <SelectContent>
                {CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold uppercase tracking-widest">Ville *</Label>
          <Select name="city" required>
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
            <Input id="price" name="price" type="number" min={0} step={0.5} required className="h-11" />
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full h-14 rounded-2xl text-base font-bold">
          {loading ? <Loader2 className="animate-spin" /> : "Publier l'annonce"}
        </Button>
      </form>
    </div>
  );
}
