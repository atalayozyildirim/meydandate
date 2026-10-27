import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { CommunityEvent } from "@/domain/entities/Event";
import { SupabaseEventRepository } from "@/infrastructure/supabase/SupabaseEventRepository";
import {
  Button,
  Copy,
  Empty,
  Eyebrow,
  Heading,
  Icon,
  IconButton,
  colors,
  fonts,
  ui,
} from "../ui";

const eventRepo = new SupabaseEventRepository();

interface EventDetailScreenProps {
  eventId: string;
  onBack: () => void;
}

export function EventDetailScreen({ eventId, onBack }: EventDetailScreenProps) {
  const [event, setEvent] = useState<CommunityEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const loadEvent = useCallback(async () => {
    try {
      setErrorNotice(null);
      const data = await eventRepo.getEventById(eventId);
      setEvent(data);
    } catch (err: any) {
      setErrorNotice(err.message ?? "Etkinlik detayları alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    setLoading(true);
    loadEvent();
  }, [loadEvent]);

  const handleJoin = async () => {
    if (!event) return;
    setActionLoading(true);
    try {
      setErrorNotice(null);
      const res = await eventRepo.joinEvent(event.id);
      setEvent((prev) =>
        prev
          ? {
              ...prev,
              isJoinedByMe: true,
              currentParticipants: res.participantsCount,
            }
          : null,
      );
      setSuccessNotice("Etkinliğe başarıyla kaydoldunuz! Buluşmada görüşmek üzere.");
    } catch (err: any) {
      setErrorNotice(err.message ?? "Etkinliğe katılım başarısız.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelParticipation = async () => {
    if (!event) return;
    setActionLoading(true);
    try {
      setErrorNotice(null);
      const res = await eventRepo.cancelParticipation(event.id);
      setEvent((prev) =>
        prev
          ? {
              ...prev,
              isJoinedByMe: false,
              currentParticipants: res.participantsCount,
            }
          : null,
      );
      setSuccessNotice("Etkinlik katılımınız iptal edildi.");
    } catch (err: any) {
      setErrorNotice(err.message ?? "Katılım iptali başarısız.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelEvent = async () => {
    if (!event) return;
    setActionLoading(true);
    try {
      setErrorNotice(null);
      await eventRepo.cancelEvent(event.id);
      setEvent((prev) => (prev ? { ...prev, isCancelled: true } : null));
      setSuccessNotice("Etkinlik iptal edildi.");
    } catch (err: any) {
      setErrorNotice(err.message ?? "Etkinlik iptal edilemedi.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.wine} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.centerContainer}>
        <Empty
          title="Etkinlik bulunamadı"
          description="Aradığınız buluşma kaldırılmış veya mevcut değil."
          action="Geri Dön"
          onPress={onBack}
        />
      </View>
    );
  }

  const startDate = new Date(event.startsAt);
  const endDate = new Date(event.endsAt);
  const isPast = endDate < new Date();
  const isFull = event.currentParticipants >= event.capacity;
  const remainingSpots = Math.max(0, event.capacity - event.currentParticipants);
  const fillPercentage = Math.min(
    100,
    Math.round((event.currentParticipants / event.capacity) * 100),
  );

  const formattedDate = startDate.toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const formattedTime = `${startDate.getHours().toString().padStart(2, "0")}.${startDate.getMinutes().toString().padStart(2, "0")} – ${endDate.getHours().toString().padStart(2, "0")}.${endDate.getMinutes().toString().padStart(2, "0")}`;

  return (
    <View style={styles.container}>
      {/* Top Navbar */}
      <View style={styles.navbar}>
        <IconButton name="arrow-back" label="Geri" onPress={onBack} />
        <View style={styles.navTitleContainer}>
          <Text style={styles.navTitle} numberOfLines={1}>
            {event.title}
          </Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Notices */}
      {errorNotice && (
        <View style={styles.errorBanner}>
          <Icon name="alert-circle-outline" size={18} color={colors.wine} />
          <Copy small style={{ color: colors.wine, flex: 1 }}>
            {errorNotice}
          </Copy>
          <IconButton
            name="close"
            label="Kapat"
            onPress={() => setErrorNotice(null)}
          />
        </View>
      )}

      {successNotice && (
        <View style={styles.successBanner}>
          <Icon name="checkmark-circle-outline" size={18} color={colors.green} />
          <Copy small style={{ color: colors.green, flex: 1 }}>
            {successNotice}
          </Copy>
          <IconButton
            name="close"
            label="Kapat"
            onPress={() => setSuccessNotice(null)}
          />
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Cancelled / Past Alert */}
        {event.isCancelled && (
          <View style={styles.statusAlert}>
            <Icon name="close-circle" size={20} color={colors.wine} />
            <Text style={styles.statusAlertText}>
              Bu etkinlik organizatör tarafından iptal edilmiştir.
            </Text>
          </View>
        )}

        {isPast && !event.isCancelled && (
          <View style={[styles.statusAlert, { backgroundColor: "#F0EFEB" }]}>
            <Icon name="time-outline" size={20} color={colors.muted} />
            <Text style={[styles.statusAlertText, { color: colors.muted }]}>
              Bu etkinliğin tarihi geçmiştir.
            </Text>
          </View>
        )}

        {/* Hero details */}
        <View style={styles.heroCard}>
          <View style={styles.badgeRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{event.category}</Text>
            </View>
            <Text style={styles.cityText}>
              {event.city} {event.district ? `· ${event.district}` : ""}
            </Text>
          </View>

          <Heading large style={styles.eventTitle}>
            {event.title}
          </Heading>

          {/* Time & Venue Info Cards */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Icon name="calendar-outline" size={20} color={colors.wine} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoMainText}>{formattedDate}</Text>
              <Text style={styles.infoSubText}>{formattedTime}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Icon name="location-outline" size={20} color={colors.wine} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoMainText}>{event.place}</Text>
              <Text style={styles.infoSubText}>
                {event.city} {event.district ? `· ${event.district}` : ""}
              </Text>
            </View>
          </View>

          {Boolean(event.organizerName) && (
            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <Icon name="person-outline" size={20} color={colors.wine} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoMainText}>
                  Düzenleyen: {event.organizerName}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Capacity Bar */}
        <View style={styles.capacityCard}>
          <View style={styles.capacityHeader}>
            <Text style={styles.capacityTitle}>Katılımcı Durumu</Text>
            <Text style={styles.capacityFigures}>
              {event.currentParticipants} / {event.capacity}
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${fillPercentage}%`,
                  backgroundColor: isFull ? colors.wine : colors.green,
                },
              ]}
            />
          </View>

          <Text style={styles.remainingText}>
            {isFull
              ? "Tüm kontenjan dolmuştur."
              : `${remainingSpots} kişilik yer kaldı.`}
          </Text>
        </View>

        {/* Description */}
        {Boolean(event.description) && (
          <View style={styles.sectionCard}>
            <Heading style={styles.sectionTitle}>Buluşma Hakkında</Heading>
            <Copy style={styles.bodyCopy}>{event.description}</Copy>
          </View>
        )}

        {/* Accessibility & Bring */}
        {(Boolean(event.accessibility) || Boolean(event.bring)) && (
          <View style={styles.sectionCard}>
            {Boolean(event.bring) && (
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.subHeading}>Yanında Ne Getirmelisin?</Text>
                <Copy style={styles.bodyCopy}>{event.bring}</Copy>
              </View>
            )}

            {Boolean(event.accessibility) && (
              <View>
                <Text style={styles.subHeading}>Erişilebilirlik & Mekân</Text>
                <Copy style={styles.bodyCopy}>{event.accessibility}</Copy>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={styles.bottomBar}>
        {event.isJoinedByMe ? (
          <View style={styles.bottomJoinedRow}>
            <View style={styles.joinedConfirm}>
              <Icon name="checkmark-circle" size={20} color={colors.green} />
              <Text style={styles.joinedConfirmText}>Bu buluşmaya kayıtlısın</Text>
            </View>
            <Button
              secondary
              onPress={handleCancelParticipation}
              disabled={actionLoading}
              style={{ minHeight: 40 }}
            >
              Katılımı İptal Et
            </Button>
          </View>
        ) : (
          <Button
            onPress={handleJoin}
            disabled={actionLoading || isFull || isPast || event.isCancelled}
            icon="ticket-outline"
            style={{ width: "100%" }}
          >
            {isPast
              ? "Etkinlik Geçti"
              : event.isCancelled
                ? "Etkinlik İptal Edildi"
                : isFull
                  ? "Kontenjan Doldu"
                  : "Buluşmaya Katıl"}
          </Button>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  navbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  navTitleContainer: { flex: 1, alignItems: "center" },
  navTitle: { fontFamily: fonts.semi, fontSize: 16, textAlign: "center", color: colors.ink },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  scrollContent: { padding: 20, gap: 16, paddingBottom: 100 },
  statusAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    backgroundColor: colors.wineLight,
    borderRadius: 8,
  },
  statusAlertText: { fontFamily: fonts.medium, fontSize: 13, color: colors.wine },
  heroCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
    gap: 12,
  },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  categoryBadge: {
    backgroundColor: "#F0EFEB",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  categoryText: { fontFamily: fonts.medium, fontSize: 12, color: colors.ink },
  cityText: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  eventTitle: { fontSize: 22, marginTop: 4 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 },
  infoIconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: colors.wineLight,
    alignItems: "center",
    justifyContent: "center",
  },
  infoMainText: { fontFamily: fonts.semi, fontSize: 14, color: colors.ink },
  infoSubText: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  capacityCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
  },
  capacityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  capacityTitle: { fontFamily: fonts.semi, fontSize: 14, color: colors.ink },
  capacityFigures: { fontFamily: fonts.semi, fontSize: 14, color: colors.wine },
  progressTrack: {
    height: 8,
    backgroundColor: "#F0EFEB",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: { height: "100%", borderRadius: 4 },
  remainingText: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 8 },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
  },
  sectionTitle: { fontSize: 16, marginBottom: 8 },
  subHeading: { fontFamily: fonts.semi, fontSize: 13, color: colors.ink, marginBottom: 4 },
  bodyCopy: { lineHeight: 22 },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderColor: colors.line,
    padding: 16,
  },
  bottomJoinedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  joinedConfirm: { flexDirection: "row", alignItems: "center", gap: 8 },
  joinedConfirmText: { fontFamily: fonts.medium, fontSize: 13, color: colors.green },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    backgroundColor: colors.wineLight,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    backgroundColor: "#E7F3EC",
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
});
