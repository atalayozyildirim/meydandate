import { useFonts } from "expo-font";
import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { PlayfairDisplay_700Bold } from "@expo-google-fonts/playfair-display/700Bold";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import CommunityApp from "../CommunityApp";
import { colors } from "../ui";
import { CommunityAccessGate } from "./CommunityAccessGate";

export default function CommunityEntry() {
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const [loaded, error] = useFonts({
    PlayfairDisplay_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  if (!loaded && !error)
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
  return (
    <CommunityAccessGate preview={preview}>
      <CommunityApp />
    </CommunityAccessGate>
  );
}
