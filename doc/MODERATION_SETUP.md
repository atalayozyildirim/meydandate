# Moderation System - Setup & Implementation Guide

## Overview

Moderation System, kullanıcı davranışını kontrol etmek, zararlı içeriği filtrelemek ve platform güvenliğini sağlamak için tasarlanmıştır.

## Features

### 1. Role-Based Access Control (RBAC)

```
User (Düz Kullanıcı)
├── Şikayet yapabilir
├── Kendi profilini görebilir
└── Mesaj gönderebilir (filtreli)

Moderator (İkinci Seviye Yönetici)
├── Tüm şikayetleri görüntüleyebilir
├── Şikayet detaylarını okuyabilir
├── Geçici ban verebilir (max 30 gün)
├── Uyarı gönderebilir
├── Şikayet durumunu güncelleyebilir
└── Denetim günlüğünü görebilir

Admin (Sistem Yöneticisi)
├── Kalıcı ban atabilir
├── Kullanıcı silebilir
├── Moderator yönetebilir
├── Sistem ayarlarını değiştirebilir
└── Tüm denetim günlüklerini görebilir
```

### 2. Content Moderation

Otomatik içerik filtreleme:

- **Profanity (Küfür)**: Turkish curse words filter
- **Sexual Content**: Sexual keywords ve phrases
- **Harassment**: Patterns (repeated chars, all caps)
- **Spam**: Repeated words/phrases

### 3. Automatic Actions

Şiddet seviyesine göre:

- **Low**: Mesaj filtrele, uyarı gönder
- **Medium**: Mesaj filtrele, moderatör incelemesi kuyruğuna ekle
- **High (Sexual)**: Mesaj engelle, otomatik warning, geçici ban, kalıcı ban

### 4. Audit Logging

Tüm moderasyon işlemleri kaydedilir:

- User ID
- Action type
- Target type ve ID
- Details (before/after)
- Timestamp
- IP address
- User agent

## Installation

### Step 1: Database Migration

Supabase SQL Editor'de `MODERATION_MIGRATION.sql` dosyasını çalıştır:

```sql
-- Copy entire MODERATION_MIGRATION.sql content
-- Paste into Supabase SQL Editor
-- Click "Run" button
```

### Step 2: Enable RLS (Production)

Row Level Security'yi aktif etmek için (production için):

```sql
-- Uncomment the RLS sections in MODERATION_MIGRATION.sql
```

### Step 3: Install in App

Container.ts zaten güncellenmiş:

```typescript
export const container = {
  // ... other services
  moderationRepository: new SupabaseModerationRepository(),
  contentModerationService: new ContentModerationService(),
};
```

## Usage

### For Moderators

```typescript
import { useModerationReports, useUpdateReportStatus } from '@/features/moderation/hooks/useModerationService';

function ModeratorScreen() {
  const { data: reports } = useModerationReports({ status: 'pending' });
  const { mutate: updateStatus } = useUpdateReportStatus();

  const handleResolve = (reportId: string) => {
    updateStatus({
      reportId,
      status: 'resolved',
      resolution: 'User warned and reminded of TOS'
    });
  };

  return (
    // Use ModeratorDashboard component
  );
}
```

### For Chat Content Filtering

```typescript
import { container } from "@/infrastructure/config/Container";

async function sendMessage(
  userId: string,
  conversationId: string,
  content: string,
) {
  // Filter content
  const { filteredContent, isClean, violations, shouldBlock } =
    container.contentModerationService.filterMessage(content);

  if (shouldBlock) {
    // Store filtered message and auto-ban user
    await container.moderationRepository.banUser(
      userId,
      "permanent",
      `Cinsel içerik paylaşımı: ${violations[0]?.matches?.join(", ")}`,
    );
    throw new Error("Mesaj engellendi - Hesabınız kalıcı olarak yasaklandı");
  }

  // Save filtered message if violations exist
  if (!isClean) {
    await container.moderationRepository.issueWarning(
      userId,
      "Uygunsuz içerik",
      violations[0]?.severity || "low",
    );
  }

  // Send message
  const message = await container.chatRepository.sendMessage({
    conversationId,
    senderId: userId,
    body: isClean ? content : filteredContent,
  });

  return message;
}
```

### For Admin Management

```typescript
import { useAssignRole, useBanUser } from '@/features/moderation/hooks/useModerationService';

function AdminPanel() {
  const { mutate: assignRole } = useAssignRole();
  const { mutate: banUser } = useBanUser();

  // Promote user to moderator
  const promoteToModerator = (userId: string) => {
    assignRole({
      userId,
      role: 'moderator',
      assignedBy: currentAdminId,
    });
  };

  // Permanent ban
  const permanentBan = (userId: string, reason: string) => {
    banUser({
      userId,
      banType: 'permanent',
      reason,
    });
  };

  return (
    // Use AdminDashboard component
  );
}
```

## Components

### ModeratorDashboard

```typescript
import { ModeratorDashboard } from "@/features/moderation/screens/ModeratorDashboard";

// Features:
// - Pending Reports Tab
// - Resolved Reports Tab
// - Banned Users Tab
// - Warning History Tab
// - Moderator Activity Tab
```

### AdminDashboard

