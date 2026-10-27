import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import type { User } from "@/domain/entities/User";
import { Heading, Icon, colors, ui } from "../../ui";
import { matchingStyles as styles } from "./matchingStyles";

interface MatchingCandidateCardProps {
  candidate: User;
  actionLoading: boolean;
  onPass: (id: string) => void;
  onLike: (id: string) => void;
  getPrimaryPhotoUri: (user?: User | null) => string | undefined;
}

export function MatchingCandidateCard({
  candidate,
  actionLoading,
  onPass,
  onLike,
  getPrimaryPhotoUri,
}: MatchingCandidateCardProps) {
  const photoUri = getPrimaryPhotoUri(candidate);

  return (
    <View style={styles.candidateCard}>
      {/* Photo or Avatar block */}
      <View style={styles.candidateMedia}>
        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            style={styles.candidatePhoto}
          />
        ) : (
          <View style={styles.mediaPlaceholder}>
            <Icon name="person" size={64} color={colors.muted} />
          </View>
        )}
      </View>

      {/* Info block */}
      <View style={styles.candidateInfo}>
        <View style={styles.nameRow}>
          <Heading style={styles.candidateName}>
            {candidate.name}
            {candidate.age ? `, ${candidate.age}` : ""}
          </Heading>
          <Text style={styles.candidateCity}>{candidate.city}</Text>
        </View>

        {/* Cultural identity badge (optional) */}
        {candidate.culturalIdentity &&
          candidate.culturalIdentity !== "prefer_not_to_say" && (
            <View style={styles.cultureBadge}>
              <Icon name="leaf-outline" size={13} color={colors.green} />
              <Text style={styles.cultureBadgeText}>
                {candidate.culturalIdentity}
              </Text>
            </View>
          )}

        {Boolean(candidate.bio) && (
          <Text style={styles.bioText} numberOfLines={3}>
            {candidate.bio}
          </Text>
        )}

        {/* Interests chips */}
        {candidate.interests?.length > 0 && (
          <View style={styles.interestsRow}>
            {candidate.interests.slice(0, 4).map((interest) => (
              <View key={interest} style={styles.interestChip}>
                <Text style={styles.interestText}>{interest}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Action Buttons: Pass & Like */}
      <View style={styles.swipeActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Geç"
          disabled={actionLoading}
          onPress={() => onPass(candidate.id)}
          style={({ pressed }) => [
            styles.actionBtn,
            styles.passBtn,
            pressed && ui.pressed && ui.focus,
          ]}
        >
          <Icon name="close" size={28} color={colors.muted} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Beğen"
          disabled={actionLoading}
          onPress={() => onLike(candidate.id)}
          style={({ pressed }) => [
            styles.actionBtn,
            styles.likeBtn,
            pressed && ui.pressed && ui.focus,
          ]}
        >
          <Icon name="heart" size={28} color={colors.white} />
        </Pressable>
      </View>
    </View>
  );
}
