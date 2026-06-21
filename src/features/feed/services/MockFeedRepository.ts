// Mock akış repository'si post, yorum, yanıt ve beğeni akışını yönetir.
import type {
  FeedComment,
  FeedPost,
  FeedReply,
  FeedTag,
} from "@/domain/entities/Feed";
import type {
  BotFeedPostPayload,
  CreateFeedCommentPayload,
  CreateFeedPostPayload,
  CreateFeedReplyPayload,
  FeedCommentsPage,
  FeedPage,
  FeedPageOptions,
  FeedRepository,
} from "@/domain/repositories/FeedRepository";
import { ehlibyteBotUser } from "@/shared/constants/ehlibyteBot";
import { mockDatabase } from "@/infrastructure/mock/MockDatabase";
import { createId } from "@/shared/utils/id";
import { fetchLinkPreview } from "@/shared/utils/linkPreview";
import { sanitizePlainText } from "@/shared/utils/sanitize";

const now = new Date().toISOString();
const DEFAULT_FEED_PAGE_SIZE = 8;
const DEFAULT_COMMENT_PAGE_SIZE = 4;

const getUser = (userId: string) => {
  const user = mockDatabase.users.find((candidate) => candidate.id === userId);

  if (!user) {
    throw new Error("Kullanıcı bulunamadı.");
  }

  return user;
};

const createSeedPost = (
  id: string,
  authorId: string,
  body: string,
  tags: FeedTag[],
  isPinned = false,
): FeedPost => ({
  id,
  authorId,
  author: getUser(authorId),
  body,
  tags,
  likedByUserIds: ["user-current"],
  comments: [],
  reportCount: 0,
  isPinned,
  createdAt: now,
  updatedAt: now,
});

const feedPosts: FeedPost[] = [
  createSeedPost(
    "feed-muharrem-2026",
    "user-zeynep",
    "2026 Muharrem takvimi açıldı. 1 Muharrem 16 Haziran Salı, Aşure günü 25 Haziran Perşembe. Takip edenler hatırlatıcıyı açmayı unutmasın.",
    ["muharrem", "gundem"],
    true,
  ),
  createSeedPost(
    "feed-deyis-room",
    "user-cem",
    "Bu akşam kısa bir deyiş/nefes denemesi yapalım mı? Katılanlar canlı odada görünecek.",
    ["deyis"],
  ),
  createSeedPost(
    "feed-question",
    "user-elif",
    "Yeni gelenler için soru: Toplulukta tanışmayı kolaylaştıran en güzel başlangıç sizce ne?",
    ["soru", "gundem"],
  ),
];

const createBotPostFromPayload = (
  id: string,
  payload: BotFeedPostPayload,
  timestamp = new Date().toISOString(),
): FeedPost => ({
  id: `bot-${id}`,
  authorId: ehlibyteBotUser.id,
  author: ehlibyteBotUser,
  body: sanitizePlainText(payload.body, 2000),
  tags: payload.tags,
  likedByUserIds: [],
  comments: [],
  reportCount: 0,
  isPinned: true,
  isSponsored: true,
  sponsorLabel: "Resmi rehber",
  ctaLabel: sanitizePlainText(payload.ctaLabel, 40) || "İncele",
  showAdMob: payload.showAdMob,
  botPostId: id,
  isActive: payload.isActive,
  createdAt: timestamp,
  updatedAt: timestamp,
});

const botFeedPosts: FeedPost[] = [
  createBotPostFromPayload(
    "starter-welcome",
    {
      body: "Hoş geldin. Profilini canlı göstermek için bugün üç küçük şey yeterli: net bir fotoğraf, kısa bir niyet cümlesi ve sevdiğin bir deyiş ya da ozan.",
      tags: ["gundem", "soru"],
      ctaLabel: "Profili güçlendir",
      isActive: true,
      showAdMob: false,
      sortOrder: 400,
    },
    now,
  ),
  createBotPostFromPayload(
    "starter-question",
    {
      body: "Tanışmayı kolaylaştıran soru: Bir cem, deyiş ya da aile sofrasından aklında kalan en güzel cümle neydi?",
      tags: ["soru", "deyis"],
      ctaLabel: "Sohbete katıl",
      isActive: true,
      showAdMob: false,
      sortOrder: 300,
    },
    now,
  ),
  createBotPostFromPayload(
    "starter-safety",
    {
      body: "Güvenli hatırlatma: İlk mesajlarda telefon, adres ve özel fotoğraf paylaşma. Şüpheli bir durum olursa bildir; moderasyon kuyruğu hızlıca kontrol eder.",
      tags: ["gundem"],
      ctaLabel: "Güvenlik",
      isActive: true,
      showAdMob: false,
      sortOrder: 200,
    },
    now,
  ),
  createBotPostFromPayload(
    "zulfiqar-sword-default",
    {
      body: "Zülfikar Kılıcı özel rozeti mağazada. Hz. Ali'nin çift uçlu kılıcından ilham alan bu rozet profilinde özel destekçi işareti olarak görünür. Fiyat: ₺149,99.",
      tags: ["gundem"],
      ctaLabel: "Mağazada ₺149,99",
      isActive: true,
      showAdMob: true,
      sortOrder: 100,
    },
    now,
  ),
];

