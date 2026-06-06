// Profil fotograflari icin fallback harf destekli avatar bileseni.
import { Image, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/shared/theme";

interface AvatarProps {
  name: string;
  uri?: string | undefined;
  size?: number;
}

export const Avatar = ({ name, uri, size = 56 }: AvatarProps) => {
  const theme = useTheme();
  const styles = createStyles(theme, size);
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toLocaleUpperCase("tr-TR");

  if (uri) {
    return <Image source={{ uri }} style={styles.avatar} />;
  }

  return (
    <View style={styles.fallback}>
      <Text style={styles.initials}>{initials}</Text>
    </View>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>, size: number) =>
  StyleSheet.create({
    avatar: {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: theme.colors.elevated
    },
    fallback: {
      width: size,
      height: size,
      borderRadius: size / 2,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary
    },
    initials: {
      ...theme.typography.subheading,
      color: "#FFFFFF"
    }
  });
