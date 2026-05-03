import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

const schema = z.object({
  firstName: z.string().trim().min(1, "Prénom requis").max(50),
  lastName: z.string().trim().min(1, "Nom requis").max(50),
  email: z.string().trim().email("Email invalide").max(255),
  password: z.string().min(8, "Au moins 8 caractères").max(72),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirm"],
});

function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      firstName: fd.get("firstName"),
      lastName: fd.get("lastName"),
      email: fd.get("email"),
      password: fd.get("password"),
      confirm: fd.get("confirm"),
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { errs[i.path[0] as string] = i.message; });
      setErrors(errs);
      return;
    }
    setLoading(true);
    const { firstName, lastName, email, password } = parsed.data;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login?verified=1`,
        data: { display_name: `${firstName} ${lastName}`.trim() },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSentTo(email);
    }
  };

  if (sentTo) {
    return (
      <div className="bg-card min-h-screen p-6 flex flex-col items-center justify-center">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <MailCheck className="text-primary" size={32} />
          </div>
          <h1 className="font-headline text-2xl font-black uppercase tracking-tighter">Vérifiez votre email</h1>
          <p className="text-sm text-muted-foreground">
            Un email a été envoyé à <strong className="text-foreground">{sentTo}</strong>.
            Cliquez sur le lien de confirmation pour activer votre compte.
          </p>
          <p className="text-xs text-muted-foreground">
            Pensez à vérifier vos spams. Vous pourrez vous connecter dès que votre email sera vérifié.
          </p>
          <Link to="/login" className="inline-block w-full h-12 leading-[3rem] text-xs font-black bg-foreground text-background uppercase tracking-widest">
            Aller à la connexion
          </Link>
        </div>
      </div>
    );
  }

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

      <form onSubmit={handleSignup} className="w-full space-y-5 max-w-sm pb-24">
        <div className="space-y-1.5">
          <Label htmlFor="firstName" className="text-xs font-bold uppercase tracking-widest">Prénom *</Label>
          <Input id="firstName" name="firstName" required className="h-11 rounded-none border-muted" />
          {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName" className="text-xs font-bold uppercase tracking-widest">Nom *</Label>
          <Input id="lastName" name="lastName" required className="h-11 rounded-none border-muted" />
          {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest">E-mail *</Label>
          <Input id="email" name="email" type="email" required className="h-11 rounded-none border-muted" />
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest">Mot de passe *</Label>
          <Input id="password" name="password" type="password" required minLength={8} className="h-11 rounded-none border-muted" />
          {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm" className="text-xs font-bold uppercase tracking-widest">Confirmer le mot de passe *</Label>
          <Input id="confirm" name="confirm" type="password" required minLength={8} className="h-11 rounded-none border-muted" />
          {errors.confirm && <p className="text-xs text-destructive">{errors.confirm}</p>}
        </div>

        <Button type="submit" disabled={loading}
          className="w-full h-12 text-xs font-black rounded-none bg-foreground text-background uppercase tracking-widest hover:bg-foreground/90">
          {loading ? <Loader2 className="animate-spin" /> : "CRÉER MON COMPTE"}
        </Button>

        <p className="text-[10px] text-muted-foreground text-center">
          Un email de vérification vous sera envoyé. Vous devrez confirmer votre adresse avant de vous connecter.
        </p>
      </form>
    </div>
  );
}
