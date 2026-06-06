// KVKK/GDPR uyumlu ekranlar için ilk sürüm hukuki metin iskeletleri.
export const legalDocuments = {
  privacyPolicy: {
    title: "Gizlilik Politikası",
    body:
      "Ehlibyte, profil bilgilerinizi, tercihlerinizi ve iletişim verilerinizi yalnızca eşleşme deneyimini sağlamak, güvenliği korumak ve yasal talepleri yönetmek için işler. Giriş uygunluğu için Alevilik bilgi testi ve güvenlik kontrolleri uygulanır; bu kayıtlar topluluk güvenliği amacıyla sınırlı şekilde değerlendirilir."
  },
  termsOfService: {
    title: "Kullanım Şartları",
    body:
      "Uygulama kapsayıcı, saygılı ve hukuka uygun kullanım için tasarlanmıştır. Taciz, nefret söylemi, sahte profil, cinsel ima, ağır küfür ve spam yasaktır. Eşleşmeler, akış paylaşımları ve mesajlaşma kullanıcı tercihleri ile güvenlik kontrollerine tabidir."
  },
  accountDeletion: {
    title: "Hesap Silme",
    body:
      "Hesap silme talebi sonrasında profiliniz, eşleşmeleriniz ve mesaj metaverileriniz yasal saklama süreleri dışında kalıcı olarak silinecek şekilde işaretlenir. Bu akışa backend entegrasyonunda denetlenebilir talep kaydı eklenecektir."
  },
  dataExport: {
    title: "Veri Dışa Aktarma Talebi",
    body:
      "Veri dışa aktarma talebi ile profil, tercih, eşleşme ve güvenlik kayıtlarınızın okunabilir bir kopyasını isteyebilirsiniz. Talep süreci KVKK ve GDPR kapsamında kimlik doğrulama adımı gerektirecek şekilde tasarlanmıştır."
  },
  consentManagement: {
    title: "Rıza Yönetimi",
    body:
      "Açık rıza gerektiren bildirim, analiz ve pazarlama tercihleri ayrı ayrı yönetilir. Zorunlu güvenlik ve hesap işlemleri için gerekli veri işleme faaliyetleri ayrıca kayıt altına alınır."
  }
} as const;
