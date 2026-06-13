// Her rozet tipine karsilik gorsel badge bileseni.
// Yeni rozet eklemek icin asagidaki ROZET EKLEME REHBERI'ni takip et.
import { Image, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Badge } from "@/domain/entities/User";
import { ZulfiqarBadgeIcon } from "./ZulfiqarBadgeIcon";
import { useTheme } from "@/shared/theme";

interface BadgeIconProps {
  badge: Badge;
  size?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROZET EKLEME REHBERİ
// ─────────────────────────────────────────────────────────────────────────────
//
// 1. User.ts > badgeValues dizisine "yeni_rozet" ekle
// 2. options.ts > badgeLabels'a Türkçe ad ekle
// 3. Bu dosyada:
//    a) Sadece Ionicons kullanacaksan → iconBadgeConfig'e ekle
//    b) Özel PNG/görsel kullanacaksan → imageBadgeAssets'e require() ile ekle
//                                       ve imageBadgeConfig'e stil ekle
//    c) Özel SVG bileşenin varsa → customBadgeComponents'a ekle
// 4. (Opsiyonel) badges.ts > paidBadgeProducts'a ekle (mağazada satış için)
// 5. DB kısıtını güncelle: users_badges_check constraint (gerekiyorsa)
//
// ─────────────────────────────────────────────────────────────────────────────

// TIP A: Sadece Ionicons ikonu olan rozetler
type IconBadge = Exclude<Badge, "zulfiqar_sword">;

const iconBadgeConfig: Record<
  IconBadge,
  { icon: string; color: string; bgColor: string; borderColor: string }
> = {
  community_member: {
    icon: "people",
    color: "#60A5FA",
    bgColor: "rgba(96,165,250,0.15)",
    borderColor: "rgba(96,165,250,0.35)",
  },
  verified_profile: {
    icon: "checkmark-circle",
    color: "#34D399",
    bgColor: "rgba(52,211,153,0.15)",
    borderColor: "rgba(52,211,153,0.35)",
  },
  active_user: {
    icon: "flash",
    color: "#F59E0B",
    bgColor: "rgba(245,158,11,0.15)",
    borderColor: "rgba(245,158,11,0.35)",
  },
  premium_member: {
    icon: "star",
    color: "#A78BFA",
    bgColor: "rgba(167,139,250,0.15)",
    borderColor: "rgba(167,139,250,0.35)",
  },
  muharrem_follower: {
    icon: "moon",
    color: "#818CF8",
    bgColor: "rgba(129,140,248,0.15)",
    borderColor: "rgba(129,140,248,0.35)",
  },
  cem_room_supporter: {
    icon: "radio",
    color: "#F472B6",
    bgColor: "rgba(244,114,182,0.15)",
    borderColor: "rgba(244,114,182,0.35)",
  },
  culture_guardian: {
    icon: "shield-checkmark",
    color: "#10B981",
    bgColor: "rgba(16,185,129,0.15)",
    borderColor: "rgba(16,185,129,0.35)",
  },
  // Buraya Ionicons kullanan yeni rozet ekle:
  // yeni_rozet: {
  //   icon: "flame",
  //   color: "#FF6B35",
  //   bgColor: "rgba(255,107,53,0.15)",
  //   borderColor: "rgba(255,107,53,0.35)",
  // },
};

// TIP B: Özel PNG/görsel olan rozetler
// Görseli assets/ klasörüne koy, buraya require() ile ekle
const imageBadgeAssets: Partial<Record<Badge, ReturnType<typeof require>>> = {
  // Zulfiqar kendi bileşeninde, ama PNG tercih etseydin:
  // haci_bektas_veli: require("../../../assets/haci-bektas-veli.png"),
};

const imageBadgeConfig: Partial<
  Record<
    Badge,
    {
      bgColor: string;
      borderColor: string;
      imageScale: number; // 0.0 - 1.0, görselin frame içindeki boyutu
    }
  >
> = {
  // haci_bektas_veli: {
  //   bgColor: "#1A0A2E",
  //   borderColor: "#9B59B6",
  //   imageScale: 0.82,
  // },
};

// TIP C: Tamamen özel SVG bileşeni olan rozetler (ZulfiqarBadgeIcon gibi)
// Bu map'e rozet adı → bileşen fonksiyonu şeklinde ekle
const customBadgeComponents: Partial<
  Record<Badge, (props: { size: number }) => React.ReactElement>
> = {
  zulfiqar_sword: ({ size }) => <ZulfiqarBadgeIcon size={size} />,
  // haci_bektas_veli: ({ size }) => <HaciBektasVeliIcon size={size} />,
};

// ─────────────────────────────────────────────────────────────────────────────

export const BadgeIcon = ({ badge, size = 48 }: BadgeIconProps) => {
  const theme = useTheme();

  // Önce TIP C: Özel SVG bileşen var mı?
  const CustomComponent = customBadgeComponents[badge];
  if (CustomComponent) {
    return <CustomComponent size={size} />;
  }

  // TIP B: Özel PNG görseli var mı?
  const imageAsset = imageBadgeAssets[badge];
  const imageConfig = imageBadgeConfig[badge];
  if (imageAsset && imageConfig) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          backgroundColor: imageConfig.bgColor,
          borderWidth: Math.max(1, size * 0.035),
          borderColor: imageConfig.borderColor,
        }}
      >
        <Image
          source={imageAsset}
          style={{
            width: size * imageConfig.imageScale,
            height: size * imageConfig.imageScale,
          }}
          resizeMode="contain"
        />
      </View>
    );
  }

  // TIP A: Ionicons ikonu
  const config = iconBadgeConfig[badge as IconBadge];
  if (!config) {
    // Bilinmeyen rozet — soru işareti göster
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.elevated,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}
      >
        <Ionicons
          name="help-circle"
          size={size * 0.5}
          color={theme.colors.muted}
        />
      </View>
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: config.bgColor,
        borderWidth: Math.max(1, size * 0.04),
        borderColor: config.borderColor,
      }}
    >
      <Ionicons
        name={config.icon as any}
        size={size * 0.48}
        color={config.color}
      />
    </View>
  );
};