const findPost = (postId: string) => {
  const post =
    feedPosts.find((candidate) => candidate.id === postId) ??
    botFeedPosts.find(
      (candidate) => candidate.id === postId || candidate.botPostId === postId,
    );

  if (!post) {
    throw new Error("Post bulunamadı.");
  }

  return post;
};

const isMockAdmin = (userId: string) => userId === "user-atalay-admin";

const toggleUserId = (ids: string[], userId: string) =>
  ids.includes(userId) ? ids.filter((id) => id !== userId) : [...ids, userId];

const buildQuoteSnapshot = (post: FeedPost) => ({
  id: post.id,
  authorId: post.authorId,
  authorName: sanitizePlainText(post.author.name, 80),
  authorPhotoUrl: post.author.photos[0]?.uri ?? null,
  body: sanitizePlainText(post.body, 260),
  imageUrl: post.imageUrl ?? null,
  createdAt: post.createdAt,
});

export class MockFeedRepository implements FeedRepository {
  async getPost(postId: string): Promise<FeedPost> {
    return findPost(postId);
  }

  async listFeed(
    _userId: string,
    tag: FeedTag | "all" = "all",
    options: FeedPageOptions = {},
  ): Promise<FeedPage> {
    const offset = options.offset ?? 0;
    const limit = options.limit ?? DEFAULT_FEED_PAGE_SIZE;
    const filteredPosts = feedPosts
      .filter((post) => tag === "all" || post.tags.includes(tag))
      .sort((first, second) => {
        if (first.isPinned && !second.isPinned) return -1;
        if (!first.isPinned && second.isPinned) return 1;
        return (
          new Date(second.updatedAt).getTime() -
          new Date(first.updatedAt).getTime()
        );
      })
      .map((post) => ({ ...post, comments: [] }));
    const rows = filteredPosts.slice(offset, offset + limit);
    const activeBotPosts =
      offset === 0 ? await this.listFeaturedBotPosts(tag) : [];

    return {
      posts: [...activeBotPosts, ...rows],
      nextOffset: offset + rows.length,
      hasMore: offset + limit < filteredPosts.length,
    };
  }

  async listBotPosts(
    tag: FeedTag | "all" = "all",
    includeInactive = false,
  ): Promise<FeedPost[]> {
    return botFeedPosts
      .filter((post) => includeInactive || post.isActive !== false)
      .filter((post) => tag === "all" || post.tags.includes(tag))
      .sort(
        (first, second) =>
          new Date(second.updatedAt).getTime() -
          new Date(first.updatedAt).getTime(),
      );
  }

  private async listFeaturedBotPosts(
    tag: FeedTag | "all" = "all",
  ): Promise<FeedPost[]> {
    const botPosts = await this.listBotPosts(tag, false);

    if (botPosts.length <= 1) {
      return botPosts;
    }

    const featuredPost = botPosts[Math.floor(Math.random() * botPosts.length)];
    return featuredPost ? [featuredPost] : [];
  }

  async createBotPost(
    _adminUserId: string,
    payload: BotFeedPostPayload,
  ): Promise<FeedPost> {
    const id = createId("bot_feed_post");
    const post = createBotPostFromPayload(id, payload);
    botFeedPosts.unshift(post);
    return post;
  }

  async updateBotPost(
    postId: string,
    payload: BotFeedPostPayload,
  ): Promise<FeedPost> {
    const index = botFeedPosts.findIndex(
      (post) => post.botPostId === postId || post.id === postId,
    );

    if (index === -1) {
      throw new Error("Rehber paylaşımı bulunamadı.");
    }

    const existingPost = botFeedPosts[index] as FeedPost;
    const updatedPost = {
      ...createBotPostFromPayload(
        existingPost.botPostId ?? postId,
        payload,
        existingPost.createdAt,
      ),
      updatedAt: new Date().toISOString(),
    };
    botFeedPosts[index] = updatedPost;
    return updatedPost;
  }

  async deleteBotPost(postId: string): Promise<void> {
    const index = botFeedPosts.findIndex(
      (post) => post.botPostId === postId || post.id === postId,
    );

    if (index === -1) {
      throw new Error("Rehber paylaşımı bulunamadı.");
    }

    botFeedPosts.splice(index, 1);
  }

  async listComments(
    postId: string,
    options: FeedPageOptions = {},
  ): Promise<FeedCommentsPage> {
    const post = findPost(postId);
    const offset = options.offset ?? 0;
    const limit = options.limit ?? DEFAULT_COMMENT_PAGE_SIZE;
    const comments = post.comments.slice(offset, offset + limit);

    return {
      comments,
      nextOffset: offset + comments.length,
      hasMore: offset + limit < post.comments.length,
    };
  }

