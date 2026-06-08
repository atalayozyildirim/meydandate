// Sistem temasini, manuel tema tercihini ve ortak tokenlari React context uzerinden sunar.
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import { SecureStorageService } from "@/infrastructure/storage/SecureStorageService";
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
const themeStorage = new SecureStorageService();
const themePreferenceKey = "ehlibyte-theme-preference";

const isThemePreference = (value: string | null): value is ThemePreference =>
  value === "system" || value === "light" || value === "dark";

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const isDark = preference === "system" ? systemScheme === "dark" : preference === "dark";

  useEffect(() => {
    let mounted = true;

    const loadPreference = async () => {
      const storedPreference = await themeStorage
        .getItem(themePreferenceKey)
        .catch(() => null);

      if (mounted && isThemePreference(storedPreference)) {
        setPreferenceState(storedPreference);
      }
    };

    void loadPreference();

    return () => {
      mounted = false;
    };
  }, []);

  const setPreference = useCallback((nextPreference: ThemePreference) => {
    setPreferenceState(nextPreference);
    void themeStorage.setItem(themePreferenceKey, nextPreference).catch(() => undefined);
  }, []);

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
    [isDark, preference, setPreference]
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
