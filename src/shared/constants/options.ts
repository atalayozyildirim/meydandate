// Form seçenekleri ve UI etiketleri tek kaynakta tutulur.
import type { Badge, CulturalIdentity, CultureImportance, Interest } from "@/domain/entities/User";
import type { ReportCategory } from "@/domain/entities/Match";

export interface Option<TValue extends string> {
  label: string;
  value: TValue;
}

export const culturalIdentityOptions: Option<CulturalIdentity>[] = [
  { label: "Alevi", value: "alevi" },
  { label: "Alevi kültürüne yakın hissediyorum", value: "close_to_alevi_culture" },
  { label: "Belirtmek istemiyorum", value: "prefer_not_to_say" }
];

export const cultureImportanceOptions: Option<CultureImportance>[] = [
  { label: "Çok önemli", value: "very_important" },
  { label: "Önemli", value: "important" },
  { label: "Biraz önemli", value: "somewhat_important" },
  { label: "Önemsiz", value: "not_important" }
];

export const interestOptions: Option<Interest>[] = [
  { label: "Bağlama", value: "baglama" },
  { label: "Türk Halk Müziği", value: "turkish_folk_music" },
  { label: "Halk Ozanları", value: "folk_poets" },
  { label: "Cem Kültürü", value: "cem_culture" },
  { label: "Dayanışma", value: "solidarity" },
  { label: "Sanat", value: "art" },
  { label: "Edebiyat", value: "literature" },
  { label: "Seyahat", value: "travel" },
  { label: "Spor", value: "sports" },
  { label: "Doğa", value: "nature" }
];

export const badgeLabels: Record<Badge, string> = {
  community_member: "Topluluk Üyesi",
  verified_profile: "Doğrulanmış Profil",
  active_user: "Aktif Kullanıcı",
  premium_member: "Premium Üye",
  muharrem_follower: "Muharrem Takipçisi",
  cem_room_supporter: "Cem Odası Destekçisi",
  culture_guardian: "Yol Erkânı Destekçisi"
};

export const reportCategoryOptions: Option<ReportCategory>[] = [
  { label: "Sahte Profil", value: "fake_profile" },
  { label: "Spam", value: "spam" },
  { label: "Taciz", value: "harassment" },
  { label: "Uygunsuz İçerik", value: "inappropriate_content" },
  { label: "Diğer", value: "other" }
];

export const conversationStarters = [
  "En sevdiğin ozan kim?",
  "En sevdiğin türkü hangisi?",
  "Memleketin neresi?",
  "Hafta sonu planın ne?",
  "Son dinlediğin şarkı neydi?"
] as const;

export const premiumFeatures = [
  "Reklamları kaldır",
  "Super Like",
  "24 saat profil boost",
  "Öncelikli görünürlük",
  "Premium üye rozeti"
] as const;
