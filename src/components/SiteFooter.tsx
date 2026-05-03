import { Link } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t bg-card mt-20">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1 space-y-3">
          <Link to="/" className="flex items-center gap-2">
            <BookOpen className="text-primary" size={22} />
            <span className="font-headline text-xl font-bold text-primary">MYKUTUB</span>
          </Link>
          <p className="text-sm text-muted-foreground max-w-xs">
            La marketplace dédiée aux livres de science islamique d'occasion.
          </p>
        </div>
        <div>
          <h4 className="font-bold text-sm mb-3">Plateforme</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/catalog" className="hover:text-primary">Catalogue</Link></li>
            <li><Link to="/publish" className="hover:text-primary">Publier un livre</Link></li>
            <li><Link to="/how-it-works" className="hover:text-primary">Comment ça marche</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-sm mb-3">Entreprise</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/about" className="hover:text-primary">À propos</Link></li>
            <li><Link to="/faq" className="hover:text-primary">FAQ</Link></li>
            <li><Link to="/contact" className="hover:text-primary">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-sm mb-3">Compte</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/login" className="hover:text-primary">Connexion</Link></li>
            <li><Link to="/signup" className="hover:text-primary">Créer un compte</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 text-xs text-muted-foreground text-center">
          © {new Date().getFullYear()} MYKUTUB · Partagez le savoir
        </div>
      </div>
    </footer>
  );
}
