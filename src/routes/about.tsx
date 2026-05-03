import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { BookOpen, Heart, Users } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "À propos — MYKUTUB" },
      { name: "description", content: "Découvrez la mission de MYKUTUB." },
    ],
  }),
  component: About,
});

function About() {
  const { t } = useTranslation();
  const values = [
    { icon: BookOpen, title: t("about.a_title"), text: t("about.a_text") },
    { icon: Heart, title: t("about.b_title"), text: t("about.b_text") },
    { icon: Users, title: t("about.c_title"), text: t("about.c_text") },
  ];
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-12 md:py-20 space-y-16">
      <div className="space-y-6 text-center">
        <h1 className="font-headline text-4xl md:text-6xl font-black">{t("about.title")}</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{t("about.intro")}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {values.map((v) => (
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
        <h2 className="font-headline text-2xl md:text-3xl font-bold">{t("about.freeTitle")}</h2>
        <p className="text-muted-foreground">{t("about.freeText")}</p>
        <Button asChild className="mt-4">
          <Link to="/signup">{t("about.join")}</Link>
        </Button>
      </div>
    </div>
  );
}
