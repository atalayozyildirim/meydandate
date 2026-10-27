import {
  Icon,
  Label,
  NativeTabs,
  VectorIcon,
} from "expo-router/native-tabs";
import { Ionicons } from "@expo/vector-icons";
import { DynamicColorIOS, Platform, View, Text, type ColorValue } from "react-native";
import { useEffect } from "react";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { useLocalSearchParams } from "expo-router";
import { PlayfairDisplay_700Bold } from "@expo-google-fonts/playfair-display/700Bold";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { CommunityAccessGate } from "@/features/community/access/CommunityAccessGate";
import { colors } from "@/features/community/ui";

const dynamicColor = (light: string, dark: string): ColorValue =>
  Platform.OS === "ios" ? DynamicColorIOS({ light, dark }) : light;

function NativeTabsLayout() {
  const selectedIconColor = colors.wine;
  const defaultIconColor = dynamicColor(
    "rgba(38, 43, 56, 0.58)",
    "rgba(235, 239, 247, 0.64)",
  );
  const labelColor = dynamicColor(
    "rgba(38, 43, 56, 0.72)",
    "rgba(235, 239, 247, 0.72)",
  );

  return (
    <NativeTabs
      backgroundColor={null}
      blurEffect="systemUltraThinMaterial"
      disableTransparentOnScrollEdge={false}
      minimizeBehavior="automatic"
      shadowColor={dynamicColor(
        "rgba(30, 41, 59, 0.18)",
        "rgba(0, 0, 0, 0.28)",
      )}
      tintColor={selectedIconColor}
      iconColor={{
        default: defaultIconColor,
        selected: selectedIconColor,
      }}
      labelStyle={{
        default: {
          color: labelColor,
          fontSize: 11,
          fontWeight: "600",
        },
        selected: {
          color: selectedIconColor,
          fontSize: 11,
          fontWeight: "700",
        },
      }}
    >
      <NativeTabs.Trigger name="index">
        <Icon
          sf={{ default: "newspaper", selected: "newspaper.fill" }}
          androidSrc={<VectorIcon family={Ionicons} name="newspaper-outline" />}
        />
        <Label>Akış</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="home">
        <Icon
          sf={{ default: "flame", selected: "flame.fill" }}
          androidSrc={<VectorIcon family={Ionicons} name="headset-outline" />}
        />
        <Label>Meydan</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="communities">
        <Icon
          sf={{ default: "person.2", selected: "person.2.fill" }}
          androidSrc={<VectorIcon family={Ionicons} name="people-outline" />}
        />
        <Label>Topluluk</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="culture">
        <Icon
          sf={{ default: "book", selected: "book.fill" }}
          androidSrc={<VectorIcon family={Ionicons} name="book-outline" />}
        />
        <Label>Kültür</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <Icon
          sf={{ default: "person", selected: "person.fill" }}
          androidSrc={<VectorIcon family={Ionicons} name="person-outline" />}
        />
        <Label>Ben</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

export default function TabLayout() {
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const [loaded, error] = useFonts({
    PlayfairDisplay_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.paper,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text>Meydan hazırlanıyor…</Text>
      </View>
    );
  }

  return (
    <CommunityAccessGate preview={preview}>
      <NativeTabsLayout />
    </CommunityAccessGate>
  );
}
