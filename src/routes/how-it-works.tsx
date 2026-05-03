import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Camera, MessageCircle, Handshake, Search, ShoppingBag, Gift } from "lucide-react";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "Comment ça marche — MYKUTUB" },
      { name: "description", content: "Acheter, vendre ou donner un livre de science islamique sur MYKUTUB en 3 étapes simples." },
      { property: "og:title", content: "Comment fonctionne MYKUTUB" },
      { property: "og:description", content: "Trois étapes simples pour acheter, vendre ou donner un livre." },
    ],
  }),
  component: HowItWorks,
});

const sellerSteps = [
  { icon: Camera, title: "1. Photographiez", text: "Prenez une photo claire de votre livre et remplissez le formulaire en moins de 2 minutes." },
  { icon: MessageCircle, title: "2. Échangez", text: "Recevez les messages des intéressés via la messagerie intégrée." },
  { icon: Handshake, title: "3. Remettez le livre", text: "Convenez d'un point de rencontre ou d'un envoi postal." },
];

const buyerSteps = [
  { icon: Search, title: "1. Cherchez", text: "Filtrez par catégorie, ville, état du livre ou prix." },
  { icon: MessageCircle, title: "2. Contactez", text: "Posez vos questions au vendeur en un clic." },
  { icon: ShoppingBag, title: "3. Récupérez", text: "Achetez ou recevez gratuitement votre livre." },
];

function HowItWorks() {
  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-12 md:py-20 space-y-20">
      <div className="text-center space-y-4">
        <h1 className="font-headline text-4xl md:text-6xl font-black">Comment ça marche ?</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Une plateforme simple, transparente et 100% gratuite.
        </p>
      </div>

      <section className="space-y-8">
        <h2 className="font-headline text-2xl md:text-3xl font-bold">Vous voulez vendre ou donner</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {sellerSteps.map((s) => (
            <div key={s.title} className="bg-card border rounded-3xl p-6">
              <div className="w-12 h-12 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center mb-4">
                <s.icon size={22} />
              </div>
              <h3 className="font-bold mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
        <Button asChild size="lg" className="rounded-2xl">
          <Link to="/publish">Publier mon livre</Link>
        </Button>
      </section>

      <section className="space-y-8">
        <h2 className="font-headline text-2xl md:text-3xl font-bold">Vous cherchez un livre</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {buyerSteps.map((s) => (
            <div key={s.title} className="bg-card border rounded-3xl p-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <s.icon size={22} />
              </div>
              <h3 className="font-bold mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
        <Button asChild size="lg" variant="outline" className="rounded-2xl">
          <Link to="/catalog">Voir le catalogue</Link>
        </Button>
      </section>

      <div className="bg-secondary/10 border border-secondary/20 rounded-3xl p-8 md:p-12 flex items-start gap-4">
        <Gift className="text-secondary shrink-0 mt-1" size={28} />
        <div>
          <h3 className="font-headline text-xl font-bold mb-2">L'esprit Sadaqa</h3>
          <p className="text-muted-foreground">
            Vous pouvez choisir de donner gratuitement votre livre. Une aumône continue, accessible en un clic.
          </p>
        </div>
      </div>
    </div>
  );
}
