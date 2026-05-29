import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";

const ICONS = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const;

const LABELS = {
  light: "Thème clair (clic pour passer en sombre)",
  dark: "Thème sombre (clic pour suivre le système)",
  system: "Thème système (clic pour passer en clair)",
} as const;

export function ThemeToggle() {
  const { theme, cycleTheme } = useTheme();
  const Icon = ICONS[theme];

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      title={LABELS[theme]}
      aria-label={LABELS[theme]}
    >
      <Icon size={18} />
    </Button>
  );
}
