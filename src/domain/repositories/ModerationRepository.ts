import type {
  Report,
  Warning,
  Ban,
  AuditLog,
  UserRole,
} from "@/domain/entities/Moderation";

export interface ModerationRepository {
  // Reports
  listReports(filters?: {
    status?: string;
    userId?: string;
  }): Promise<Report[]>;
  getReportDetail(reportId: string): Promise<Report>;
  createReport(payload: CreateReportPayload): Promise<Report>;
  updateReportStatus(
    reportId: string,
    status: string,
    resolution?: string,
  ): Promise<Report>;
  assignReport(reportId: string, moderatorId: string): Promise<Report>;

  // Warnings
  listWarnings(userId: string): Promise<Warning[]>;
  issueWarning(
    userId: string,
    reason: string,
    severity: string,
  ): Promise<Warning>;
  getWarningHistory(userId: string): Promise<Warning[]>;

  // Bans
  getBannedUsers(): Promise<Ban[]>;
  checkIfBanned(userId: string): Promise<Ban | null>;
  banUser(
    userId: string,
    banType: string,
    reason: string,
    expiresAt?: string,
  ): Promise<Ban>;
  unbanUser(userId: string): Promise<void>;
  listUserBanHistory(userId: string): Promise<Ban[]>;

  // Audit Logs
  logAction(log: AuditLogPayload): Promise<AuditLog>;
  getAuditLogs(filters?: Record<string, any>): Promise<AuditLog[]>;
  getUserActivityLogs(userId: string): Promise<AuditLog[]>;

  // Role Management
  getUserRole(userId: string): Promise<UserRole>;
  assignRole(userId: string, role: UserRole, assignedBy: string): Promise<void>;
  removeRole(userId: string, assignedBy: string): Promise<void>;
  listModerators(): Promise<{ userId: string; role: UserRole }[]>;
}

export interface CreateReportPayload {
  reporterId: string;
  reportedUserId: string;
  category: string;
  description: string;
  evidence?: string[];
}

export interface AuditLogPayload {
  userId: string;
  action: string;
  targetType: "user" | "report" | "warning" | "ban" | "message" | "system";
  targetId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}
