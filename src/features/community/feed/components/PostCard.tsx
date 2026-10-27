import React, { useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  Share,
  Text,
  View,
} from "react-native";
import type { FeedPost } from "@/domain/entities/Feed";
import { Copy, Icon, IconButton, colors, ui } from "../../ui";
import { styles } from "../feedStyles";

export interface PostCardProps {
  post: FeedPost;
  currentUserId: string;
  onToggleLike: () => void;
  onToggleBookmark: () => void;
  onToggleFollow: () => void;
  onOpenComments: () => void;
  onEditPost: () => void;
  onDeletePost: () => void;
  onReportPost: () => void;
  onBlockAuthor: () => void;
  onVotePoll?: (pollId: string, optionId: string) => void;
  onOpenProfile?: (userId: string) => void;
  contentWidth: number;
}

export function PostCard({
  post,
  currentUserId,
  onToggleLike,
  onToggleBookmark,
  onToggleFollow,
  onOpenComments,
  onEditPost,
  onDeletePost,
  onReportPost,
  onBlockAuthor,
  onVotePoll,
  onOpenProfile,
  contentWidth,
}: PostCardProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const isAuthor = post.authorId === currentUserId;
  const isLiked = post.likedByUserIds.includes(currentUserId);
  const isBookmarked = Boolean(post.isBookmarked);
  const isFollowing = Boolean(post.isFollowingAuthor);

  const formattedDate = useMemo(() => {
    try {
      const d = new Date(post.createdAt);
      return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
    } catch {
      return "";
    }
  }, [post.createdAt]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${post.author.name} Meydan'da paylaştı: "${post.body}"`,
      });
    } catch {}
  };

  return (
    <View style={styles.postCard}>
      {/* Header */}
      <View style={ui.spaced}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onOpenProfile?.(post.authorId)}
          style={[ui.row, { gap: 10 }]}
        >
          {post.author.photos && post.author.photos[0]?.uri ? (
            <Image
              source={{ uri: post.author.photos[0].uri }}
              style={styles.avatar}
              accessibilityLabel={post.author.name}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {post.author.name ? post.author.name.charAt(0).toUpperCase() : "E"}
              </Text>
            </View>
          )}
          <View>
            <View style={ui.row}>
              <Text style={styles.authorName}>{post.author.name}</Text>
              {post.isPinned && (
                <View style={styles.badgePill}>
                  <Text style={styles.badgeText}>Sabit</Text>
                </View>
              )}
            </View>
            <Text style={styles.postMeta}>
              {post.author.city ? `${post.author.city} · ` : ""}
              {formattedDate}
            </Text>
          </View>
        </Pressable>

        <View style={ui.row}>
          {!isAuthor && (
            <Pressable
              accessibilityRole="button"
              onPress={onToggleFollow}
              style={[styles.followButton, isFollowing && styles.followingButton]}
            >
              <Text
                style={[
                  styles.followButtonText,
                  isFollowing && styles.followingButtonText,
                ]}
              >
                {isFollowing ? "Takiptesin" : "Takip Et"}
              </Text>
            </Pressable>
          )}

          <IconButton
            name="ellipsis-horizontal"
            label="Seçenekler"
            onPress={() => setMenuVisible(true)}
          />
        </View>
      </View>

      {/* Body */}
      <Copy style={styles.postBody}>{post.body}</Copy>

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <View style={styles.postTagsRow}>
          {post.tags.map((t) => (
            <View key={t} style={styles.postTagPill}>
              <Text style={styles.postTagText}>#{t}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Media Images */}
      {post.imageUrls && post.imageUrls.length > 0 && (
        <View style={styles.mediaContainer}>
          {post.imageUrls.map((url, idx) => (
            <Image
              key={url + idx}
              source={{ uri: url }}
              style={[
                styles.postImage,
                {
                  width: post.imageUrls.length === 1 ? contentWidth : (contentWidth - 8) / 2,
                  height: post.imageUrls.length === 1 ? contentWidth / 1.6 : 140,
                },
              ]}
              resizeMode="cover"
            />
          ))}
        </View>
      )}

      {/* Poll */}
      {post.poll && (
        <View style={styles.pollContainer}>
          <Text style={styles.pollQuestion}>{post.poll.question}</Text>
          {post.poll.options.map((opt) => {
            const hasVoted = Boolean(post.poll?.votedOptionId);
            const isSelected = post.poll?.votedOptionId === opt.id;
            const percentage =
              post.poll && post.poll.totalVotes > 0
                ? Math.round((opt.voteCount / post.poll.totalVotes) * 100)
                : 0;

            return (
              <Pressable
                key={opt.id}
                accessibilityRole="button"
                disabled={hasVoted}
                onPress={() => onVotePoll?.(post.poll!.id, opt.id)}
                style={[
                  styles.pollOption,
                  isSelected && styles.pollOptionSelected,
                ]}
              >
                {hasVoted && (
                  <View
                    style={[
                      styles.pollProgress,
                      { width: `${percentage}%` },
                      isSelected && styles.pollProgressSelected,
                    ]}
                  />
                )}
                <View style={styles.pollOptionContent}>
                  <Text
                    style={[
                      styles.pollOptionText,
                      isSelected && styles.pollOptionTextSelected,
                    ]}
                  >
                    {opt.text}
                  </Text>
                  {hasVoted && (
                    <Text style={styles.pollPercentage}>%{percentage}</Text>
                  )}
                </View>
              </Pressable>
            );
          })}
          <Text style={styles.pollMeta}>
            {post.poll.totalVotes} oy · {post.poll.votedOptionId ? "Oyun kaydedildi" : "Oylamak için dokun"}
          </Text>
        </View>
      )}

      {/* Action Row */}
      <View style={styles.actionsRow}>
        <Pressable
          accessibilityRole="button"
          onPress={onToggleLike}
          style={styles.actionBtn}
        >
          <Icon
            name={isLiked ? "heart" : "heart-outline"}
            size={20}
            color={isLiked ? colors.wine : colors.muted}
          />
          <Text style={[styles.actionCount, isLiked && { color: colors.wine }]}>
            {post.likedByUserIds.length}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={onOpenComments}
          style={styles.actionBtn}
        >
          <Icon name="chatbubble-outline" size={19} color={colors.muted} />
          <Text style={styles.actionCount}>{post.commentCount}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={onToggleBookmark}
          style={styles.actionBtn}
        >
          <Icon
            name={isBookmarked ? "bookmark" : "bookmark-outline"}
            size={19}
            color={isBookmarked ? colors.wine : colors.muted}
          />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={handleShare}
          style={styles.actionBtn}
        >
          <Icon name="share-outline" size={19} color={colors.muted} />
        </Pressable>
      </View>

      {/* Post Context Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.modalMenuCard}>
            {isAuthor ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuVisible(false);
                    onEditPost();
                  }}
                >
                  <Icon name="create-outline" size={20} color={colors.ink} />
                  <Text style={styles.menuItemText}>Gönderiyi Düzenle</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuVisible(false);
                    onDeletePost();
                  }}
                >
                  <Icon name="trash-outline" size={20} color={colors.wine} />
                  <Text style={[styles.menuItemText, { color: colors.wine }]}>Gönderiyi Sil</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  accessibilityRole="button"
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuVisible(false);
                    onToggleBookmark();
                  }}
                >
                  <Icon
                    name={isBookmarked ? "bookmark" : "bookmark-outline"}
                    size={20}
                    color={colors.ink}
                  />
                  <Text style={styles.menuItemText}>
                    {isBookmarked ? "Kayıttan Çıkar" : "Gönderiyi Kaydet"}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuVisible(false);
                    onReportPost();
                  }}
                >
                  <Icon name="flag-outline" size={20} color={colors.wine} />
                  <Text style={[styles.menuItemText, { color: colors.wine }]}>Şikayet Et</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuVisible(false);
                    onBlockAuthor();
                  }}
                >
                  <Icon name="ban-outline" size={20} color={colors.muted} />
                  <Text style={styles.menuItemText}>Kullanıcıyı Engelle</Text>
                </Pressable>
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
