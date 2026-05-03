import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — MYKUTUB" },
      { name: "description", content: "Réponses aux questions fréquentes sur MYKUTUB." },
    ],
  }),
  component: Faq,
});

function Faq() {
  const { t } = useTranslation();
  const faqs = t("faq.items", { returnObjects: true }) as { q: string; a: string }[];

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-12 md:py-20 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="font-headline text-4xl md:text-6xl font-black">{t("faq.title")}</h1>
        <p className="text-lg text-muted-foreground">{t("faq.subtitle")}</p>
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
        <h2 className="font-headline text-xl font-bold">{t("faq.moreTitle")}</h2>
        <p className="text-muted-foreground">{t("faq.moreText")}</p>
        <Link to="/contact" className="inline-flex bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold mt-2">
          {t("faq.contactUs")}
        </Link>
      </div>
    </div>
  );
}
