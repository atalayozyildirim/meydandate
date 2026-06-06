// Domain entities for moderation system

import type { User } from "./User";

export type UserRole = "user" | "moderator" | "admin";

export interface UserRoleAssignment {
  id: string;
  userId: string;
  role: UserRole;
  assignedAt: string;
  assignedBy: string;
}

export type ReportCategory =
  | "profanity"
  | "sexual_content"
  | "harassment"
  | "spam"
  | "fraud"
  | "other";

export type ReportStatus = "pending" | "in_review" | "resolved" | "dismissed";

export interface Report {
  id: string;
  reporterId: string;
  reportedUserId: string;
  category: ReportCategory;
  description: string;
  status: ReportStatus;
  evidence?: string[];
  assignedTo?: string;
  resolution?: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export type WarningType = "warning" | "temporary_ban" | "permanent_ban";

export interface Warning {
  id: string;
  userId: string;
  issuedBy: string;
  reason: string;
  type: WarningType;
  severity: "low" | "medium" | "high";
  expiresAt?: string;
  createdAt: string;
}

export type BanType = "temporary" | "permanent";

export interface Ban {
  id: string;
  userId: string;
  banType: BanType;
  reason: string;
  bannedBy: string;
  expiresAt?: string;
  appealedAt?: string;
  appealStatus?: "pending" | "approved" | "rejected";
  createdAt: string;
}

export type AuditActionType =
  | "report_created"
  | "report_updated"
  | "warning_issued"
  | "temporary_ban"
  | "permanent_ban"
  | "user_unbanned"
  | "moderator_assigned"
  | "content_filtered"
  | "user_deleted"
  | "role_assigned";

export interface AuditLog {
  id: string;
  userId: string;
  action: AuditActionType;
  targetType: "user" | "report" | "warning" | "ban" | "message" | "system";
  targetId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export type ViolationType =
  | "profanity"
  | "sexual_content"
  | "harassment"
  | "spam";

export interface ContentViolation {
  type: ViolationType;
  severity: "low" | "medium" | "high";
  matches: string[];
  confidence: number;
}

export interface FilteredMessage {
  id: string;
  conversationId: string;
  senderId: string;
  originalContent: string;
  filteredContent: string;
  violations: ContentViolation[];
  isBlocked: boolean;
  autoAction?: WarningType;
  createdAt: string;
}

export interface ProfanityFilter {
  id: string;
  words: string[];
  type: "profanity" | "sexual";
  severity: "low" | "medium" | "high";
  language: "tr" | "en";
  active: boolean;
}

export interface ModerationStats {
  totalReports: number;
  pendingReports: number;
  resolvedReports: number;
  totalWarnings: number;
  activeBans: number;
  bannedUsers: number;
  filteredMessages: number;
}
