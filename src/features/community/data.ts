import type { ImageSourcePropType } from "react-native";

export const imagery = {
  baglama:
    require("../../../assets/community/baglama-workshop.png") as ImageSourcePropType,
  reading:
    require("../../../assets/community/culture-reading.png") as ImageSourcePropType,
  gathering:
    require("../../../assets/community/community-table.png") as ImageSourcePropType,
  deniz:
    require("../../../assets/community/deniz-avatar.png") as ImageSourcePropType,
  brand: require("../../../assets/icon.png") as ImageSourcePropType,
};

export const cities = ["İstanbul", "Ankara", "İzmir", "Tüm şehirler"] as const;
export type City = (typeof cities)[number];
export type Category = "Atölye" | "Söyleşi" | "Buluşma";
export type Tab = "feed" | "home" | "events" | "communities" | "culture" | "profile";

export interface CommunityEvent {
  id: string;
  title: string;
  category: Category;
  city: Exclude<City, "Tüm şehirler">;
  district: string;
  date: string;
  day: string;
  month: string;
  time: string;
  endsAt: string;
  communityId: string;
  place: string;
  image: ImageSourcePropType;
  description: string;
  accessibility: string;
  bring: string;
  capacity: number;
}

export const events: CommunityEvent[] = [
  {
    id: "baglama-31-ekim",
    title: "Birlikte bağlama",
    category: "Atölye",
    city: "İstanbul",
    district: "Kadıköy",
    date: "31 Eki, Cumartesi",
    day: "31",
    month: "EKİ",
    time: "14.00 – 16.00",
    endsAt: "2026-10-31T16:00:00+03:00",
    communityId: "baglama",
    place: "Örnek Kültür Atölyesi · Kadıköy",
    image: imagery.baglama,
    capacity: 16,
    description:
      "Bir türküyle tanışalım, bir ritimde buluşalım. Yeni başlayanlar ve bağlamasına yeniden zaman ayırmak isteyenler için birlikte çalma atölyesi. Nota bilmek gerekmiyor; merakınla gelmen yeterli.",
    accessibility:
      "Örnek mekân zemin katta. Erişilebilir giriş ve oturma düzeni, gerçek etkinlik yayımlanmadan önce kurumla doğrulanacak.",
    bring:
      "Varsa bağlamanı getir. Bu bir örnek etkinliktir; gerçek kayıt veya yer rezervasyonu oluşturmaz.",
  },
  {
    id: "siir-1-kasim",
    title: "Bir şiirin etrafında",
    category: "Söyleşi",
    city: "İstanbul",
    district: "Beşiktaş",
    date: "1 Kas, Pazar",
    day: "01",
    month: "KAS",
    time: "15.00 – 16.30",
    endsAt: "2026-11-01T16:30:00+03:00",
    communityId: "edebiyat",
    place: "Örnek Okuma Evi · Beşiktaş",
    image: imagery.reading,
    capacity: 20,
    description:
      "Sevdiğimiz dizeler, onlarda bulduğumuz hikâyeler. Edebiyat çevresinin bu buluşmasında şiiri birlikte konuşuyoruz. Dinlemek de paylaşmak kadar kıymetli.",
    accessibility:
      "Sessiz oturma alanı örnek programın parçası. Gerçek mekân bilgileri henüz belirlenmedi.",
    bring:
      "Paylaşmak istediğin bir kitap getirebilirsin.",
  },
  {
    id: "meydan-7-kasim",
    title: "Aynı sofrada buluşalım",
    category: "Buluşma",
    city: "Ankara",
    district: "Çankaya",
    date: "7 Kas, Cumartesi",
    day: "07",
    month: "KAS",
    time: "12.00 – 14.00",
    endsAt: "2026-11-07T14:00:00+03:00",
    communityId: "dayanisma",
    place: "Örnek Topluluk Evi · Çankaya",
    image: imagery.gathering,
    capacity: 24,
    description:
      "Şehre yeni gelenlerle uzun zamandır burada yaşayanların tanıştığı, ortak fikirler ve küçük üretimler etrafında bir topluluk buluşması.",
    accessibility:
      "Mekân ve erişilebilirlik ayrıntıları pilot kurumla doğrulanacak.",
    bring:
      "Kendi not defterini getirebilirsin. Gerçek katılımcı veya rezervasyon bulunmuyor.",
  },
  {
    id: "okuma-8-kasim",
    title: "Pazar okuma çemberi",
    category: "Buluşma",
    city: "İzmir",
    district: "Konak",
    date: "8 Kas, Pazar",
    day: "08",
    month: "KAS",
    time: "11.00 – 12.30",
    endsAt: "2026-11-08T12:30:00+03:00",
    communityId: "edebiyat",
    place: "Örnek Kültür Evi · Konak",
    image: imagery.reading,
    capacity: 12,
    description:
      "Bir fincan çay ve bir kitapla, gündelik hayatın içinde okumaya alan açıyoruz. Herkes kendi okuduğu kitaptan söz edebilir; bitirmiş olman gerekmiyor.",
    accessibility:
      "Örnek program. Mekânın erişilebilirliği henüz doğrulanmadı.",
    bring:
      "Okuduğun bir kitap. Bu etkinlik tasarım önizlemesi için hazırlanmıştır.",
  },
];

