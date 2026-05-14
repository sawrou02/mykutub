import { createFileRoute } from "@tanstack/react-router";
import { ContactsSidebar } from "@/components/ContactsSidebar";
import { useAuth } from "@/hooks/useAuth";
import { MessageSquare } from "lucide-react";

export const Route = createFileRoute("/messages/")({
  component: MessagesIndex,
});

function MessagesIndex() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <MessageSquare size={60} className="text-muted-foreground/30 mb-4" />
        <h1 className="text-xl font-bold">Connectez-vous pour voir vos messages</h1>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-[calc(100vh-4rem)] pb-20 md:pb-0">
      <div className="max-w-6xl mx-auto md:flex md:gap-0 md:border md:rounded-lg md:overflow-hidden md:my-4 md:h-[calc(100vh-6rem)]">
        <aside className="md:w-[280px] md:border-r flex-shrink-0 md:h-full">
          <ContactsSidebar />
        </aside>
        <section className="hidden md:flex flex-1 items-center justify-center text-center p-8 bg-muted/20">
          <div>
            <MessageSquare size={48} className="text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-semibold">Sélectionnez une conversation</p>
            <p className="text-sm text-muted-foreground mt-1">
              Choisissez un contact dans la liste pour démarrer.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
