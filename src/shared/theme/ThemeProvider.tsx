// Sistem temasini, manuel tema tercihini ve ortak tokenlari React context uzerinden sunar.
import { createContext, type PropsWithChildren, useContext, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { darkColors, lightColors, type ThemeColors } from "./colors";
import { radius, spacing } from "./spacing";
import { typography } from "./typography";

export type ThemePreference = "system" | "light" | "dark";

export interface AppTheme {
  colors: ThemeColors;
  isDark: boolean;
  preference: ThemePreference;
  radius: typeof radius;
  spacing: typeof spacing;
  typography: typeof typography;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<AppTheme | null>(null);

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>("light");
  const isDark = preference === "system" ? systemScheme === "dark" : preference === "dark";

  const value = useMemo<AppTheme>(
    () => ({
      colors: isDark ? darkColors : lightColors,
      isDark,
      preference,
      radius,
      spacing,
      typography,
      setPreference
    }),
    [isDark, preference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const theme = useContext(ThemeContext);

  if (!theme) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return theme;
};
