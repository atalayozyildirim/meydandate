export const connectionProfiles = [
  {
    id: "deniz",
    name: "Deniz",
    age: 29,
    city: "İstanbul",
    image: require("../../../assets/community/deniz-avatar.png"),
    interests: ["Bağlama", "Edebiyat", "Doğa"],
    intro:
      "Birlikte bir şeyler öğrenmeyi, uzun sohbetleri ve yeni ezgiler keşfetmeyi seviyorum.",
    reciprocal: true,
  },
  {
    id: "eren",
    name: "Eren",
    age: 31,
    city: "İstanbul",
    image: require("../../../assets/community/eren-avatar.png"),
    interests: ["Müzik", "Atölye", "Fotoğraf"],
    intro:
      "Bir bağlama, bir fotoğraf makinesi ve merak ettiğim bir sürü hikâye. Ortak bir etkinlikte tanışalım.",
    reciprocal: false,
  },
  {
    id: "duru",
    name: "Duru",
    age: 28,
    city: "Ankara",
    image: require("../../../assets/community/duru-avatar.png"),
    interests: ["Şiir", "Dayanışma", "Okuma"],
    intro:
      "Şehrin içinde küçük okuma molaları. Bir şiirin açtığı sohbete her zaman yerim var.",
    reciprocal: true,
  },
] as const;
export type ConnectionProfile = (typeof connectionProfiles)[number];
