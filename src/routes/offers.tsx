import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { ChevronLeft, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MyOffersList } from "@/components/MyOffersList";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/offers")({
  component: OffersPage,
});

function OffersPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  if (loading) {
    return <div className="py-20 text-center text-muted-foreground">Chargement...</div>;
  }
  if (!user) return null;

  return (
    <div className="min-h-screen pb-24 md:pb-12">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-xl border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="rounded-full">
            <Link to="/profile">
              <ChevronLeft size={20} />
            </Link>
          </Button>
          <Tag size={18} className="text-primary" />
          <h1 className="font-headline font-bold text-lg">Mes propositions</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4">
        <MyOffersList />
      </div>
    </div>
  );
}
