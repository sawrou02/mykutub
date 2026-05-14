import { createFileRoute, Link } from "@tanstack/react-router";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, BookOpen, ShoppingBag, Shield, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — MYKUTUB" },
      { name: "description", content: "Toutes les réponses aux questions les plus fréquentes sur MYKUTUB." },
      { property: "og:title", content: "FAQ — MYKUTUB" },
      { property: "og:description", content: "Acheter, vendre, donner : nos réponses aux questions sur la marketplace de livres islamiques." },
    ],
  }),
  component: Faq,
});

const categories = [
  {
    icon: HelpCircle,
    title: "Général",
    items: [
      { q: "C'est quoi MYKUTUB ?", a: "MYKUTUB est la première marketplace dédiée aux livres de science islamique d'occasion en France. Tu peux acheter, vendre ou donner gratuitement tes livres à d'autres membres de la communauté." },
      { q: "C'est gratuit ?", a: "Oui, totalement. La plateforme est 100% gratuite pour publier et acheter. Aucune commission n'est prélevée sur les ventes." },
      { q: "Qui peut utiliser MYKUTUB ?", a: "Toute personne souhaitant acheter, vendre ou donner des livres de science islamique. Tu dois créer un compte pour publier une annonce ou contacter un vendeur." },
    ],
  },
  {
    icon: BookOpen,
    title: "Vendre un livre",
    items: [
      { q: "Comment publier une annonce ?", a: "Clique sur « Publier un livre », remplis le formulaire avec la photo, le titre, l'état, le prix et ta ville. Ton annonce est visible immédiatement après publication." },
      { q: "Quels livres puis-je vendre ?", a: "Tous les livres de science islamique : Coran, Tafsir, Hadith, Fiqh, Aqida, Sira, langue arabe, etc. Les livres doivent être en rapport avec l'islam et en bon état général." },
      { q: "Comment fixer mon prix ?", a: "C'est toi qui décides. Tu peux aussi proposer le livre gratuitement en cochant l'option « Don Sadaqa ». Nous recommandons des prix entre 20% et 50% du prix neuf." },
      { q: "Qu'est-ce que la Sadaqa Jariya ?", a: "Donner un livre de science islamique est considéré comme une Sadaqa Jariya — une aumône continue dont la récompense dure après la mort. En cochant cette option, ton livre sera proposé gratuitement à qui en a besoin." },
    ],
  },
  {
    icon: ShoppingBag,
    title: "Acheter un livre",
    items: [
      { q: "Comment contacter un vendeur ?", a: "Sur la fiche d'un livre, clique sur « Contacter le vendeur ». Un message lui sera envoyé directement via notre messagerie intégrée." },
      { q: "Comment se passe le paiement ?", a: "Le paiement et la livraison se font directement entre acheteur et vendeur. MYKUTUB facilite la mise en relation mais n'intervient pas dans la transaction." },
      { q: "Que faire si le livre ne correspond pas ?", a: "Contacte le vendeur directement. Nous recommandons de toujours vérifier les photos et la description avant d'acheter." },
    ],
  },
  {
    icon: Shield,
    title: "Compte et sécurité",
    items: [
      { q: "Comment créer un compte ?", a: "Clique sur « S'inscrire », entre ton email et un mot de passe. C'est tout — ton compte est créé en 30 secondes." },
      { q: "Mes données sont-elles sécurisées ?", a: "Oui. Nous ne partageons jamais tes données personnelles avec des tiers. Seuls ton prénom et ta ville sont visibles sur tes annonces." },
    ],
  },
];

function Faq() {
  return (
    <div className="bg-background">
      <section className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-16 md:py-24 text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
            <HelpCircle size={14} /> Aide & questions
          </div>
          <h1 className="font-headline text-4xl md:text-6xl font-black text-primary">Foire aux questions</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Tout ce que vous devez savoir pour acheter, vendre ou donner sur MYKUTUB.</p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 md:px-8 py-12 md:py-16 space-y-12">
        {categories.map((cat) => (
          <section key={cat.title} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <cat.icon size={20} />
              </div>
              <h2 className="font-headline text-2xl md:text-3xl font-black text-primary">{cat.title}</h2>
            </div>
            <Accordion type="single" collapsible className="space-y-3">
              {cat.items.map((f, i) => (
                <AccordionItem key={i} value={`${cat.title}-${i}`} className="bg-card border border-border rounded-2xl px-5 md:px-6 last:border-b">
                  <AccordionTrigger className="font-bold text-left hover:no-underline py-5">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-5">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ))}

        <div className="bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 rounded-3xl p-8 md:p-10 text-center space-y-4">
          <h3 className="font-headline text-xl md:text-2xl font-black">Tu n'as pas trouvé ta réponse ?</h3>
          <p className="text-muted-foreground">Notre équipe te répond sous 24 heures.</p>
          <Link to="/contact" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold hover:opacity-90 transition">
            Contacte-nous <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}
