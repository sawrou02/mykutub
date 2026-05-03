import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { BookOpen, Heart, Users } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "À propos — MYKUTUB" },
      { name: "description", content: "Découvrez la mission de MYKUTUB : faire circuler le savoir islamique grâce à une marketplace solidaire." },
      { property: "og:title", content: "À propos de MYKUTUB" },
      { property: "og:description", content: "Notre mission : faire vivre le savoir islamique dans la communauté." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-12 md:py-20 space-y-16">
      <div className="space-y-6 text-center">
        <h1 className="font-headline text-4xl md:text-6xl font-black">Notre mission</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          MYKUTUB est née d'un constat simple : trop de livres de science islamique restent oubliés dans les étagères, alors qu'ils pourraient nourrir d'autres lecteurs assoiffés de connaissance.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {[
          { icon: BookOpen, title: "Faire circuler le savoir", text: "Chaque livre revendu ou donné est une nouvelle opportunité d'apprentissage." },
          { icon: Heart, title: "Encourager la Sadaqa", text: "Donner ses livres, c'est offrir une aumône qui continue à porter ses fruits." },
          { icon: Users, title: "Unir la communauté", text: "Une plateforme par et pour les francophones musulmans, partout en France." },
        ].map((v) => (
          <div key={v.title} className="bg-card border rounded-3xl p-6">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
              <v.icon size={22} />
            </div>
            <h3 className="font-headline font-bold text-lg mb-2">{v.title}</h3>
            <p className="text-sm text-muted-foreground">{v.text}</p>
          </div>
        ))}
      </div>

      <div className="bg-muted/40 rounded-3xl p-8 md:p-12 space-y-4">
        <h2 className="font-headline text-2xl md:text-3xl font-bold">Une plateforme gratuite</h2>
        <p className="text-muted-foreground">
          MYKUTUB ne prélève aucune commission. Les échanges se font directement entre membres via la messagerie intégrée. L'esprit reste le même : partager, transmettre, élever.
        </p>
        <Button asChild className="mt-4">
          <Link to="/signup">Rejoindre la communauté</Link>
        </Button>
      </div>
    </div>
  );
}
