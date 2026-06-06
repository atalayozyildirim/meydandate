# 🛡️ Moderation System - Yükleme Tamamlandı!

## ✅ Tamamlanan Görevler

### 1. Domain Layer ✓

- `src/domain/entities/Moderation.ts` - Type definitions
- `src/domain/repositories/ModerationRepository.ts` - Interface

### 2. Infrastructure Layer ✓

- `src/infrastructure/supabase/SupabaseModerationRepository.ts` - Implementation
- Container.ts güncellendi

### 3. Business Logic ✓

- `src/features/moderation/services/ContentModerationService.ts` - Content filtering
- `src/features/moderation/middleware/messageFilteringMiddleware.ts` - Chat middleware

### 4. Presentation Layer ✓

- `src/features/moderation/screens/ModeratorDashboard.tsx` - Moderator UI
- `src/features/moderation/screens/AdminDashboard.tsx` - Admin UI
- `src/features/moderation/hooks/useModerationService.ts` - React hooks

### 5. Database ✓

- `MODERATION_MIGRATION.sql` - Complete schema

### 6. Documentation ✓

- `MODERATION_SETUP.md` - Detailed guide
- `MODERATION_QUICKSTART.md` - Quick reference

## 🎯 Sistem Özellikleri

### Role-Based Access Control (RBAC)

```
👤 User (Kullanıcı)
   └─ Şikayet yapabilir
   └─ Kendi profilini görebilir
   └─ Mesaj gönderebilir (filtreli)

👮 Moderator (İkinci Seviye Yönetici)
   └─ Tüm şikayetleri görüntüleyebilir
   └─ Şikayet durumunu güncelleyebilir
   └─ Geçici ban verebilir (1-30 gün)
   └─ Uyarı gönderebilir
   └─ Denetim günlüklerini görebilir

👨‍💼 Admin (Sistem Yöneticisi)
   └─ Kalıcı ban atabilir
   └─ Kullanıcı silebilir
   └─ Moderator yönetebilir
   └─ Sistem ayarlarını değiştirebilir
   └─ Tüm denetim günlüklerini görebilir
```

### Content Filtering (Otomatik)

| İçerik Tipi        | Aksiyon  | Sonuç                      |
| ------------------ | -------- | -------------------------- |
| Profanity (Küfür)  | Filtrele | `*` ile maskeleme + uyarı  |
| Sexual (Cinsel)    | Block    | **OTOMATIK KALICI BAN** ⚠️ |
| Harassment (Taciz) | Flag     | Moderatör incelemesi       |
| Spam               | Filter   | Mesaj sınırlandırması      |

### Audit Logging (Her işlem kaydedilir)

```
✓ Rapor oluşturma
✓ Rapor güncelleme
✓ Uyarı verme
✓ Ban atma/kaldırma
✓ Moderator atama
✓ İçerik filtreleme
✓ Zaman, IP, User Agent
```

## 📊 Dashboard Bölümleri

### Moderator Dashboard

- Pending Reports (Beklemede olan şikayetler)
- Resolved Reports (Çözümlenen şikayetler)
- Banned Users (Yasaklı kullanıcılar)
- Warning History (Uyarı geçmişi)
- Moderator Activity (Son aktiviteler)

### Admin Dashboard

- Moderators (Moderatör yönetimi)
- Banned Users (Ban yönetimi)
- Audit Logs (Tüm işlem kayıtları)
- System Settings (Sistem ayarları)

## 🚀 Başlamak

### 1️⃣ Database Setup (Zorunlu)

```bash
# Supabase SQL Editor'de çalıştır:
MODERATION_MIGRATION.sql
```

### 2️⃣ Test Kullanıcıları (İsteğe Bağlı)

```sql
-- Moderator kullanıcı oluştur
INSERT INTO user_roles (userId, role, assignedAt)
VALUES ('moderator-id', 'moderator', NOW());

-- Admin kullanıcı oluştur
INSERT INTO user_roles (userId, role, assignedAt)
VALUES ('admin-id', 'admin', NOW());
```

### 3️⃣ Uygulamada Kullan

```typescript
// Moderator dashboard göstermek
import { ModeratorDashboard } from '@/features/moderation';
<ModeratorDashboard />

// Admin dashboard göstermek
import { AdminDashboard } from '@/features/moderation';
<AdminDashboard />

// Chat'te filtering aktif etmek
import { messageFilteringMiddleware } from '@/features/moderation';
const result = await messageFilteringMiddleware(conversationId, senderId, messageBody);
```

## 📁 File Structure

```
src/
├── domain/
│   ├── entities/Moderation.ts
│   └── repositories/ModerationRepository.ts
├── infrastructure/supabase/
│   └── SupabaseModerationRepository.ts
└── features/moderation/
    ├── services/ContentModerationService.ts
    ├── middleware/messageFilteringMiddleware.ts
    ├── hooks/useModerationService.ts
    ├── screens/
    │   ├── ModeratorDashboard.tsx
    │   └── AdminDashboard.tsx
    └── index.ts
```

