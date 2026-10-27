import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import type { Match } from "@/domain/entities/Match";
import type { User } from "@/domain/entities/User";
import { Copy, Icon, colors, ui } from "../../ui";
import { matchingStyles as styles } from "./matchingStyles";

interface MatchingRowItemProps {
  item: Match;
  onPress: () => void;
  getPartner: (match: Match) => User;
  getPrimaryPhotoUri: (user?: User | null) => string | undefined;
}

export function MatchingRowItem({
  item,
  onPress,
  getPartner,
  getPrimaryPhotoUri,
}: MatchingRowItemProps) {
  const partner = getPartner(item);
  const photoUri = getPrimaryPhotoUri(partner);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${partner.name} ile sohbeti aç`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.matchRow,
        pressed && ui.pressed && ui.focus,
      ]}
    >
      <View style={styles.matchAvatar}>
        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            style={styles.avatarImg}
          />
        ) : (
          <Text style={styles.avatarInitial}>
            {partner.name[0]?.toUpperCase() ?? "K"}
          </Text>
        )}
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.matchName}>
          {partner.name}
          {partner.age ? `, ${partner.age}` : ""}
        </Text>
        <Copy small muted>
          {partner.city || "Şehir belirtilmedi"} · Karşılıklı Eşleşme
        </Copy>
      </View>

      <Icon name="chatbubble-outline" size={20} color={colors.wine} />
    </Pressable>
  );
}