  async createPost(payload: CreateFeedPostPayload): Promise<FeedPost> {
    const timestamp = new Date().toISOString();
    const postId = createId("feed_post");

    const poll = payload.poll
      ? {
          id: createId("feed_poll"),
          postId,
          question: payload.poll.question,
          options: payload.poll.options.map((opt: string) => ({
            id: createId("feed_poll_option"),
            text: opt,
            voteCount: 0,
          })),
          totalVotes: 0,
          votedOptionId: null,
          endsAt: null,
        }
      : null;

    const post: FeedPost = {
      id: postId,
      authorId: payload.authorId,
      author: getUser(payload.authorId),
      body: sanitizePlainText(payload.body, 2000),
      imageUrl: payload.image?.uri,
      tags: payload.tags,
      likedByUserIds: [],
      comments: [],
      reportCount: 0,
      poll,
      quotedPost: payload.quotedPostId
        ? buildQuoteSnapshot(findPost(payload.quotedPostId))
        : null,
      linkPreview: await fetchLinkPreview(payload.body),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    feedPosts.unshift(post);
    return post;
  }

  async togglePostLike(postId: string, userId: string): Promise<FeedPost> {
    const post = findPost(postId);
    post.likedByUserIds = toggleUserId(post.likedByUserIds, userId);
    post.updatedAt = new Date().toISOString();
    return post;
  }

  async toggleCommentLike(
    postId: string,
    commentId: string,
    userId: string,
  ): Promise<FeedPost> {
    const post = findPost(postId);
    const comment = post.comments.find(
      (candidate) => candidate.id === commentId,
    );

    if (!comment) {
      throw new Error("Yorum bulunamadı.");
    }

    comment.likedByUserIds = toggleUserId(comment.likedByUserIds, userId);
    post.updatedAt = new Date().toISOString();
    return post;
  }

  async addComment(payload: CreateFeedCommentPayload): Promise<FeedPost> {
    const post = findPost(payload.postId);
    const timestamp = new Date().toISOString();
    const comment: FeedComment = {
      id: createId("feed_comment"),
      postId: payload.postId,
      authorId: payload.authorId,
      author: getUser(payload.authorId),
      body: sanitizePlainText(payload.body, 1000),
      likedByUserIds: [],
      replies: [],
      createdAt: timestamp,
    };

    post.comments.push(comment);
    post.updatedAt = timestamp;
    return post;
  }

  async addReply(payload: CreateFeedReplyPayload): Promise<FeedPost> {
    const post = findPost(payload.postId);
    const comment = post.comments.find(
      (candidate) => candidate.id === payload.commentId,
    );

    if (!comment) {
      throw new Error("Yorum bulunamadı.");
    }

    const timestamp = new Date().toISOString();
    const reply: FeedReply = {
      id: createId("feed_reply"),
      postId: payload.postId,
      commentId: payload.commentId,
      authorId: payload.authorId,
      author: getUser(payload.authorId),
      body: sanitizePlainText(payload.body, 1000),
      likedByUserIds: [],
      createdAt: timestamp,
    };

    comment.replies.push(reply);
    post.updatedAt = timestamp;
    return post;
  }

  async reportPost(postId: string, _reporterId: string): Promise<FeedPost> {
    const post = findPost(postId);
    post.reportCount += 1;
    post.updatedAt = new Date().toISOString();
    return post;
  }

  async reportComment(
    postId: string,
    commentId: string,
    _reporterId: string,
  ): Promise<FeedPost> {
    const post = findPost(postId);
    const comment = post.comments.find(
      (candidate) => candidate.id === commentId,
    );

    if (!comment) {
      throw new Error("Yorum bulunamadı.");
    }

    post.reportCount += 1;
    post.updatedAt = new Date().toISOString();
    return post;
  }

  async deletePost(postId: string, requesterId: string): Promise<void> {
    const postIndex = feedPosts.findIndex(
      (candidate) => candidate.id === postId,
    );

    if (postIndex === -1) {
      throw new Error("Post bulunamadı.");
    }

    const post = feedPosts[postIndex];

    if (post.authorId !== requesterId && !isMockAdmin(requesterId)) {
      throw new Error("Bu postu silme yetkiniz yok.");
    }

    feedPosts.splice(postIndex, 1);
  }

  async votePoll(
    pollId: string,
    optionId: string,
    _userId: string,
  ): Promise<void> {
    const post = feedPosts.find((p) => p.poll?.id === pollId);
    if (!post || !post.poll) return;

    const poll = post.poll;
    if (poll.votedOptionId) {
      const oldOption = poll.options.find((o) => o.id === poll.votedOptionId);
      if (oldOption) oldOption.voteCount = Math.max(0, oldOption.voteCount - 1);
      poll.totalVotes = Math.max(0, poll.totalVotes - 1);
    }

    const option = poll.options.find((o) => o.id === optionId);
    if (option) {
      option.voteCount += 1;
      poll.totalVotes += 1;
      poll.votedOptionId = optionId;
    }
    post.updatedAt = new Date().toISOString();
  }
}
