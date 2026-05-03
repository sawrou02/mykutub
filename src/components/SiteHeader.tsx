import { Link, useLocation } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, BookOpen, MessageCircle, User, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useUnreadChats } from "@/hooks/useUnreadChats";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ShieldCheck } from "lucide-react";

export function SiteHeader() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { t } = useTranslation();

  const links = [
    { to: "/", label: t("nav.home") },
    { to: "/catalog", label: t("nav.catalog") },
    { to: "/how-it-works", label: t("nav.howItWorks") },
    { to: "/about", label: t("nav.about") },
    { to: "/faq", label: t("nav.faq") },
    { to: "/contact", label: t("nav.contact") },
  ] as const;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 md:px-8">
        <Link to="/" className="flex items-center gap-2">
          <BookOpen className="text-primary" size={22} />
          <span className="font-headline text-xl font-bold text-primary tracking-tight">MYKUTUB</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {links.map((l) => {
            const isActive = pathname === l.to || (l.to !== "/" && pathname.startsWith(l.to));
            return (
              <Link
                key={l.to}
                to={l.to}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <LanguageSwitcher />
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link to="/publish"><PlusCircle size={16} /> {t("nav.publish")}</Link>
          </Button>
          {user ? (
            <>
              {isAdmin && (
                <Button asChild variant="ghost" size="icon" title="Admin">
                  <Link to="/admin"><ShieldCheck size={18} className="text-primary" /></Link>
                </Button>
              )}
              <Button asChild variant="ghost" size="icon">
                <Link to="/messages"><MessageCircle size={18} /></Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link to="/profile"><User size={16} /> {t("nav.account")}</Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">{t("nav.login")}</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/signup">{t("nav.signup")}</Link>
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <LanguageSwitcher />
          <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu size={22} />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px]">
            <div className="flex flex-col gap-1 mt-8">
              {links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="px-4 py-3 rounded-lg text-base font-medium hover:bg-muted"
                >
                  {l.label}
                </Link>
              ))}
              <div className="border-t my-4" />
              {user ? (
                <>
                  <Link to="/publish" className="px-4 py-3 rounded-lg font-medium hover:bg-muted">{t("nav.publishBook")}</Link>
                  <Link to="/messages" className="px-4 py-3 rounded-lg font-medium hover:bg-muted">{t("nav.messages")}</Link>
                  <Link to="/profile" className="px-4 py-3 rounded-lg font-medium hover:bg-muted">{t("nav.account")}</Link>
                </>
              ) : (
                <>
                  <Link to="/login" className="px-4 py-3 rounded-lg font-medium hover:bg-muted">{t("nav.login")}</Link>
                  <Link to="/signup" className="px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium text-center">{t("nav.signup")}</Link>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
        </div>
      </div>
    </header>
  );
}
