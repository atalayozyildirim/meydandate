// Uygulamanin aydinlik ve karanlik mod renk paletlerini tanimlar.
export const palette = {
  primary: "#E94057",
  secondary: "#8A2387",
  background: "#FFF7F8",
  text: "#111827",
  muted: "#6B7280",
  surface: "#FFFFFF",
  border: "#F1DCE3",
  success: "#16A34A",
  warning: "#F59E0B",
  danger: "#DC2626",
  darkBackground: "#0F1117",
  darkSurface: "#171923",
  darkText: "#F9FAFB",
  darkMuted: "#9CA3AF",
  darkBorder: "#2D3340"
} as const;

export interface ThemeColors {
  primary: string;
  secondary: string;
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
  secondary: palette.secondary,
  background: palette.background,
  surface: palette.surface,
  elevated: "#FFF0F3",
  text: palette.text,
  muted: palette.muted,
  border: palette.border,
  success: palette.success,
  warning: palette.warning,
  danger: palette.danger,
  overlay: "rgba(17, 24, 39, 0.46)",
  shadow: "rgba(137, 35, 68, 0.14)"
};

export const darkColors: ThemeColors = {
  primary: "#FF5B70",
  secondary: "#C084FC",
  background: palette.darkBackground,
  surface: palette.darkSurface,
  elevated: "#202431",
  text: palette.darkText,
  muted: palette.darkMuted,
  border: palette.darkBorder,
  success: "#4ADE80",
  warning: "#FBBF24",
  danger: "#F87171",
  overlay: "rgba(0, 0, 0, 0.58)",
  shadow: "rgba(0, 0, 0, 0.28)"
};
