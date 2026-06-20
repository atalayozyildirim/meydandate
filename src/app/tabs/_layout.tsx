// Ana uygulama sekmelerini ve protected tab guard'ini tanimlar.
import { Redirect } from "expo-router";
import {
  Icon,
  Label,
  NativeTabs,
  VectorIcon,
} from "expo-router/unstable-native-tabs";
import { Ionicons } from "@expo/vector-icons";
import { DynamicColorIOS, Platform, type ColorValue } from "react-native";
import { Loading } from "@/shared/components/Loading";
import { useSession } from "@/features/auth/hooks/useSession";
import { useTheme } from "@/shared/theme";

const dynamicColor = (light: string, dark: string): ColorValue =>
  Platform.OS === "ios" ? DynamicColorIOS({ light, dark }) : light;

type NativeTabDefinition = {
  name: string;
  label: string;
  sf: {
    default: string;
    selected: string;
  };
  androidIcon: React.ComponentProps<typeof Ionicons>["name"];
};

const primaryTabs: NativeTabDefinition[] = [
  {
    name: "feed/index",
    label: "Akış",
    sf: { default: "newspaper", selected: "newspaper.fill" },
    androidIcon: "newspaper-outline",
  },
  {
    name: "discover/index",
    label: "Keşfet",
    sf: { default: "flame", selected: "flame.fill" },
    androidIcon: "flame-outline",
  },
  {
    name: "store/index",
    label: "Mağaza",
    sf: { default: "cart", selected: "cart.fill" },
    androidIcon: "cart-outline",
  },
  {
    name: "chat/index",
    label: "Mesaj",
    sf: {
      default: "bubble.left.and.bubble.right",
      selected: "bubble.left.and.bubble.right.fill",
    },
    androidIcon: "chatbubbles-outline",
  },
  {
    name: "profile/index",
    label: "Profil",
    sf: { default: "person", selected: "person.fill" },
    androidIcon: "person-outline",
  },
];

export default function TabsLayout() {
  const theme = useTheme();
  const { currentUser, isHydrated } = useSession();
  const defaultIconColor = dynamicColor(
    "rgba(38, 43, 56, 0.58)",
    "rgba(235, 239, 247, 0.64)",
  );
  const selectedIconColor = dynamicColor(theme.colors.primary, "#FFFFFF");
  const labelColor = dynamicColor(
    "rgba(38, 43, 56, 0.72)",
    "rgba(235, 239, 247, 0.72)",
  );

  if (!isHydrated) {
    return <Loading label="Sekmeler hazırlanıyor" />;
  }

  if (!currentUser) {
    return <Redirect href="/auth/login" />;
  }

  if (!currentUser.hasPassedEntryTest) {
    return <Redirect href="/approval-test" />;
  }

  if (!currentUser.hasCompletedOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <NativeTabs
      backgroundColor={null}
      blurEffect="systemDefault"
      disableTransparentOnScrollEdge={false}
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
      minimizeBehavior="automatic"
      shadowColor={dynamicColor(
        "rgba(30, 41, 59, 0.18)",
        "rgba(0, 0, 0, 0.28)",
      )}
      tintColor={selectedIconColor}
    >
      {primaryTabs.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <Icon
            sf={tab.sf as never}
            androidSrc={<VectorIcon family={Ionicons} name={tab.androidIcon} />}
          />
          <Label hidden>{tab.label}</Label>
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
