import { Link, useLocation } from "@tanstack/react-router";
import { Home, PlusCircle, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Accueil", to: "/", icon: Home },
  { label: "Publier", to: "/publish", icon: PlusCircle },
  { label: "Messages", to: "/messages", icon: MessageCircle },
  { label: "Compte", to: "/profile", icon: User },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-xl h-16 bg-card border-t flex items-center justify-around z-50 px-4">
      {navItems.map((item) => {
        const isActive = pathname === item.to;
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex flex-col items-center justify-center space-y-1 w-full h-full transition-colors",
              isActive ? "text-primary" : "text-muted-foreground hover:text-primary/70"
            )}
          >
            <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
