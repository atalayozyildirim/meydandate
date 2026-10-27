import React from "react";
import { StyleSheet, View } from "react-native";
import {
  Copy,
  Empty,
  EventCard,
  Heading,
  colors,
  ui,
} from "../ui";
import { articles, communities, events } from "../data";
import { useCommunityStore } from "../store";
import type { Navigate } from "../navigation/types";

interface CollectionViewProps {
  collection: "events" | "communities" | "articles";
  navigate: Navigate;
}

export function CollectionView({ collection, navigate }: CollectionViewProps) {
  const store = useCommunityStore();
  const selectedEvents = events.filter((item) =>
    store.joinedEvents.includes(item.id),
  );
  const selectedCommunities = communities.filter((item) =>
    store.joinedCommunities.includes(item.id),
  );
  const selectedArticles = articles.filter((item) =>
    store.savedArticles.includes(item.id),
  );

  return (
    <View style={styles.container}>
      <Heading large style={{ marginBottom: 16 }}>
        {collection === "events"
          ? "Katıldığım Etkinlikler"
          : collection === "communities"
            ? "Üye Olduğum Topluluklar"
            : "Kaydettiğim Yazılar"}
      </Heading>

      {collection === "events" && (
        selectedEvents.length === 0 ? (
          <Empty
            icon="calendar-outline"
            title="Henüz katılımın yok"
            description="İlgini çeken bir etkinlik bulup katılabilirsin."
            action="Etkinlikleri Keşfet"
            onPress={() => navigate({ type: "tab", tab: "home" })}
          />
        ) : (
          selectedEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              joined
              onPress={() => navigate({ type: "event", id: event.id })}
            />
          ))
        )
      )}

      {collection === "communities" && (
        selectedCommunities.length === 0 ? (
          <Empty
            icon="people-outline"
            title="Henüz topluluk üyesi değilsin"
            description="Şehrindeki veya ilgilendiğin alanlardaki topluluklara katıl."
            action="Toplulukları Gör"
            onPress={() => navigate({ type: "tab", tab: "communities" })}
          />
        ) : (
          selectedCommunities.map((group) => (
            <View key={group.id} style={styles.communityRow}>
              <Heading style={{ fontSize: 18 }}>{group.name}</Heading>
              <Copy small muted>{group.city} · {group.topic}</Copy>
            </View>
          ))
        )
      )}

      {collection === "articles" && (
        selectedArticles.length === 0 ? (
          <Empty
            icon="bookmark-outline"
            title="Kayıtlı yazı yok"
            description="Kültür alanındaki yazıları daha sonra okumak için kaydedebilirsin."
            action="Yazıları İncele"
            onPress={() => navigate({ type: "tab", tab: "culture" })}
          />
        ) : (
          selectedArticles.map((article) => (
            <View key={article.id} style={styles.articleRow}>
              <Heading style={{ fontSize: 18 }}>{article.title}</Heading>
              <Copy small muted>{article.category} · {article.duration}</Copy>
            </View>
          ))
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  communityRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    gap: 4,
  },
  articleRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    gap: 4,
  },
});
