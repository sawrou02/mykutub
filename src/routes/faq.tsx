import { createFileRoute, Link } from "@tanstack/react-router";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — MYKUTUB" },
      { name: "description", content: "Réponses aux questions fréquentes sur MYKUTUB : inscription, publication, paiements, livraisons." },
      { property: "og:title", content: "Questions fréquentes — MYKUTUB" },
      { property: "og:description", content: "Tout ce que vous devez savoir avant d'acheter ou vendre un livre." },
    ],
  }),
  component: Faq,
});

const faqs = [
  { q: "MYKUTUB est-elle gratuite ?", a: "Oui, totalement. Aucune commission, aucun frais de mise en ligne. La plateforme est financée pour servir la communauté." },
  { q: "Comment se passe le paiement ?", a: "Le paiement se fait directement entre acheteur et vendeur (espèces lors de la remise, virement, etc.). MYKUTUB n'intervient pas dans la transaction." },
  { q: "Puis-je donner un livre gratuitement ?", a: "Bien sûr ! Lors de la publication, cochez l'option « Don ». Votre annonce apparaîtra avec le badge Sadaqa." },
  { q: "Comment se fait la livraison ?", a: "Vous convenez librement avec le vendeur : remise en main propre, point relais, ou envoi postal." },
  { q: "Quels types de livres sont acceptés ?", a: "Uniquement des livres de science islamique : Coran, Hadith, Fiqh, Aqida, Sira, livres pour enfants, moutoun, etc." },
  { q: "Comment signaler un problème ?", a: "Contactez-nous via le formulaire de contact. Nous traitons chaque signalement avec sérieux." },
  { q: "Puis-je supprimer une annonce ?", a: "Oui, à tout moment depuis votre profil. La suppression est immédiate et définitive." },
];

function Faq() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-12 md:py-20 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="font-headline text-4xl md:text-6xl font-black">Questions fréquentes</h1>
        <p className="text-lg text-muted-foreground">Tout ce que vous devez savoir pour démarrer.</p>
      </div>

      <Accordion type="single" collapsible className="space-y-3">
        {faqs.map((f, i) => (
          <AccordionItem key={i} value={`item-${i}`} className="bg-card border rounded-2xl px-6 border-b">
            <AccordionTrigger className="font-bold text-left hover:no-underline">{f.q}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <div className="bg-muted/40 rounded-3xl p-8 text-center space-y-3">
        <h2 className="font-headline text-xl font-bold">Une autre question ?</h2>
        <p className="text-muted-foreground">Notre équipe répond dans la journée.</p>
        <Link to="/contact" className="inline-flex bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold mt-2">
          Nous contacter
        </Link>
      </div>
    </div>
  );
}
