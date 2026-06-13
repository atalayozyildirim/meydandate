// RevenueCat uzerinden satilacak rozet urunlerini tanimlar.
import type { Badge } from "@/domain/entities/User";

export interface PaidBadgeProduct {
  badge: Badge;
  title: string;
  description: string;
  priceLabel: string;
  revenueCatProductId: string;
}

export const paidBadgeProducts: PaidBadgeProduct[] = [
  {
    badge: "muharrem_follower",
    title: "Muharrem Takipcisi",
    description: "Muharrem orucu takibini profilinde one cikar.",
    priceLabel: "₺49",
    revenueCatProductId: "ehlibyte.badge.muharrem_follower",
  },
  {
    badge: "cem_room_supporter",
    title: "Cem Odasi Destekcisi",
    description: "Sanal Cem odasina destek rozeti ekle.",
    priceLabel: "₺79",
    revenueCatProductId: "ehlibyte.badge.cem_room_supporter",
  },
  {
    badge: "culture_guardian",
    title: "Yol Erkani Destekcisi",
    description: "Topluluk saygisi ve guvenligi icin ozel rozet.",
    priceLabel: "₺99",
    revenueCatProductId: "ehlibyte.badge.culture_guardian",
  },
  {
    badge: "zulfiqar_sword",
    title: "Zülfikar Kılıcı",
    description: "Hz. Ali'nin çift uçlu kılıcından ilham alan özel destek rozeti.",
    priceLabel: "₺499",
    revenueCatProductId: "ehlibyte.badge.zulfiqar_sword",
  },
];

export const paidBadgeProductByBadge = paidBadgeProducts.reduce(
  (result, product) => ({
    ...result,
    [product.badge]: product,
  }),
  {} as Record<Badge, PaidBadgeProduct | undefined>,
);
