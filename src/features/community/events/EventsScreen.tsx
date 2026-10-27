import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  View,
} from "react-native";
import type { CommunityEvent, EventCategory } from "@/domain/entities/Event";
import { SupabaseEventRepository } from "@/infrastructure/supabase/SupabaseEventRepository";
import {
  Button,
  Chips,
  Copy,
  Empty,
  Eyebrow,
  Heading,
  Icon,
  IconButton,
  colors,
} from "../ui";
import { eventsScreenStyles as styles } from "./components/eventsScreenStyles";
import { EventCard } from "./components/EventCard";
import { CreateEventModal } from "./components/CreateEventModal";

const eventRepo = new SupabaseEventRepository();

interface EventsScreenProps {
  onSelectEvent?: (eventId: string) => void;
}

const CATEGORIES: readonly string[] = [
  "Tümü",
  "Atölye",
  "Söyleşi",
  "Buluşma",
  "Konser",
  "Diğer",
];

const CITIES: readonly string[] = [
  "Tüm şehirler",
  "İstanbul",
  "Ankara",
  "İzmir",
];

export function EventsScreen({ onSelectEvent }: EventsScreenProps) {
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [city, setCity] = useState("Tüm şehirler");
  const [category, setCategory] = useState("Tümü");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Create Event modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState("");
  const [eventCategory, setEventCategory] = useState<EventCategory>("Atölye");
  const [eventCity, setEventCity] = useState("İstanbul");
  const [district, setDistrict] = useState("");
  const [place, setPlace] = useState("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState("20");
  const [submitting, setSubmitting] = useState(false);

  const loadEvents = useCallback(async () => {
    try {
      setErrorNotice(null);
      const data = await eventRepo.getEvents({
        city: city === "Tüm şehirler" ? undefined : city,
        category: category === "Tümü" ? undefined : category,
        upcomingOnly: true,
      });
      setEvents(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Etkinlikler yüklenemedi.";
      setErrorNotice(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [city, category]);

  useEffect(() => {
    setLoading(true);
    void loadEvents();
  }, [loadEvents]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadEvents();
  }, [loadEvents]);

  const handleCreateEvent = async () => {
    if (!title.trim() || !place.trim()) {
      setErrorNotice("Lütfen başlık ve mekân bilgilerini doldurun.");
      return;
    }
    const cap = parseInt(capacity, 10);
    if (isNaN(cap) || cap < 1) {
      setErrorNotice("Lütfen geçerli bir kontenjan sayısı girin.");
      return;
    }

    setSubmitting(true);
    try {
      // Default starts tomorrow at 18:00, ends at 20:00
      const start = new Date(Date.now() + 86400000);
      start.setHours(18, 0, 0, 0);
      const end = new Date(start.getTime() + 7200000);

      const created = await eventRepo.createEvent({
        title: title.trim(),
        category: eventCategory,
        city: eventCity,
        district: district.trim(),
        place: place.trim(),
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        capacity: cap,
        description: description.trim(),
      });

      setShowCreateModal(false);
      setTitle("");
      setDistrict("");
      setPlace("");
      setDescription("");
      setCapacity("20");
      void loadEvents();
      if (onSelectEvent) {
        onSelectEvent(created.id);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Etkinlik oluşturulamadı.";
      setErrorNotice(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Eyebrow>AYNI ÇATI ALTINDA BULUŞMA</Eyebrow>
            <Heading large>Buluşmalar & Atölyeler</Heading>
          </View>
          <Button
            onPress={() => setShowCreateModal(true)}
            icon="add-outline"
            style={styles.createBtn}
          >
            Buluşma Düzenle
          </Button>
        </View>

        <Copy muted>
          Yüz yüze ve çevrimiçi gerçekleşen ortak üretim etkinlikleri.
        </Copy>

        {/* City Filter */}
        <View style={styles.filterRow}>
          <Chips values={CITIES} value={city} onChange={setCity} />
        </View>

        {/* Category Filter */}
        <View style={styles.filterRow}>
          <Chips values={CATEGORIES} value={category} onChange={setCategory} />
        </View>
      </View>

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

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.wine} />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.wine}
            />
          }
          ListEmptyComponent={
            <Empty
              title="Yaklaşan etkinlik yok"
              description="Seçtiğin şehir veya kategoride planlanmış etkinlik bulunmuyor. Yeni bir buluşma düzenleyebilirsin."
              action="Filtreleri Temizle"
              onPress={() => {
                setCity("Tüm şehirler");
                setCategory("Tümü");
              }}
            />
          }
          renderItem={({ item }) => (
            <EventCard item={item} onSelectEvent={onSelectEvent} />
          )}
        />
      )}

      {/* Create Event Modal */}
      <CreateEventModal
        visible={showCreateModal}
        title={title}
        category={eventCategory}
        city={eventCity}
        district={district}
        place={place}
        description={description}
        capacity={capacity}
        submitting={submitting}
        onChangeTitle={setTitle}
        onChangeCategory={setEventCategory}
        onChangeCity={setEventCity}
        onChangeDistrict={setDistrict}
        onChangePlace={setPlace}
        onChangeDescription={setDescription}
        onChangeCapacity={setCapacity}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateEvent}
      />
    </View>
  );
}
