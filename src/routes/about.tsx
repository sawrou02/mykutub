import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, Sprout, Sparkles, Shield, Share2, Eye, HeartHandshake } from "lucide-react";
import libraryImage from "@/assets/library.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "À propos — MYKUTUB" },
      { name: "description", content: "L'histoire et la mission de MYKUTUB, la marketplace dédiée aux livres de science islamique." },
      { property: "og:title", content: "À propos — MYKUTUB" },
      { property: "og:description", content: "Donner une seconde vie aux livres islamiques et perpétuer la tradition du partage du savoir." },
    ],
  }),
  component: About,
});

function About() {
  const mission = [
    { icon: BookOpen, emoji: "📚", title: "Donner une seconde vie aux livres islamiques", text: "Faire circuler le savoir au lieu de laisser les livres dormir sur des étagères." },
    { icon: Users, emoji: "🤝", title: "Créer des liens entre membres de la communauté", text: "Connecter ceux qui ont avec ceux qui cherchent, partout en France." },
    { icon: Sprout, emoji: "🌱", title: "Perpétuer la tradition du partage du savoir", text: "Inscrire chaque échange dans l'esprit de la Sadaqa Jariya." },
  ];

  const values = [
    { icon: Shield, title: "Confiance", text: "Une communauté de membres vérifiés. Chaque profil et chaque annonce sont modérés avec soin." },
    { icon: Share2, title: "Partage", text: "Vendre, donner, transmettre. Le savoir n'a de valeur que lorsqu'il circule entre les mains." },
    { icon: Eye, title: "Transparence", text: "Aucun frais caché, aucune commission. Les prix sont libres et fixés par les vendeurs eux-mêmes." },
    { icon: HeartHandshake, title: "Communauté", text: "Avant d'être une plateforme, MYKUTUB est une famille de lecteurs unis par la même passion." },
  ];

  return (
    <div className="bg-background">
      {/* Section 1 — Hero */}
      <section className="relative overflow-hidden bg-[oklch(0.28_0.06_155)] text-white">
        <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]" />
        <div className="relative max-w-5xl mx-auto px-4 md:px-8 py-20 md:py-32 text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider">
            <Sparkles size={14} /> Sadaqa Jariya
          </div>
          <h1 className="font-headline text-4xl md:text-6xl lg:text-7xl font-black leading-tight">Notre histoire</h1>
          <p className="text-lg md:text-2xl text-white/85 max-w-3xl mx-auto leading-relaxed">
            MYKUTUB est né d'un constat simple : des milliers de livres de science islamique dorment dans des bibliothèques alors que d'autres cherchent à apprendre.
          </p>
        </div>
      </section>

      {/* Section 2 — Mission */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-24">
        <div className="text-center mb-12 space-y-3">
          <h2 className="font-headline text-3xl md:text-5xl font-black text-primary">Notre mission</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">Trois engagements qui guident chacune de nos décisions.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {mission.map((m) => (
            <div key={m.title} className="bg-card border border-border rounded-3xl p-8 hover:shadow-xl hover:-translate-y-1 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl mb-5">{m.emoji}</div>
              <h3 className="font-headline text-xl font-bold mb-3 leading-snug">{m.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{m.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 3 — Histoire narrative */}
      <section className="bg-card border-y border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-24 grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl">
            <img src={libraryImage} alt="Bibliothèque islamique" className="absolute inset-0 w-full h-full object-cover" />
          </div>
          <div className="space-y-5">
            <h2 className="font-headline text-3xl md:text-5xl font-black text-primary">Notre histoire</h2>
            <p className="text-lg text-foreground/80 leading-relaxed">
              MYKUTUB a été créé en 2025 par un groupe de musulmans passionnés de lecture et d'apprentissage. Frustrés de voir des livres précieux rester inutilisés, ils ont décidé de créer la première marketplace dédiée aux livres de science islamique en France.
            </p>
            <p className="text-lg text-foreground/80 leading-relaxed">
              Le nom <span className="font-bold text-secondary">MYKUTUB</span> vient de l'arabe <span className="font-arabic text-2xl">كتب</span> (<em>kutub</em>) qui signifie <strong>livres</strong>.
            </p>
          </div>
        </div>
      </section>

      {/* Section 4 — Valeurs */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-24">
        <div className="text-center mb-12 space-y-3">
          <h2 className="font-headline text-3xl md:text-5xl font-black text-primary">Nos valeurs</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">Quatre piliers qui font vivre notre communauté.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {values.map((v) => (
            <div key={v.title} className="bg-card border border-border rounded-3xl p-6 hover:border-primary/40 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-2xl bg-secondary/15 text-secondary flex items-center justify-center mb-4">
                <v.icon size={22} />
              </div>
              <h3 className="font-headline text-lg font-bold mb-2">{v.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 5 — CTA Communauté */}
      <section className="px-4 md:px-8 pb-20 md:pb-28">
        <div className="max-w-5xl mx-auto bg-gradient-to-br from-primary to-[oklch(0.45_0.08_180)] text-primary-foreground rounded-3xl p-10 md:p-16 text-center shadow-2xl">
          <Sparkles className="mx-auto mb-4 opacity-80" size={32} />
          <h2 className="font-headline text-3xl md:text-5xl font-black mb-4 leading-tight">Rejoignez les 247 membres qui partagent le savoir</h2>
          <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto mb-8">Créez votre compte et participez à une chaîne de bienfaisance qui ne s'arrête jamais.</p>
          <Button asChild size="lg" variant="secondary" className="h-14 px-10 rounded-2xl text-base font-black">
            <Link to="/signup">Créer mon compte</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
