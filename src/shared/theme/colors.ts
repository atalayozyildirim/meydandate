// Uygulamanin aydinlik ve karanlik mod renk paletlerini tanimlar.
export const palette = {
  primary: "#0A0A0A",
  secondary: "#525252",
  background: "#FFFFFF",
  text: "#0A0A0A",
  muted: "#6B7280",
  surface: "#FFFFFF",
  border: "#E5E5E5",
  success: "#16A34A",
  warning: "#F59E0B",
  danger: "#DC2626",
  darkBackground: "#000000",
  darkSurface: "#000000",
  darkText: "#FFFFFF",
  darkMuted: "#A3A3A3",
  darkBorder: "#262626"
} as const;

export interface ThemeColors {
  primary: string;
  onPrimary: string;
  secondary: string;
  onSecondary: string;
  background: string;
  surface: string;
  elevated: string;
  text: string;
  muted: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
  overlay: string;
  shadow: string;
}

export const lightColors: ThemeColors = {
  primary: palette.primary,
  onPrimary: "#FFFFFF",
  secondary: palette.secondary,
  onSecondary: "#FFFFFF",
  background: palette.background,
  surface: palette.surface,
  elevated: "#F5F5F5",
  text: palette.text,
  muted: palette.muted,
  border: palette.border,
  success: palette.success,
  warning: palette.warning,
  danger: palette.danger,
  overlay: "rgba(17, 24, 39, 0.46)",
  shadow: "rgba(0, 0, 0, 0.10)"
};

export const darkColors: ThemeColors = {
  primary: "#FFFFFF",
  onPrimary: "#000000",
  secondary: "#A3A3A3",
  onSecondary: "#000000",
  background: palette.darkBackground,
  surface: palette.darkSurface,
  elevated: "#111111",
  text: palette.darkText,
  muted: palette.darkMuted,
  border: palette.darkBorder,
  success: "#4ADE80",
  warning: "#FBBF24",
  danger: "#F87171",
  overlay: "rgba(0, 0, 0, 0.58)",
  shadow: "rgba(0, 0, 0, 0.28)"
};
