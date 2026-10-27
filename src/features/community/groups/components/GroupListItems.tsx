import React from "react";
import { Text, View } from "react-native";
import type { CommunityPost, CommunityJoinRequest } from "@/domain/entities/Community";
import { Button, Copy } from "../../ui";
import { groupDetailStyles as styles } from "./groupDetailStyles";

interface GroupPostItemProps {
  item: CommunityPost;
}

export function GroupPostItem({ item }: GroupPostItemProps) {
  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.avatarSmall}>
          <Text style={styles.avatarInitialSmall}>
            {item.authorName[0]?.toUpperCase() ?? "Ü"}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.postAuthor}>{item.authorName}</Text>
          <Text style={styles.postTime}>
            {new Date(item.createdAt).toLocaleDateString("tr-TR", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </View>
      <Text style={styles.postBody}>{item.body}</Text>
    </View>
  );
}

interface GroupRequestItemProps {
  item: CommunityJoinRequest;
  onRespond: (userId: string, approve: boolean) => void;
}

export function GroupRequestItem({ item, onRespond }: GroupRequestItemProps) {
  return (
    <View style={styles.requestCard}>
      <View style={styles.requestUser}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarInitial}>
            {item.userName[0]?.toUpperCase() ?? "U"}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.requestName}>{item.userName}</Text>
          <Copy small muted>
            Başvuru tarihi: {new Date(item.createdAt).toLocaleDateString("tr-TR")}
          </Copy>
        </View>
      </View>
      <View style={styles.requestActions}>
        <Button
          secondary
          onPress={() => onRespond(item.userId, false)}
          style={styles.actionBtnSmall}
        >
          Reddet
        </Button>
        <Button
          onPress={() => onRespond(item.userId, true)}
          style={styles.actionBtnSmall}
        >
          Onayla
        </Button>
      </View>
    </View>
  );
}