```typescript
import { AdminDashboard } from "@/features/moderation/screens/AdminDashboard";

// Features:
// - Moderator Management
// - Ban Management
// - System Settings
// - Audit Logs
```

## Database Schema

### Tables

```
- roles: User roles (user, moderator, admin)
- user_roles: Role assignments
- reports: User reports
- warnings: Issued warnings
- banned_users: Ban records
- audit_logs: Action audit trail
- filtered_messages: Message filtering history
- flagged_messages: Flagged messages for review
- profanity_filters: Configurable filters
```

## Configuration

### Profanity Filters

Yeni kelimeler eklemek:

```typescript
// Supabase → profanity_filters table
INSERT INTO profanity_filters (words, type, severity, language) VALUES
  (ARRAY['yeni_kelime_1', 'yeni_kelime_2'], 'profanity', 'high', 'tr');
```

### System Settings

Settings kontrol etmek:

```typescript
// AdminDashboard'da toggle'lar:
- Otomatik Profanity Filtreleme
- Cinsel İçerik Filtreleme
- Otomatik Ban (Şiddetli İçerik)
- Denetim Günlüğü Kayıt
```

## Ban Types

### Temporary Ban

- **Duration**: 1-30 gün (ayarlanabilir)
- **Issued by**: Moderator
- **Reason**: Uyarısız ilk ihlal
- **Auto-expire**: Zaman bitince otomatik kaldırılır

### Permanent Ban

- **Duration**: Sonsuz
- **Issued by**: Admin or automatic (sexual content)
- **Reason**: Tekrarlayan ihlal, şiddetli içerik
- **Appeal**: Kullanıcı appeal sunabilir (Admin gözden geçirir)

## Audit Logging

Her işlem otomatik kaydedilir:

```typescript
// Example audit log
{
  userId: "admin-1",
  action: "permanent_ban",
  targetType: "user",
  targetId: "user-123",
  details: {
    reason: "Sexual content in messages",
    violations: ["seks", "cinsel"],
    severity: "high"
  },
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  createdAt: "2024-01-15T10:30:00Z"
}
```

## Best Practices

### For Moderators

1. ✅ Şikayetleri hızlı inceleyebilir
2. ✅ Uygun cezayı seçebilir
3. ✅ Detaylı not ekleyebilir
4. ✅ Denetim günlüklerini takip edebilir
5. ❌ Hesapları silemez
6. ❌ Kalıcı ban atamaz

### For Admins

1. ✅ Sistem ayarlarını değiştirebilir
2. ✅ Moderator yönetebilir
3. ✅ Kalıcı ban atabilir
4. ✅ Kullanıcıları silebilir
5. ✅ Audit logs gözden geçirebilir
6. ❌ Moderatörler denetim görmez

## Testing

### Test Report Creation

```typescript
// Create test report
const report = await container.moderationRepository.createReport({
  reporterId: "user-1",
  reportedUserId: "user-2",
  category: "sexual_content",
  description: "Explicit message in chat",
  evidence: ["message-123", "message-124"],
});
```

### Test Content Filtering

```typescript
// Test profanity filter
const result = container.contentModerationService.filterMessage(
  "This is a siktir message",
);
console.log(result);
// {
//   isClean: false,
//   violations: [{type: 'profanity', severity: 'medium', ...}],
//   filteredContent: "This is a ***** message",
//   shouldBlock: false
// }
```

## Troubleshooting

### Issue: "Cannot read moderationRepository"

**Solution**: Container.ts'in güncellenmiş olduğundan emin ol

### Issue: "Moderator can't see reports"

**Solution**: User role'ü kontrol et - Moderator olmalı

### Issue: "Messages not filtering"

**Solution**:

- profanity_filters table'da veri olduğundan emin ol
- ContentModerationService initialized mi kontrol et

### Issue: "Ban not applied"

**Solution**:

- Admin/Moderator role olduğundan emin ol
- Supabase auth session aktif mi kontrol et

## File Structure

```
src/
├── domain/
│   ├── entities/
│   │   └── Moderation.ts              # Domain entities
│   └── repositories/
│       └── ModerationRepository.ts    # Interface
├── infrastructure/
│   └── supabase/
│       └── SupabaseModerationRepository.ts   # Implementation
└── features/
    └── moderation/
        ├── services/
        │   └── ContentModerationService.ts   # Content filtering
        ├── hooks/
        │   └── useModerationService.ts       # React hooks
        └── screens/
            ├── ModeratorDashboard.tsx        # Moderator UI
            └── AdminDashboard.tsx            # Admin UI
```

## Related Files

- `MODERATION_MIGRATION.sql` - Database schema
- `src/infrastructure/config/Container.ts` - DI container
- `src/domain/entities/Moderation.ts` - TypeScript types

## Next Steps

1. [ ] Migration SQL'i Supabase'e çalıştır
2. [ ] Test kullanıcıları ve moderatörleri oluştur
3. [ ] Dashboards'ı app navigation'a ekle
4. [ ] Content filtering'i chat servicesine entegre et
5. [ ] Notifications sistemi ekle
6. [ ] User appeals sistemi oluştur

---

**Moderation System kurulumu tamamlandı!** 🎉
