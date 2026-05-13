import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, KeyRound, Bell, Shield, Trash2, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

type Prefs = {
  notify_email: boolean;
  notify_sms: boolean;
  notify_push: boolean;
  phone_visible: boolean;
};

function SettingsPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({ notify_email: true, notify_sms: false, notify_push: true, phone_visible: false });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("notify_email, notify_sms, notify_push, phone_visible").eq("id", user.id).maybeSingle()
      .then(({ data }) => { if (data) setPrefs(data as Prefs); });
  }, [user]);

  if (authLoading) return <div className="p-10 text-center">Chargement...</div>;
  if (!user) {
    return (
      <div className="p-10 text-center space-y-4">
        <p>Connectez-vous pour accéder aux paramètres.</p>
        <Button onClick={() => navigate({ to: "/login" })}>Se connecter</Button>
      </div>
    );
  }

  const handlePwdChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 6) { toast.error("Mot de passe trop court (min 6)"); return; }
    if (pwd !== pwd2) { toast.error("Les mots de passe ne correspondent pas"); return; }
    setPwdLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setPwdLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Mot de passe mis à jour"); setPwd(""); setPwd2(""); }
  };

  const savePrefs = async (next: Prefs) => {
    setPrefs(next);
    setSavingPrefs(true);
    const { error } = await supabase.from("profiles").update(next).eq("id", user.id);
    setSavingPrefs(false);
    if (error) toast.error(error.message);
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Cette action est irréversible. Toutes vos annonces et données seront supprimées. Continuer ?")) return;
    if (!confirm("Vraiment ? Tapez OK pour confirmer définitivement.")) return;
    setDeleting(true);
    // Delete user data first (books, favorites, profile)
    await supabase.from("books").delete().eq("seller_id", user.id);
    await supabase.from("favorites").delete().eq("user_id", user.id);
    await supabase.from("profiles").delete().eq("id", user.id);
    // Sign out
    await signOut();
    setDeleting(false);
    toast.success("Compte supprimé. Contactez le support pour la suppression complète.");
    navigate({ to: "/" });
  };

  return (
    <div className="bg-background min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-card border-b px-4 py-3 flex items-center gap-3">
        <Link to="/profile" className="p-2"><ChevronLeft size={24} /></Link>
        <h1 className="font-headline text-xl font-bold">Paramètres du compte</h1>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Mot de passe */}
        <section className="bg-card border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary"><KeyRound size={18} /></div>
            <h2 className="font-headline font-bold text-lg">Mot de passe</h2>
          </div>
          <form onSubmit={handlePwdChange} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest">Nouveau mot de passe</Label>
              <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} className="h-11" minLength={6} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest">Confirmer</Label>
              <Input type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} className="h-11" minLength={6} required />
            </div>
            <Button type="submit" disabled={pwdLoading} className="w-full h-12 rounded-xl font-bold">
              {pwdLoading ? <Loader2 className="animate-spin" size={16} /> : "Mettre à jour"}
            </Button>
          </form>
        </section>

        {/* Notifications */}
        <section className="bg-card border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary"><Bell size={18} /></div>
            <h2 className="font-headline font-bold text-lg">Notifications</h2>
            {savingPrefs && <Loader2 className="animate-spin text-muted-foreground" size={14} />}
          </div>
          <div className="space-y-3">
            {[
              { key: "notify_email" as const, label: "Email", desc: "Recevoir les notifications par email" },
              { key: "notify_sms" as const, label: "SMS", desc: "Recevoir les notifications par SMS" },
              { key: "notify_push" as const, label: "Push", desc: "Notifications push dans le navigateur" },
            ].map(opt => (
              <div key={opt.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-semibold text-sm">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
                <Switch checked={prefs[opt.key]} onCheckedChange={(v) => savePrefs({ ...prefs, [opt.key]: v })} />
              </div>
            ))}
          </div>
        </section>

        {/* Confidentialité */}
        <section className="bg-card border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary"><Shield size={18} /></div>
            <h2 className="font-headline font-bold text-lg">Confidentialité</h2>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <p className="font-semibold text-sm">Téléphone visible</p>
              <p className="text-xs text-muted-foreground">Les autres utilisateurs peuvent voir votre numéro</p>
            </div>
            <Switch checked={prefs.phone_visible} onCheckedChange={(v) => savePrefs({ ...prefs, phone_visible: v })} />
          </div>
        </section>

        {/* Zone danger */}
        <section className="bg-card border border-destructive/30 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-lg text-destructive"><Trash2 size={18} /></div>
            <h2 className="font-headline font-bold text-lg text-destructive">Supprimer le compte</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Cette action supprimera toutes vos annonces, favoris et informations personnelles. Elle est irréversible.
          </p>
          <Button onClick={handleDeleteAccount} disabled={deleting} variant="destructive" className="w-full h-12 rounded-xl font-bold">
            {deleting ? <Loader2 className="animate-spin" size={16} /> : "Supprimer mon compte"}
          </Button>
        </section>
      </div>
    </div>
  );
}
