import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({ verified: s.verified === "1" || s.verified === 1 ? "1" : undefined }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/login" });
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (search.verified === "1") {
      toast.success("Email vérifié ! Vous pouvez maintenant vous connecter.");
    }
  }, [search.verified]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("email not confirmed") || msg.includes("not confirmed") || msg.includes("confirm")) {
        toast.error("Veuillez vérifier votre adresse email avant de vous connecter.");
      } else if (msg.includes("invalid")) {
        toast.error("Email ou mot de passe incorrect.");
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success("Bienvenue !");
      navigate({ to: "/" });
    }
  };

  return (
    <div className="bg-card min-h-screen p-6 flex flex-col items-center">
      <header className="w-full mb-12 flex flex-col items-center">
        <div className="w-full flex items-start">
          <button onClick={() => history.back()} className="p-2 -ml-2"><ChevronLeft size={24} /></button>
        </div>
        <h1 className="font-headline text-2xl font-black text-center mt-4 tracking-tighter uppercase">
          CONNECTEZ-VOUS À VOTRE COMPTE
        </h1>
      </header>

      {search.verified === "1" && (
        <div className="w-full max-w-sm mb-6 p-3 bg-primary/10 border border-primary/20 flex items-center gap-2 rounded-md">
          <CheckCircle2 className="text-primary shrink-0" size={18} />
          <p className="text-xs font-medium">Compte activé. Connectez-vous !</p>
        </div>
      )}

      <form onSubmit={handleLogin} className="w-full space-y-8 flex-1 max-w-sm flex flex-col">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest">E-mail *</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="h-12 bg-card border-muted rounded-none focus-visible:ring-foreground" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest">Mot de passe *</Label>
            <div className="relative flex">
              <Input id="password" name="password" type={showPassword ? "text" : "password"} required
                className="h-12 bg-card border-muted rounded-none flex-1 pr-24 focus-visible:ring-foreground" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 h-12 px-4 bg-foreground text-background text-[10px] font-black uppercase tracking-widest">
                {showPassword ? "MASQUER" : "AFFICHER"}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center space-y-6 pt-4">
          <Link to="/forgot-password"
            className="text-[10px] font-bold text-muted-foreground hover:text-foreground uppercase tracking-wider">
            MOT DE PASSE OUBLIÉ ?
          </Link>
          <Button type="submit" disabled={loading}
            className="w-48 h-12 text-xs font-black rounded-none bg-foreground text-background uppercase tracking-widest hover:bg-foreground/90">
            {loading ? <Loader2 className="animate-spin" /> : "CONNEXION"}
          </Button>
        </div>

        <div className="w-full pt-20 mt-auto pb-12">
          <Separator />
          <div className="text-center pt-8">
            <Link to="/signup" className="text-sm text-muted-foreground hover:text-foreground font-medium">
              Pas de compte ? Créez-en un
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
