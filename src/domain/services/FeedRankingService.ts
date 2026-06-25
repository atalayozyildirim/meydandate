// Kişiselleştirilmiş feed ranking service - etkileşim tabanlı skorlama
import type { FeedPost, FeedTag } from "../entities/Feed";
import type { User } from "../entities/User";

interface FeedScoreWeights {
  interactionWeight: number; // Beğeni, yorum etkisi
  timeDecayWeight: number; // Zaman faktörü
  personalizationWeight: number; // Kişiselleştirme
  socialProofWeight: number; // Arkadaş etkileşimleri
  varietyWeight: number; // İçerik çeşitliliği
}

interface FeedScoringContext {
  currentUser: User;
  friendIds: Set<string>;
  userInterests: Set<string>;
  recentPostIds: Set<string>; // Kullanıcının gördüğü son postlar
  averageEngagement: number; // Ortalama etkileşim oranı
}

const DEFAULT_WEIGHTS: FeedScoreWeights = {
  interactionWeight: 0.35,
  timeDecayWeight: 0.25,
  personalizationWeight: 0.20,
  socialProofWeight: 0.15,
  varietyWeight: 0.05,
};

const INTERACTION_SCORES = {
  like: 1.0,
  comment: 2.5,
  reply: 1.5,
  share: 3.0,
  view: 0.1,
};

const TIME_DECAY_HOURS = 24; // 24 saat içinde exponential decay
const DECAY_CONSTANT = 0.1; // Decay katsayısı

// Post'un etkileşim skorunu hesapla
const calculateInteractionScore = (post: FeedPost): number => {
  const likeScore = post.likedByUserIds.length * INTERACTION_SCORES.like;
  const commentScore = post.comments.length * INTERACTION_SCORES.comment;
  const replyScore = post.comments.reduce(
    (sum, comment) => sum + comment.replies.length * INTERACTION_SCORES.reply,
    0
  );
  
  return likeScore + commentScore + replyScore;
};

// Zaman decay hesapla (eski postların değeri düşer)
const calculateTimeDecay = (post: FeedPost): number => {
  const postAge = Date.now() - new Date(post.createdAt).getTime();
  const hoursSinceCreation = postAge / (1000 * 60 * 60);
  
  // Exponential decay: e^(-λt)
  return Math.exp(-DECAY_CONSTANT * hoursSinceCreation);
};

// Kişiselleştirme skoru - kullanıcının ilgi alanlarına göre
const calculatePersonalizationScore = (
  post: FeedPost,
  context: FeedScoringContext
): number => {
  let score = 0;
  
  // Tag matching
  const matchingTags = post.tags.filter(tag => 
    context.userInterests.has(tag.toLowerCase())
  );
  score += matchingTags.length * 0.3;
  
  // Author cultural match (eğer aynı kültürel kimlik ise)
  if (post.author.culturalIdentity === context.currentUser.culturalIdentity) {
    score += 0.2;
  }
  
  // City matching
  if (post.author.city === context.currentUser.city) {
    score += 0.15;
  }
  
  // Interest matching
  const sharedInterests = post.author.interests.filter(interest =>
    context.userInterests.has(interest.toLowerCase())
  );
  score += sharedInterests.length * 0.1;
  
  return Math.min(score, 1.0);
};

// Social proof - arkadaşların etkileşimleri
const calculateSocialProofScore = (
  post: FeedPost,
  context: FeedScoringContext
): number => {
  if (context.friendIds.size === 0) return 0;
  
  let friendInteractions = 0;
  
  // Arkadaşların beğenileri
  const friendLikes = post.likedByUserIds.filter(id => context.friendIds.has(id));
  friendInteractions += friendLikes.length * INTERACTION_SCORES.like;
  
  // Arkadaşların yorumları
  const friendComments = post.comments.filter(comment => 
    context.friendIds.has(comment.authorId)
  );
  friendInteractions += friendComments.length * INTERACTION_SCORES.comment;
  
  // Normalized score (0-1 arası)
  return Math.min(friendInteractions / (context.friendIds.size * 2), 1.0);
};

