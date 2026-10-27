import { useFonts } from "expo-font";
import { PlayfairDisplay_700Bold } from "@expo-google-fonts/playfair-display/700Bold";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";

export const useCommunityFonts = () => useFonts({
  PlayfairDisplay_700Bold, Inter_400Regular, Inter_500Medium, Inter_600SemiBold,
});