export const communities = [
  {
    id: "baglama",
    name: "Bağlamanın etrafında",
    topic: "Müzik · Bağlama",
    city: "İstanbul",
    image: imagery.baglama,
    icon: "musical-notes-outline" as const,
    description:
      "İlk telden birlikte çalmaya. Soru sorduğumuz, öğrendiğimiz ve birbirimize kulak verdiğimiz bir müzik çevresi.",
    private: false,
  },
  {
    id: "edebiyat",
    name: "Sözün izinde",
    topic: "Şiir · Edebiyat",
    city: "Tüm şehirler",
    image: imagery.reading,
    icon: "book-outline" as const,
    description:
      "Bir şiir, bir hikâye, bir sohbet. Okumayı ve düşüncelerini paylaşmayı sevenler için açık bir edebiyat çevresi.",
    private: false,
  },
  {
    id: "dayanisma",
    name: "Birlikte bir şeyler",
    topic: "Dayanışma · Üretim",
    city: "Ankara",
    image: imagery.gathering,
    icon: "people-outline" as const,
    description:
      "Küçük fikirleri ortak emekle büyütmek isteyenler için. Üretim atölyeleri ve şehirde dayanışma üzerine bir çevre.",
    private: false,
  },
  {
    id: "yerel",
    name: "Mahalle buluşmaları",
    topic: "Yerel yaşam · Sohbet",
    city: "İstanbul",
    image: imagery.gathering,
    icon: "leaf-outline" as const,
    description:
      "Mahallede tanışmak ve ortak etkinlikler düzenlemek isteyenler için kapalı bir çevre. Üye listesi ve paylaşımlar dışarıdan görünmez.",
    private: true,
  },
];
export type Community = (typeof communities)[number];

export const articles = [
  {
    id: "dinlemek",
    title: "Birlikte çalmak, birlikte dinlemek",
    category: "MÜZİK VE HAFIZA",
    duration: "4 dk okuma",
    image: imagery.baglama,
    intro:
      "Bir araya gelmenin bazen tek bir nota kadar sade bir başlangıcı vardır.",
    paragraphs: [
      "Yeni bir enstrümana başlarken ilk hedef kusursuz çalmak olmak zorunda değil. Düzenli bir zaman ayırmak, duyduğun ritme dikkat etmek ve küçük adımlarla ilerlemek, öğrenmeyi günlük hayatın bir parçasına dönüştürebilir.",
      "Birlikte çalışırken önce dinlemeye alan aç. Herkesin aynı hızda öğrenmesi gerekmez. Kısa bir bölüm seçmek ve yavaş bir tempoda tekrar etmek, gruptaki farklı deneyimlerin bir arada kalmasına yardımcı olur.",
      "Kültürel pratikler farklı topluluklarda farklı biçimlerde yaşanır. Bu yazı genel bir öğrenme önerisidir; herhangi bir geleneğin tek ve kesin anlatımı olma iddiası taşımaz.",
    ],
  },
  {
    id: "okumak",
    title: "Bir kitabın açtığı sohbet",
    category: "EDEBİYAT VE YAŞAM",
    duration: "3 dk okuma",
    image: imagery.reading,
    intro: "Bazen aynı satır, iki insana bambaşka hikâyeler anlatır.",
    paragraphs: [
      "Bir okuma çemberi kurmak için uzun bir listeye ihtiyacın yok. Herkesin okuyabileceği kısa bir metin ve konuşmaya ayrılmış sakin bir zaman, başlangıç için yeterli olabilir.",
      "Sohbete tek bir açık soruyla başla: Bu metinde sende kalan ne oldu? Doğru cevabı aramak yerine farklı izlenimleri dinlemek, ortak bir okuma deneyimini zenginleştirir.",
      "Paylaşılacak metinlerin kullanım izinlerini gözet. Yazarın adını, eserin adını ve yayınevini anmak; alıntıları kısa ve bağlamına sadık tutmak iyi bir başlangıçtır.",
    ],
  },
  {
    id: "sofra",
    title: "Aynı masada, farklı hikâyeler",
    category: "TOPLULUK HİKÂYELERİ",
    duration: "3 dk okuma",
    image: imagery.gathering,
    intro:
      "Bir topluluğun ilk ihtiyacı, herkesin kendine yer bulabildiği bir masa.",
    paragraphs: [
      "Tanışma buluşmalarında her şeyi anlatmak zorunda değilsin. Yalnızca dinlemek, bir soru sormak ya da küçük bir fikir paylaşmak da katılmanın yollarıdır.",
      "İyi bir buluşma, beklentileri önceden açıklar: Ne konuşacağız, ne kadar sürecek, katılmak için ne gerekiyor? Bu basit bilgiler yeni gelenlerin kendilerini daha rahat hissetmesine yardımcı olur.",
      "Katılanların fotoğraflarını veya kişisel bilgilerini paylaşmadan önce izinlerini al. Bir arada olmak, herkesin sınırlarına saygı gösterildiğinde daha anlamlıdır.",
    ],
  },
];
export type Article = (typeof articles)[number];

export const communityFor = (id: string) =>
  communities.find((community) => community.id === id)!;

export const filterEvents = (
  city: City,
  category: string,
  query: string,
  thisWeek = false,
  now = new Date(),
) => {
  const normalized = query.trim().toLocaleLowerCase("tr-TR");
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + ((7 - now.getDay()) % 7));
  weekEnd.setHours(23, 59, 59, 999);
  return events.filter(
    (event) =>
      (city === "Tüm şehirler" || event.city === city) &&
      (category === "Tümü" || event.category === category) &&
      (!thisWeek ||
        (new Date(event.endsAt) >= now && new Date(event.endsAt) <= weekEnd)) &&
      (!normalized ||
        `${event.title} ${event.district} ${event.category}`
          .toLocaleLowerCase("tr-TR")
          .includes(normalized)),
  );
};
