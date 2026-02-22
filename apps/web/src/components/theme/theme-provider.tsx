import {
  ThemeProvider as BaseThemeProvider,
  useTheme,
} from "@workspace/ui/context/theme-provider";

import { ThemeCustomizationProvider } from "@/themes/context";

type Theme = "dark" | "light" | "system";

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
}: ThemeProviderProps) {
  return (
    <BaseThemeProvider defaultTheme={defaultTheme} storageKey={storageKey}>
      <ThemeCustomizationProvider>{children}</ThemeCustomizationProvider>
    </BaseThemeProvider>
  );
}

export { ThemeProvider, useTheme };
export type { Theme };