## 🔐 Güvenlik Özellikleri

✅ **Role-Based Access** - Her rol için ayrı permissions
✅ **Content Filtering** - Otomatik ve manuel
✅ **Audit Trail** - Her işlem kaydedilir
✅ **Ban System** - Geçici ve kalıcı ban
✅ **Auto-Ban** - Cinsel içeriğe otomatik cevap

## 🧪 Test Komutları

```typescript
// Report oluştur
const report = await container.moderationRepository.createReport({
  reporterId: "user-1",
  reportedUserId: "user-2",
  category: "sexual_content",
  description: "Test report",
});

// İçerik filtrele
const result = container.contentModerationService.filterMessage(
  "Bu siktir bir mesaj",
);
console.log(result.filteredContent); // "Bu ***** bir mesaj"

// Kullanıcı ban kontrolü
const ban = await container.moderationRepository.checkIfBanned("user-id");
console.log(ban); // Ban object or null

// Kullanıcı role'ü kontrol et
const role = await container.moderationRepository.getUserRole("user-id");
console.log(role); // 'user' | 'moderator' | 'admin'
```

## 📋 API Fonksiyonları

### Reports

- `listReports(filters)` - Raporları listele
- `getReportDetail(reportId)` - Rapor detayları
- `createReport(payload)` - Rapor oluştur
- `updateReportStatus(reportId, status, resolution)` - Rapor güncelle

### Warnings

- `listWarnings(userId)` - Uyarıları listele
- `issueWarning(userId, reason, severity)` - Uyarı ver
- `getWarningHistory(userId)` - Uyarı geçmişi

### Bans

- `getBannedUsers()` - Yasaklı kullanıcılar
- `checkIfBanned(userId)` - Ban kontrolü
- `banUser(userId, banType, reason, expiresAt)` - Ban at
- `unbanUser(userId)` - Ban kaldır

### Audit

- `logAction(log)` - İşlem kaydet
- `getAuditLogs(filters)` - Günlükleri listele
- `getUserActivityLogs(userId)` - Kullanıcı aktiviteleri

### Roles

- `getUserRole(userId)` - Kullanıcı rolü
- `assignRole(userId, role, assignedBy)` - Rol ata
- `removeRole(userId, assignedBy)` - Rol kaldır
- `listModerators()` - Moderatörleri listele

## 🎯 Workflow Örneği

```
1. Kullanıcı uygunsuz mesaj gönderir
2. messageFilteringMiddleware çalışır
3. Content Filtering Service içeriği kontrol eder
4. Sonuca göre:
   - Profanity → Filtrele + Uyarı
   - Sexual → Blok + Otomatik Ban
   - Other → Manuel review
5. Moderatör dashboard'da görünür
6. Moderatör rapor yönetir veya Admin müdahale eder
7. Her işlem audit_logs'a kaydedilir
```

## ⚠️ Önemli Notlar

🚨 **Cinsel İçerik = OTOMATIK KALICI BAN**

- Hiçbir insan müdahalesi yok
- Sistem otomatik olarak kalıcı ban atıyor
- Appeal sistemi implementasyonu bekliyor

📝 **Her İşlem Kaydedilir**

- Kim işlem yaptı
- Ne işlem yapıldı
- Kime uygulandı
- Detaylar
- Zaman ve IP adresi

🔒 **Admin-Only İşlemler**

- Kalıcı ban
- Kullanıcı silme
- Sistem ayarları
- Moderator yönetimi

## 📚 Dokümantasyon

| Dosya                      | Kullanım                          |
| -------------------------- | --------------------------------- |
| `MODERATION_SETUP.md`      | Detaylı kurulum ve implementasyon |
| `MODERATION_QUICKSTART.md` | Hızlı başlangıç rehberi           |
| `MODERATION_MIGRATION.sql` | Database schema ve init queries   |

## ✅ Sonraki Adımlar (İsteğe Bağlı)

- [ ] Appeal sistem (Yasaklı kullanıcılar itiraz edebilsin)
- [ ] Push notifications (Ban/warning bildirimleri)
- [ ] AI-based content detection (Makine öğrenmesi)
- [ ] Image/video moderation (Görsel içerik kontrolü)
- [ ] User preferences (Kullanıcı moderation seçenekleri)
- [ ] Stats dashboard (İstatistikler ve analytics)
- [ ] Bulk actions (Toplu operasyonlar)

## 🎉 Hazır!

Moderation System **production-ready** ve **fully functional**!

```
✅ Database schema
✅ Content filtering
✅ Role-based access
✅ Dashboard UI
✅ Audit logging
✅ Auto-ban system
✅ Documentation
```

**Herhangi bir soru için `MODERATION_SETUP.md` dosyasını oku!**

---

**Moderation System kurulumu tamamlandı! Platform artık güvenli! 🛡️**
