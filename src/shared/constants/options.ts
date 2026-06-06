// Form secenekleri ve UI etiketleri tek kaynakta tutulur.
import type { Badge, CulturalIdentity, CultureImportance, Interest } from "@/domain/entities/User";
import type { ReportCategory } from "@/domain/entities/Match";

export interface Option<TValue extends string> {
  label: string;
  value: TValue;
}

export const culturalIdentityOptions: Option<CulturalIdentity>[] = [
  { label: "Alevi", value: "alevi" },
  { label: "Alevi kulturune yakin hissediyorum", value: "close_to_alevi_culture" },
  { label: "Belirtmek istemiyorum", value: "prefer_not_to_say" }
];

export const cultureImportanceOptions: Option<CultureImportance>[] = [
  { label: "Cok onemli", value: "very_important" },
  { label: "Onemli", value: "important" },
  { label: "Biraz onemli", value: "somewhat_important" },
  { label: "Onemsiz", value: "not_important" }
];

export const interestOptions: Option<Interest>[] = [
  { label: "Baglama", value: "baglama" },
  { label: "Turk Halk Muzigi", value: "turkish_folk_music" },
  { label: "Halk Ozanlari", value: "folk_poets" },
  { label: "Cem Kulturu", value: "cem_culture" },
  { label: "Dayanisma", value: "solidarity" },
  { label: "Sanat", value: "art" },
  { label: "Edebiyat", value: "literature" },
  { label: "Seyahat", value: "travel" },
  { label: "Spor", value: "sports" },
  { label: "Doga", value: "nature" }
];

export const badgeLabels: Record<Badge, string> = {
  community_member: "Topluluk Uyesi",
  verified_profile: "Dogrulanmis Profil",
  active_user: "Aktif Kullanici",
  premium_member: "Premium Uye",
  muharrem_follower: "Muharrem Takipcisi",
  cem_room_supporter: "Cem Odasi Destekcisi",
  culture_guardian: "Yol Erkani Destekcisi"
};

export const reportCategoryOptions: Option<ReportCategory>[] = [
  { label: "Sahte Profil", value: "fake_profile" },
  { label: "Spam", value: "spam" },
  { label: "Taciz", value: "harassment" },
  { label: "Uygunsuz Icerik", value: "inappropriate_content" },
  { label: "Diger", value: "other" }
];

export const conversationStarters = [
  "En sevdigin ozan kim?",
  "En sevdigin turku hangisi?",
  "Memleketin neresi?",
  "Hafta sonu planin ne?",
  "Son dinledigin sarki neydi?"
] as const;

export const premiumFeatures = [
  "Kim beni begendi",
  "Sinirsiz begeni",
  "Super Like",
  "Boost",
  "Oncelikli gorunurluk"
] as const;