// Content variety - farklı post tiplerini dengeleme
const calculateVarietyScore = (
  post: FeedPost,
  context: FeedScoringContext
): number => {
  let score = 0;
  
  // Görsel içerik bonusu
  if (post.imageUrl) {
    score += 0.3;
  }
  
  // Poll bonusu
  if (post.poll) {
    score += 0.2;
  }
  
  // Link preview bonusu
  if (post.linkPreview) {
    score += 0.15;
  }
  
  // Quoted post bonusu
  if (post.quotedPost) {
    score += 0.15;
  }
  
  // Uzun içerik (daha detaylı)
  if (post.body.length > 200) {
    score += 0.2;
  }
  
  return Math.min(score, 1.0);
};

// Ana scoring fonksiyonu
export const calculateFeedPostScore = (
  post: FeedPost,
  context: FeedScoringContext,
  weights: FeedScoreWeights = DEFAULT_WEIGHTS
): number => {
  const interactionScore = calculateInteractionScore(post);
  const timeDecay = calculateTimeDecay(post);
  const personalizationScore = calculatePersonalizationScore(post, context);
  const socialProofScore = calculateSocialProofScore(post, context);
  const varietyScore = calculateVarietyScore(post, context);
  
  // Normalized interaction score (ortalama etkileşime göre)
  const normalizedInteraction = context.averageEngagement > 0
    ? Math.min(interactionScore / context.averageEngagement, 2.0)
    : interactionScore / 10;
  
  // Weighted total score
  const totalScore = 
    (normalizedInteraction * weights.interactionWeight) +
    (timeDecay * weights.timeDecayWeight) +
    (personalizationScore * weights.personalizationWeight) +
    (socialProofScore * weights.socialProofWeight) +
    (varietyScore * weights.varietyWeight);
  
  return totalScore;
};

// Feed'i skorla ve sırala
export const rankFeedPosts = (
  posts: FeedPost[],
  context: FeedScoringContext,
  weights?: FeedScoreWeights
): FeedPost[] => {
  const scoredPosts = posts.map(post => ({
    post,
    score: calculateFeedPostScore(post, context, weights)
  }));
  
  // Pinned postları en üste al
  const pinnedPosts = scoredPosts
    .filter(({ post }) => post.isPinned)
    .sort((a, b) => b.score - a.score);
  
  // Normal postları skora göre sırala
  const regularPosts = scoredPosts
    .filter(({ post }) => !post.isPinned)
    .sort((a, b) => b.score - a.score);
  
  return [...pinnedPosts, ...regularPosts].map(({ post }) => post);
};

// Context helper fonksiyonu
export const createFeedScoringContext = (
  currentUser: User,
  friendIds: string[] = [],
  recentPostIds: string[] = [],
  averageEngagement: number = 5.0
): FeedScoringContext => ({
  currentUser,
  friendIds: new Set(friendIds),
  userInterests: new Set(
    currentUser.interests.map(i => i.toLowerCase())
  ),
  recentPostIds: new Set(recentPostIds),
  averageEngagement,
});

// Variety optimization - post tiplerini dengeli dağıtma
export const balanceContentVariety = (
  posts: FeedPost[],
  maxBatchSize: number = 8
): FeedPost[] => {
  if (posts.length <= maxBatchSize) return posts;
  
  const imagePosts = posts.filter(p => p.imageUrl);
  const pollPosts = posts.filter(p => p.poll);
  const textPosts = posts.filter(p => !p.imageUrl && !p.poll);
  const quotedPosts = posts.filter(p => p.quotedPost);
  const linkPosts = posts.filter(p => p.linkPreview);
  
  // Her tipten belirli oranlarda al
  const balanced: FeedPost[] = [];
  const perType = Math.ceil(maxBatchSize / 5);
  
  balanced.push(...imagePosts.slice(0, perType));
  balanced.push(...pollPosts.slice(0, perType));
  balanced.push(...quotedPosts.slice(0, perType));
  balanced.push(...linkPosts.slice(0, perType));
  balanced.push(...textPosts.slice(0, perType));
  
  // Eğer hala yer varsa, en yüksek skorlu postları ekle
  if (balanced.length < maxBatchSize) {
    const remaining = posts
      .filter(p => !balanced.includes(p))
      .slice(0, maxBatchSize - balanced.length);
    balanced.push(...remaining);
  }
  
  return balanced;
};