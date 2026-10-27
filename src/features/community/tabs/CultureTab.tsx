import React, { useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import {
  Chips,
  Copy,
  Eyebrow,
  Heading,
  Icon,
  colors,
  ui,
  useContentWidth,
} from "../ui";
import { articles, type Article } from "../data";
import { useCommunityStore } from "../store";
import type { Navigate } from "../navigation/types";

interface CultureTabProps {
  navigate: Navigate;
}

export function CultureTab({ navigate }: CultureTabProps) {
  const [category, setCategory] = useState("Tümü");
  const filtered = articles.filter(
    (article) =>
      category === "Tümü" ||
      article.category.startsWith(category.toLocaleUpperCase("tr-TR")),
  );

  return (
    <View style={styles.container}>
      <Eyebrow>HAFIZAMIZ, MERAKIMIZ, HİKÂYELERİMİZ</Eyebrow>
      <Heading large>Kültürün izinde.</Heading>
      <Copy muted style={{ marginTop: 4, marginBottom: 16 }}>
        Bir ezgiye kulak ver, kadim öğretilerimize zaman ayır.
      </Copy>
      <Chips
        values={["Tümü", "Müzik", "Edebiyat", "Topluluk"]}
        value={category}
        onChange={setCategory}
      />
      <View style={{ marginTop: 16, gap: 20 }}>
        {filtered.map((article) => (
          <ArticleCard
            key={article.id}
            article={article}
            onPress={() => navigate({ type: "article", id: article.id })}
          />
        ))}
      </View>
    </View>
  );
}

function ArticleCard({
  article,
  onPress,
}: {
  article: Article;
  onPress: () => void;
}) {
  const imageWidth = useContentWidth();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${article.title} yazısını oku`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && ui.pressed]}
    >
      <Image
        source={article.image}
        style={[
          styles.image,
          { width: imageWidth, height: imageWidth / 1.65 },
        ]}
        accessibilityLabel={article.title}
      />
      <View style={{ gap: 6, paddingVertical: 12 }}>
        <Eyebrow>{article.category}</Eyebrow>
        <Heading style={{ fontSize: 24, lineHeight: 30 }}>
          {article.title}
        </Heading>
        <View style={ui.spaced}>
          <Copy small muted>
            {article.duration} okuma
          </Copy>
          <Icon name="arrow-forward" color={colors.wine} size={18} />
        </View>
      </View>
    </Pressable>
  );
}

export function ArticleDetailView({
  article,
  onBack,
}: {
  article: Article;
  onBack?: () => void;
}) {
  const imageWidth = useContentWidth();
  const saved = useCommunityStore((state) =>
    state.savedArticles.includes(article.id),
  );
  const toggle = useCommunityStore((state) => state.toggleArticle);

  return (
    <View style={styles.detailContainer}>
      <Image
        source={article.image}
        style={[styles.detailImage, { width: imageWidth, height: imageWidth / 1.5 }]}
        accessibilityLabel={article.title}
      />
      <View style={{ gap: 8, marginTop: 16 }}>
        <Eyebrow>{article.category}</Eyebrow>
        <Heading large>{article.title}</Heading>
        <Copy small muted>
          {article.duration} okuma · Ehlibyte Kültür
        </Copy>
        <Copy style={styles.articleLead}>{article.intro}</Copy>
        {article.paragraphs.map((paragraph, index) => (
          <Copy key={index} style={{ fontSize: 15, lineHeight: 26 }}>
            {paragraph}
          </Copy>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
    padding: 12,
  },
  image: {
    borderRadius: 8,
    backgroundColor: colors.line,
  },
  detailContainer: {
    paddingBottom: 32,
  },
  detailImage: {
    borderRadius: 10,
    backgroundColor: colors.line,
  },
  articleLead: {
    fontSize: 16,
    lineHeight: 26,
    fontFamily: "Inter_500Medium",
    color: colors.ink,
    marginVertical: 12,
  },
});
