# 📋 Moderation System - Hızlı Başlangıç

## Ne Yapıldı?

✅ **Moderation System** tamamen kuruldu:

- Role-based access control (User, Moderator, Admin)
- Automatic content filtering (Profanity, Sexual, Harassment, Spam)
- Report management dashboard
- Moderator dashboard
- Admin control panel
- Audit logging sistem
- Auto-ban on sexual content

## 📁 Oluşturulan Dosyalar

### Domain Layer

```
src/domain/
├── entities/Moderation.ts           # Types ve interfaces
└── repositories/ModerationRepository.ts  # Repository interface
```

### Infrastructure

```
src/infrastructure/supabase/
└── SupabaseModerationRepository.ts  # Supabase implementation
```

### Features

```
src/features/moderation/
├── services/
│   └── ContentModerationService.ts  # Content filtering
├── middleware/
│   └── messageFilteringMiddleware.ts # Chat filtering
├── hooks/
│   └── useModerationService.ts      # React hooks
├── screens/
│   ├── ModeratorDashboard.tsx       # Moderator UI
│   └── AdminDashboard.tsx           # Admin UI
└── index.ts                         # Exports
```

### Database & Config

```
MODERATION_MIGRATION.sql            # Database schema
MODERATION_SETUP.md                 # Detailed guide
Container.ts (güncellendi)          # DI container
```

## 🚀 5 Adımda Aktif Etmek

### 1️⃣ Database Migration

Supabase SQL Editor'de çalıştır:

```
- MODERATION_MIGRATION.sql dosyasının tüm içeriğini kopyala
- Supabase → SQL Editor'da aç
- Yapıştır ve "Run" tıkla
```

### 2️⃣ Moderator Kullanıcı Oluştur

```sql
INSERT INTO user_roles (userId, role, assignedAt, assignedBy)
VALUES ('moderator-user-id', 'moderator', NOW(), 'admin-user-id');
```

### 3️⃣ Admin Kullanıcı Oluştur

```sql
INSERT INTO user_roles (userId, role, assignedAt, assignedBy)
VALUES ('admin-user-id', 'admin', NOW(), 'system');
```

### 4️⃣ Uygulamada Kullan

**Moderator Dashboard'ı göstermek:**

```typescript
import { ModeratorDashboard } from '@/features/moderation';

function ModerationScreen() {
  return <ModeratorDashboard />;
}
```

**Admin Dashboard'ı göstermek:**

```typescript
import { AdminDashboard } from '@/features/moderation';

function AdminScreen() {
  return <AdminDashboard />;
}
```

**Chat'te content filtering'i aktif etmek:**

```typescript
import { messageFilteringMiddleware } from "@/features/moderation";

async function sendMessage(conversationId, senderId, body) {
  const result = await messageFilteringMiddleware(
    conversationId,
    senderId,
    body,
  );

  if (result.isBlocked) {
    throw new Error("Mesaj engellendi - Yasak içerik");
  }

  // Send result.filteredBody instead of original
  await chatRepository.sendMessage({
    conversationId,
    senderId,
    body: result.filteredBody,
  });
}
```

### 5️⃣ Navigation'a Ekle

app.json veya routing'e ekle:

```typescript
{
  name: 'moderation',
  getComponent: () => require('@/features/moderation'),
  screens: {
    'moderator-dashboard': ModeratorDashboard,
    'admin-dashboard': AdminDashboard,
  }
}
```

## 🎯 Features Özeti

| Feature             | Moderator | Admin | User |
| ------------------- | --------- | ----- | ---- |
| Raporları Görüntüle | ✅        | ✅    | -    |
| Raporları Yönet     | ✅        | ✅    | -    |
| Geçici Ban          | ✅        | ✅    | -    |
| Kalıcı Ban          | -         | ✅    | -    |
| Moderator Yönet     | -         | ✅    | -    |
| Sistem Ayarları     | -         | ✅    | -    |
| Şikayet Etme        | -         | -     | ✅   |
| Mesaj Filtrele      | ✅        | ✅    | ✅   |

## 🔧 Content Filtering Kuralları

### Profanity (Küfür) - AUTO FILTER

```
Türkçe küfür kelimeleri otomatik olarak * ile maskelenir
Örnek: "siktir" → "***"
```

### Sexual Content - AUTO BAN

```
Cinsel içerik kelimeleri bulunursa:
1. Mesaj engellenir
2. Uyarı gönderilir
3. OTOMATIK KALICI BAN
```

### Harassment - MANUAL REVIEW

