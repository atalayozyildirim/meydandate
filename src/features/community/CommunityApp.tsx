import React, { useEffect, useRef, useState } from "react";
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { colors, Icon, ui } from "./ui";
import { articles, type City, type Tab } from "./data";
import { useCommunityStore } from "./store";
import { useCommunityIdentity } from "./access/CommunityAccessGate";

import { FeedScreen } from "./feed/FeedScreen";
import { GroupsScreen } from "./groups/GroupsScreen";
import { GroupDetailScreen } from "./groups/GroupDetailScreen";
import { EventDetailScreen } from "./events/EventDetailScreen";
import { MatchingScreen } from "./matching/MatchingScreen";
import { ChatScreen } from "./messaging/ChatScreen";
import { SpaceScreen } from "./live/SpaceScreen";

import type { Navigate, Route, SheetType } from "./navigation/types";
import { AppHeader } from "./navigation/AppHeader";
import { BottomTabBar } from "./navigation/BottomTabBar";
import { AppSheets } from "./sheets/AppSheets";
import { HomeTab } from "./tabs/HomeTab";
import { CultureTab, ArticleDetailView } from "./tabs/CultureTab";
import { ProfileTab } from "./tabs/ProfileTab";
import { CollectionView } from "./tabs/CollectionView";

export default function CommunityApp({ tab: propTab }: { tab?: Tab } = {}) {
  const { tab: paramTab } = useLocalSearchParams<{ tab?: Tab }>();
  const initialTab = propTab ?? paramTab ?? "feed";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [route, setRoute] = useState<Route>({
    type: "tab",
    tab: initialTab,
  });
  const [history, setHistory] = useState<Route[]>([]);
  const [sheet, setSheet] = useState<SheetType>(null);
  const [notice, setNotice] = useState("");
  const scroll = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const identity = useCommunityIdentity();
  const city = useCommunityStore((state) => state.city);
  const resetLocalPreferences = useCommunityStore(
    (state) => state.resetLocalPreferences,
  );
  const savedArticles = useCommunityStore((state) => state.savedArticles);
  const toggleArticle = useCommunityStore((state) => state.toggleArticle);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
      setRoute({ type: "tab", tab: initialTab });
    }
  }, [initialTab]);

  const navigate: Navigate = (next) => {
    setHistory((prev) => [...prev, route]);
    setRoute(next);
    if (next.type === "tab") setActiveTab(next.tab);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };

  const back = () => {
    if (sheet) {
      setSheet(null);
      return;
    }
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory((curr) => curr.slice(0, -1));
      setRoute(prev);
      if (prev.type === "tab") setActiveTab(prev.tab);
      return;
    }
    if (activeTab !== "feed") {
      changeTab("feed");
    }
  };

  const changeTab = (tab: Tab) => {
    setHistory([]);
    setActiveTab(tab);
    setRoute({ type: "tab", tab });
    scroll.current?.scrollTo({ y: 0, animated: false });
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (sheet) {
        setSheet(null);
        return true;
      }
      if (history.length > 0) {
        back();
        return true;
      }
      if (activeTab !== "feed") {
        changeTab("feed");
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [history.length, sheet, activeTab]);

  const isTab = route.type === "tab";
  const hideTabBar =
    route.type === "space" ||
    route.type === "connection-chat" ||
    Boolean(initialTab);

  // Full-screen dedicated views
  if (route.type === "connections") {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <MatchingScreen
          currentUserId={identity?.userId}
          onBack={back}
          onOpenChat={(matchId) =>
            navigate({ type: "connection-chat", id: matchId })
          }
        />
      </SafeAreaView>
    );
  }

  if (route.type === "connection-chat") {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <ChatScreen
          conversationId={route.id}
          currentUserId={identity?.userId}
          onBack={back}
        />
      </SafeAreaView>
    );
  }

  if (route.type === "space") {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <SpaceScreen
          currentUserId={identity?.userId}
          onLeave={back}
          notify={setNotice}
        />
      </SafeAreaView>
    );
  }

  if (route.type === "community") {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <GroupDetailScreen
          communityId={route.id}
          onBack={back}
        />
      </SafeAreaView>
    );
  }

  if (route.type === "event") {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <EventDetailScreen
          eventId={route.id}
          onBack={back}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      <View style={styles.container}>
        <AppHeader
          route={route}
          onBack={back}
          onOpenMessages={() => setSheet("messages")}
          isArticleSaved={
            route.type === "article"
              ? savedArticles.includes(route.id)
              : false
          }
          onToggleSaveArticle={
            route.type === "article" ? () => toggleArticle(route.id) : undefined
          }
        />

        {isTab && route.tab === "feed" ? (
          <FeedScreen
            hideTopHeader
            currentUserId={identity?.userId}
            onOpenProfile={() => changeTab("profile")}
          />
        ) : isTab && route.tab === "communities" ? (
          <GroupsScreen
            onSelectCommunity={(id) => navigate({ type: "community", id })}
          />
        ) : (
          <ScrollView
            ref={scroll}
            style={styles.scroll}
            contentContainerStyle={[
              styles.content,
              { paddingBottom: Math.max(insets.bottom, 24) + 60 },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {isTab && route.tab !== "profile" && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Şehir seç: ${city}`}
                onPress={() => setSheet("city")}
                style={styles.cityPill}
              >
                <Icon name="location" color={colors.wine} size={18} />
                <Text style={styles.cityText}>{city}</Text>
                <Icon name="chevron-down" size={16} />
              </Pressable>
            )}

            {isTab && route.tab === "home" && <HomeTab navigate={navigate} />}

            {isTab && route.tab === "culture" && (
              <CultureTab navigate={navigate} />
            )}

            {isTab && route.tab === "profile" && (
              <ProfileTab
                navigate={navigate}
                onResetPreferences={() => {
                  resetLocalPreferences();
                  setNotice("Yerel tercihler sıfırlandı.");
                }}
              />
            )}

            {route.type === "article" && (
              <ArticleDetailView
                article={articles.find((a) => a.id === route.id)!}
                onBack={back}
              />
            )}

            {route.type === "collection" && (
              <CollectionView
                collection={route.collection}
                navigate={navigate}
              />
            )}
          </ScrollView>
        )}

        {Boolean(notice) && (
          <Pressable
            accessibilityRole="alert"
            onPress={() => setNotice("")}
            style={styles.toast}
          >
            <Icon
              name="checkmark-circle-outline"
              size={18}
              color={colors.white}
            />
            <Text style={styles.toastText}>{notice}</Text>
          </Pressable>
        )}

        {!hideTabBar && (
          <BottomTabBar activeTab={activeTab} onTabChange={changeTab} />
        )}

        <AppSheets
          sheet={sheet}
          onClose={() => setSheet(null)}
          onNotify={setNotice}
          navigate={navigate}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  cityPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    marginBottom: 16,
  },
  cityText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.ink,
  },
  toast: {
    position: "absolute",
    bottom: 90,
    left: 20,
    right: 20,
    backgroundColor: colors.ink,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  toastText: {
    fontSize: 13,
    color: colors.white,
    fontWeight: "500",
  },
});
