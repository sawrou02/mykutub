import { useEffect } from "react";
import i18n, { applyDirection } from "@/lib/i18n";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyDirection(i18n.language || "fr");
  }, []);
  return <>{children}</>;
}
