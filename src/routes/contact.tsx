import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Mail, Clock, Globe, Instagram, Send, ArrowRight, CheckCircle2 } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — MYKUTUB" },
      { name: "description", content: "Une question, une suggestion ou un problème ? Contactez l'équipe MYKUTUB, réponse sous 24h." },
      { property: "og:title", content: "Contact — MYKUTUB" },
      { property: "og:description", content: "Écrivez-nous, nous répondons dans les 24 heures inshaaAllah." },
    ],
  }),
  component: Contact,
});

const subjects = [
  "Question générale",
  "Problème technique",
  "Signaler une annonce",
  "Partenariat",
  "Autre",
];

const schema = z.object({
  name: z.string().trim().min(2, "Prénom et nom requis").max(100),
  email: z.string().trim().email("Email invalide").max(255),
  subject: z.string().min(1, "Sélectionnez un sujet"),
  message: z.string().trim().min(50, "Message trop court (50 caractères min.)").max(2000),
});

type Errors = Partial<Record<keyof z.infer<typeof schema>, string>>;

function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      name: String(fd.get("name") || ""),
      email: String(fd.get("email") || ""),
      subject: String(fd.get("subject") || ""),
      message: String(fd.get("message") || ""),
    };
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      const errs: Errors = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof Errors;
        if (!errs[k]) errs[k] = issue.message;
      }
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 700);
  };

  return (
    <div className="bg-background">
      {/* Header */}
      <section className="relative overflow-hidden bg-[oklch(0.28_0.06_155)] text-white">
        <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]" />
        <div className="relative max-w-5xl mx-auto px-4 md:px-8 py-16 md:py-24 text-center space-y-4">
          <h1 className="font-headline text-4xl md:text-6xl font-black">Nous contacter</h1>
          <p className="text-lg md:text-xl text-white/85 max-w-2xl mx-auto">
            Une question, une suggestion ou un problème ? Nous répondons dans les 24 heures.
          </p>
        </div>
      </section>

      {/* Main */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-12 md:py-20 grid lg:grid-cols-[1.3fr_1fr] gap-10">
        {/* Form */}
        <div>
          {submitted ? (
            <div className="bg-card border border-secondary/30 rounded-3xl p-10 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-secondary/15 text-secondary flex items-center justify-center">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="font-headline text-2xl md:text-3xl font-black text-secondary">JazakAllahu Khayran !</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Nous avons bien reçu ton message. Réponse sous 24h inshaaAllah.
              </p>
              <Button variant="outline" onClick={() => setSubmitted(false)}>Envoyer un autre message</Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="bg-card border border-border rounded-3xl p-6 md:p-8 space-y-5 shadow-sm">
              <div className="space-y-2">
                <Label htmlFor="name">Prénom et nom <span className="text-destructive">*</span></Label>
                <Input id="name" name="name" placeholder="Ahmed Benali" />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                <Input id="email" name="email" type="email" placeholder="vous@email.com" />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Sujet <span className="text-destructive">*</span></Label>
                <select
                  id="subject"
                  name="subject"
                  defaultValue=""
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="" disabled>Choisir un sujet…</option>
                  {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.subject && <p className="text-sm text-destructive">{errors.subject}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message <span className="text-destructive">*</span></Label>
                <Textarea id="message" name="message" rows={7} placeholder="Décris ta demande en quelques lignes (50 caractères minimum)…" />
                {errors.message && <p className="text-sm text-destructive">{errors.message}</p>}
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-13 py-6 rounded-xl font-black text-base bg-secondary text-secondary-foreground hover:opacity-90"
              >
                <Send size={18} /> {submitting ? "Envoi…" : "Envoyer le message"}
              </Button>
            </form>
          )}
        </div>

        {/* Infos */}
        <aside className="space-y-6">
          <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
            <h2 className="font-headline text-lg font-black">Informations</h2>
            {[
              { icon: Mail, emoji: "📧", label: "Email", value: "contact@mykutub.com" },
              { icon: Clock, emoji: "⏱️", label: "Temps de réponse", value: "Sous 24h (du lundi au vendredi)" },
              { icon: Globe, emoji: "🌍", label: "Basé en", value: "France" },
            ].map((c) => (
              <div key={c.label} className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl shrink-0">{c.emoji}</div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold">{c.label}</div>
                  <div className="font-medium">{c.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 rounded-3xl p-6 space-y-4">
            <h3 className="font-headline text-lg font-black">Rejoins notre communauté</h3>
            <div className="flex gap-3">
              {[
                { label: "Instagram", icon: Instagram, href: "#" },
                { label: "WhatsApp", icon: Send, href: "#" },
                { label: "Telegram", icon: Send, href: "#" },
              ].map((s) => (
                <a key={s.label} href={s.href} aria-label={s.label} className="w-12 h-12 rounded-2xl bg-card border border-border text-primary hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition">
                  <s.icon size={20} />
                </a>
              ))}
            </div>
          </div>
        </aside>
      </section>

      {/* Quick FAQ */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 pb-20">
        <h2 className="font-headline text-2xl md:text-3xl font-black text-primary text-center mb-6">Questions fréquentes</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            "Comment publier une annonce ?",
            "Comment contacter un vendeur ?",
            "La plateforme est-elle gratuite ?",
          ].map((q) => (
            <Link
              key={q}
              to="/faq"
              className="group bg-card border border-border rounded-2xl p-5 flex items-center justify-between gap-3 hover:border-primary/40 hover:shadow-md transition"
            >
              <span className="font-bold">{q}</span>
              <ArrowRight size={18} className="text-primary shrink-0 group-hover:translate-x-1 transition-transform" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
