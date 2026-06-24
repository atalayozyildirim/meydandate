// Her rozet tipine karsilik gorsel badge bileseni.
// Yeni rozet eklemek icin asagidaki ROZET EKLEME REHBERI'ni takip et.
import { Image, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Badge } from "@/domain/entities/User";
import { PremiumVerifiedBadge } from "@/shared/components/PremiumVerifiedBadge";
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

type ImageBadge =
  | "premium_member"
  | "muharrem_orucu_2026"
  | "asure_lokmasi"
  | "ilk_eslesme"
  | "populer_profil"
  | "zulfiqar_sword"
  | "haci_bektas_veli"
  | "la_fetta_illa"
  | "night_badge"
  | "staff_badge";

// TIP A: Sadece Ionicons ikonu olan rozetler
type IconBadge = Exclude<Badge, ImageBadge>;

const iconBadgeConfig: Record<
  IconBadge,
  { icon: string; color: string; bgColor: string; borderColor: string }
> = {
  community_member: {
    icon: "people",
    color: "#FFFFFF",
    bgColor: "#2563EB",
    borderColor: "rgba(147,197,253,0.72)",
  },
  verified_profile: {
    icon: "checkmark-circle",
    color: "#FFFFFF",
    bgColor: "#059669",
    borderColor: "rgba(110,231,183,0.70)",
  },
  active_user: {
    icon: "flash",
    color: "#FFFFFF",
    bgColor: "#D97706",
    borderColor: "rgba(252,211,77,0.72)",
  },
  muharrem_follower: {
    icon: "moon",
    color: "#FFFFFF",
    bgColor: "#6366F1",
    borderColor: "rgba(199,210,254,0.70)",
  },
  cem_room_supporter: {
    icon: "radio",
    color: "#FFFFFF",
    bgColor: "#DB2777",
    borderColor: "rgba(249,168,212,0.70)",
  },
  culture_guardian: {
    icon: "shield-checkmark",
    color: "#FFFFFF",
    bgColor: "#0F766E",
    borderColor: "rgba(94,234,212,0.70)",
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
  muharrem_orucu_2026: require("../../../assets/badges/asure.png"),
  asure_lokmasi: require("../../../assets/badges/asure.png"),
  ilk_eslesme: require("../../../assets/badges/matched.png"),
  populer_profil: require("../../../assets/badges/popular.png"),
  zulfiqar_sword: require("../../../assets/badges/zulfikar.png"),
  haci_bektas_veli: require("../../../assets/badges/hacibektasveli.png"),
  la_fetta_illa: require("../../../assets/badges/lafetttailla.png"),
  night_badge: require("../../../assets/badges/night_badge.png"),
  staff_badge: require("../../../assets/badges/staff_badge.png"),
};

const imageBadgeConfig: Partial<
  Record<
    Badge,
    {
      bgColor: string;
      borderColor: string;
      imageScale: number;
    }
  >
> = {
  muharrem_orucu_2026: {
    bgColor: "rgba(20,184,166,0.25)",
    borderColor: "rgba(94,234,212,0.68)",
    imageScale: 1.24,
  },
  asure_lokmasi: {
    bgColor: "rgba(248,113,113,0.25)",
    borderColor: "rgba(252,165,165,0.68)",
    imageScale: 1.24,
  },
  ilk_eslesme: {
    bgColor: "rgba(96,165,250,0.24)",
    borderColor: "rgba(147,197,253,0.68)",
    imageScale: 1.48,
  },
  populer_profil: {
    bgColor: "rgba(245,158,11,0.25)",
    borderColor: "rgba(252,211,77,0.68)",
    imageScale: 1.48,
  },
  zulfiqar_sword: {
    bgColor: "rgba(128, 128, 128,0.26)",
    borderColor: "rgba(251,113,133,0.72)",
    imageScale: 1.26,
  },
  haci_bektas_veli: {
    bgColor: "rgba(129,140,248,0.25)",
    borderColor: "rgba(199,210,254,0.70)",
    imageScale: 1.26,
  },
  la_fetta_illa: {
    bgColor: "rgba(244,114,182,0.25)",
    borderColor: "rgba(249,168,212,0.70)",
    imageScale: 1.26,
  },
  night_badge: {
    bgColor: "rgba(59,130,246,0.24)",
    borderColor: "rgba(147,197,253,0.70)",
    imageScale: 1.08,
  },
  staff_badge: {
    bgColor: "rgba(59,130,246,0.24)",
    borderColor: "rgba(147,197,253,0.70)",
    imageScale: 1.08,
  },
};

// ─────────────────────────────────────────────────────────────────────────────

export const BadgeIcon = ({ badge, size = 48 }: BadgeIconProps) => {
  const theme = useTheme();

  if (badge === "premium_member") {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.elevated,
          borderWidth: Math.max(1, size * 0.04),
          borderColor: theme.colors.border,
        }}
      >
        <PremiumVerifiedBadge size={size * 0.68} variant="blue" />
      </View>
    );
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
          resizeMode="cover"
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
