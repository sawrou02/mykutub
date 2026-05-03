import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const firstName = fd.get("firstName") as string;
    const lastName = fd.get("lastName") as string;
    const email = fd.get("email") as string;
    const password = fd.get("password") as string;
    const displayName = `${firstName} ${lastName}`.trim();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { display_name: displayName },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Compte créé ! Vérifiez votre email.");
      navigate({ to: "/" });
    }
  };

  return (
    <div className="bg-card min-h-screen p-6 flex flex-col items-center">
      <header className="w-full mb-8 flex flex-col items-center">
        <div className="w-full flex items-start">
          <button onClick={() => history.back()} className="p-2 -ml-2"><ChevronLeft size={24} /></button>
        </div>
        <h1 className="font-headline text-2xl font-black text-center mt-4 tracking-tighter uppercase">
          CRÉEZ VOTRE COMPTE
        </h1>
        <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground font-medium mt-2">
          Vous avez déjà un compte ? Connectez-vous !
        </Link>
      </header>

      <form onSubmit={handleSignup} className="w-full space-y-6 max-w-sm pb-24">
        <div className="space-y-3">
          <Label className="text-xs font-bold uppercase tracking-widest">Titre</Label>
          <RadioGroup defaultValue="mr" name="title" className="flex gap-6">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="mr" id="mr" />
              <Label htmlFor="mr" className="text-sm font-medium">Mr.</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="mrs" id="mrs" />
              <Label htmlFor="mrs" className="text-sm font-medium">Mrs.</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="firstName" className="text-xs font-bold uppercase tracking-widest">Prénom *</Label>
          <Input id="firstName" name="firstName" required className="h-11 rounded-none border-muted" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName" className="text-xs font-bold uppercase tracking-widest">Nom *</Label>
          <Input id="lastName" name="lastName" required className="h-11 rounded-none border-muted" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest">E-mail *</Label>
          <Input id="email" name="email" type="email" required className="h-11 rounded-none border-muted" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest">Mot de passe *</Label>
          <Input id="password" name="password" type="password" required minLength={6} className="h-11 rounded-none border-muted" />
        </div>

        <Button type="submit" disabled={loading}
          className="w-full h-12 text-xs font-black rounded-none bg-foreground text-background uppercase tracking-widest hover:bg-foreground/90">
          {loading ? <Loader2 className="animate-spin" /> : "CRÉER MON COMPTE"}
        </Button>
      </form>
    </div>
  );
}
