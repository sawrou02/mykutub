import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Mail, MessageCircle, MapPin } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — MYKUTUB" },
      { name: "description", content: "Contactez l'équipe MYKUTUB." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast.success(t("contact.success"));
      (e.target as HTMLFormElement).reset();
    }, 700);
  };

  const items = [
    { icon: Mail, label: t("contact.email"), value: "contact@mykutub.fr" },
    { icon: MessageCircle, label: t("contact.reply"), value: t("contact.replyTime") },
    { icon: MapPin, label: t("contact.coverage"), value: t("contact.coverageVal") },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-12 md:py-20 grid md:grid-cols-2 gap-12">
      <div className="space-y-8">
        <div>
          <h1 className="font-headline text-4xl md:text-5xl font-black">{t("contact.title")}</h1>
          <p className="text-muted-foreground mt-3">{t("contact.subtitle")}</p>
        </div>
        <div className="space-y-4">
          {items.map((c) => (
            <div key={c.label} className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <c.icon size={20} />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold">{c.label}</div>
                <div className="font-medium">{c.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={onSubmit} className="bg-card border rounded-3xl p-6 md:p-8 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("contact.name")}</Label>
            <Input id="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t("contact.email")}</Label>
            <Input id="email" type="email" required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="subject">{t("contact.subject")}</Label>
          <Input id="subject" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="message">{t("contact.message")}</Label>
          <Textarea id="message" rows={6} required />
        </div>
        <Button type="submit" disabled={submitting} className="w-full h-12 rounded-xl font-bold">
          {submitting ? t("common.sending") : t("common.send")}
        </Button>
      </form>
    </div>
  );
}