```
- Tekrarlayan karakterler (!!!!! vs)
- Tüm BÜYÜK HARF (ŞUNUUUUUUU)
- Moderatör incelemesi gerekir
```

## 📊 Dashboard Bölümleri

### Moderator Dashboard

1. **Pending Reports** - Beklemede olan şikayetler
2. **Resolved Reports** - Çözümlenen şikayetler
3. **Banned Users** - Yasaklı kullanıcılar
4. **Warning History** - Uyarı geçmişi
5. **Moderator Activity** - Son aktiviteler

### Admin Dashboard

1. **Moderators** - Moderatör yönetimi
2. **Banned Users** - Ban yönetimi
3. **Audit Logs** - Tüm işlem kayıtları
4. **System Settings** - Sistem ayarları

## 🔐 Güvenlik

### Roles

```typescript
type UserRole = "user" | "moderator" | "admin";
```

### Ban Types

```
- Temporary: 1-30 gün
- Permanent: Sonsuz (Admin veya Sexual Content)
```

### Audit Logging

Tüm moderasyon işlemleri kaydedilir:

```
- Kim işlem yaptı
- Ne işlem yapıldı
- Kime uygulandı
- Detaylar
- Zaman ve IP
```

## 📝 Example: Report Oluşturma

```typescript
const { mutate: createReport } = useCreateReport();

const handleReport = async (reportedUserId: string) => {
  createReport({
    reporterId: currentUserId,
    reportedUserId,
    category: "sexual_content",
    description: "Cinsel içerik paylaşıyor",
    evidence: ["message-123", "message-456"],
  });
};
```

## 📝 Example: Ban Verme

```typescript
const { mutate: banUser } = useBanUser();

const handleBan = (userId: string) => {
  banUser({
    userId,
    banType: "temporary",
    reason: "Uygunsuz davranış",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 gün
  });
};
```

## 🧪 Test Etmek

### Test Report

```typescript
// Create test data
const testReport = await container.moderationRepository.createReport({
  reporterId: "test-user-1",
  reportedUserId: "test-user-2",
  category: "sexual_content",
  description: "Test report",
});

console.log("Report created:", testReport);
```

### Test Content Filtering

```typescript
const result = container.contentModerationService.filterMessage(
  "Bu siktir bir mesaj",
);

console.log("Filtered:", result);
// Output:
// {
//   isClean: false,
//   violations: [{type: 'profanity', severity: 'medium', ...}],
//   filteredContent: "Bu ***** bir mesaj",
//   shouldBlock: false
// }
```

## ⚠️ Önemli Notlar

1. **Sexual Content**: Otomatik olarak KALICI BAN atılır ⚠️
2. **Profanity**: Otomatik olarak filtreler ve uyarı gönderir
3. **Admin-Only**:
   - Kullanıcı silme
   - Kalıcı ban (normal hallerde)
   - Sistem ayarları
4. **Audit Logs**: Her şey kaydedilir - silinmez

## 🐛 Troubleshooting

### "Moderator arayüzü görmüyorum"

- User role'ü "moderator" veya "admin" mı?
- user_roles table'ında kayıt var mı?

### "Content filtering çalışmıyor"

- profanity_filters table'ında veri var mı?
- messageFilteringMiddleware çağrılıyor mu?

### "Ban uygulanmıyor"

- Admin/Moderator mi?
- Supabase auth session aktif mi?
- banned_users table'ına veri eklenmiş mi?

## 📚 Dosyalar

| Dosya                               | Açıklama                |
| ----------------------------------- | ----------------------- |
| `MODERATION_SETUP.md`               | Detaylı kurulum rehberi |
| `MODERATION_MIGRATION.sql`          | Database schema         |
| `src/domain/entities/Moderation.ts` | TypeScript types        |
| `src/features/moderation/`          | Implementation          |

## ✅ Kontrol Listesi

- [ ] MODERATION_MIGRATION.sql Supabase'e çalıştırdın mı?
- [ ] Test moderator user oluşturdun mu?
- [ ] Dashboard'ları navigation'a ekledin mi?
- [ ] Content filtering'i chat'e entegre ettin mi?
- [ ] Test verisi ekledin mi?
- [ ] Admin kullanıcı oluşturdun mu?

## 🎉 Tamamlandı!

Moderation System şu anda **production-ready**!

Sorular için `MODERATION_SETUP.md` dosyasını oku.

---

**Moderation System aktif! Platform artık güvenli bir ortama sahip! 🛡️**
