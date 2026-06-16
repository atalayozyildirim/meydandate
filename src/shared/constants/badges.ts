// RevenueCat uzerinden satilacak rozet urunlerini tanimlar.
import type { Badge } from "@/domain/entities/User";

export interface PaidBadgeProduct {
  badge: Badge;
  title: string;
  description: string;
  priceLabel: string;
  revenueCatProductId: string;
}

export interface EarnedBadgeProduct {
  badge: Badge;
  title: string;
  description: string;
  requirementLabel: string;
}

export const paidBadgeProducts: PaidBadgeProduct[] = [
  {
    badge: "muharrem_follower",
    title: "Muharrem Takipcisi",
    description: "Muharrem orucu takibini profilinde one cikar.",
    priceLabel: "₺29,99",
    revenueCatProductId: "ehlibyte.badge.muharrem_follower",
  },
  {
    badge: "cem_room_supporter",
    title: "Cem Odasi Destekcisi",
    description: "Sanal Cem odasina destek rozeti ekle.",
    priceLabel: "₺39,99",
    revenueCatProductId: "ehlibyte.badge.cem_room_supporter",
  },
  {
    badge: "culture_guardian",
    title: "Yol Erkani Destekcisi",
    description: "Topluluk saygisi ve guvenligi icin ozel rozet.",
    priceLabel: "₺49,99",
    revenueCatProductId: "ehlibyte.badge.culture_guardian",
  },
  {
    badge: "zulfiqar_sword",
    title: "Zülfikar Kılıcı",
    description: "Hz. Ali'nin çift uçlu kılıcından ilham alan özel destek rozeti.",
    priceLabel: "₺149,99",
    revenueCatProductId: "ehlibyte.badge.zulfiqar_sword",
  },
  {
    badge: "haci_bektas_veli",
    title: "Hacı Bektaş Veli",
    description: "Hünkâr Hacı Bektaş Veli hatırasını profilinde taşı.",
    priceLabel: "₺129,99",
    revenueCatProductId: "ehlibyte.badge.haci_bektas_veli",
  },
  {
    badge: "la_fetta_illa",
    title: "La Fetta İlla",
    description: "La feta illa Ali sözünden ilham alan özel destek rozeti.",
    priceLabel: "₺99,99",
    revenueCatProductId: "ehlibyte.badge.la_fetta_illa",
  },
  {
    badge: "night_badge",
    title: "Night",
    description: "Gece temasını ve özel ilgiyi profilinde taşı.",
    priceLabel: "₺119,99",
    revenueCatProductId: "ehlibyte.badge.night_badge",
  },
];

export const earnedBadgeProducts: EarnedBadgeProduct[] = [
  {
    badge: "asure_lokmasi",
    title: "Aşure Lokması",
    description: "Muharrem 2026 rozetinden sonra açılır.",
    requirementLabel: "Muharrem Orucu 2026 rozetini kazan",
  },
  {
    badge: "ilk_eslesme",
    title: "İlk Eşleşme",
    description: "İlk karşılıklı eşleşmeni yaptığında kazan.",
    requirementLabel: "Bir eşleşme oluştur",
  },
  {
    badge: "populer_profil",
    title: "Popüler Profil",
    description: "Keşfette Fire alan profiller için görünürlük rozeti.",
    requirementLabel: "50 Fire skoruna ulaş",
  },
];

export const paidBadgeProductByBadge = paidBadgeProducts.reduce(
  (result, product) => ({
    ...result,
    [product.badge]: product,
  }),
  {} as Record<Badge, PaidBadgeProduct | undefined>,
);
