// Mock ortamda ban, uyari ve audit kayitlarini bellek icinde tutar.
import type {
  AuditLog,
  Ban,
  Report,
  UserRole,
  Warning,
} from "@/domain/entities/Moderation";
import type {
  AuditLogPayload,
  CreateReportPayload,
  ModerationRepository,
} from "@/domain/repositories/ModerationRepository";
import { mockDatabase } from "@/infrastructure/mock/MockDatabase";
import { createId } from "@/shared/utils/id";

const reports: Report[] = [];
const warnings: Warning[] = [];
const bans: Ban[] = [];
const auditLogs: AuditLog[] = [];

export class MockModerationRepository implements ModerationRepository {
  async listReports(): Promise<Report[]> {
    return reports;
  }

  async getReportDetail(reportId: string): Promise<Report> {
    const report = reports.find((candidate) => candidate.id === reportId);

    if (!report) {
      throw new Error("Rapor bulunamadi.");
    }

    return report;
  }

  async createReport(payload: CreateReportPayload): Promise<Report> {
    const report: Report = {
      id: createId("report"),
      ...payload,
      category: payload.category as Report["category"],
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    reports.push(report);
    return report;
  }

  async updateReportStatus(
    reportId: string,
    status: string,
    resolution?: string,
  ): Promise<Report> {
    const report = await this.getReportDetail(reportId);
    report.status = status as Report["status"];
    report.resolution = resolution;
    report.resolvedAt = new Date().toISOString();
    return report;
  }

  async assignReport(reportId: string, moderatorId: string): Promise<Report> {
    const report = await this.getReportDetail(reportId);
    report.assignedTo = moderatorId;
    return report;
  }

  async listWarnings(userId: string): Promise<Warning[]> {
    return warnings.filter((warning) => warning.userId === userId);
  }

  async issueWarning(
    userId: string,
    reason: string,
    severity: string,
  ): Promise<Warning> {
    const warning: Warning = {
      id: createId("warning"),
      userId,
      issuedBy: "system",
      reason,
      type: severity === "high" ? "permanent_ban" : "warning",
      severity: severity as Warning["severity"],
      createdAt: new Date().toISOString(),
    };

    warnings.push(warning);
    return warning;
  }

  async getWarningHistory(userId: string): Promise<Warning[]> {
    return this.listWarnings(userId);
  }

  async getBannedUsers(): Promise<Ban[]> {
    return bans;
  }

  async checkIfBanned(userId: string): Promise<Ban | null> {
    const now = Date.now();

    return (
      bans.find(
        (ban) =>
          ban.userId === userId &&
          (ban.banType === "permanent" ||
            (ban.expiresAt ? new Date(ban.expiresAt).getTime() > now : false)),
      ) ?? null
    );
  }

  async banUser(
    userId: string,
    banType: string,
    reason: string,
    expiresAt?: string,
  ): Promise<Ban> {
    const existingBan = await this.checkIfBanned(userId);

    if (existingBan) {
      return existingBan;
    }

    const ban: Ban = {
      id: createId("ban"),
      userId,
      banType: banType as Ban["banType"],
      reason,
      bannedBy: "system",
      expiresAt,
      createdAt: new Date().toISOString(),
    };

    bans.push(ban);
    mockDatabase.bannedIdentifiers.userIds.add(userId);

    const user = mockDatabase.users.find((candidate) => candidate.id === userId);

    if (user?.phoneNumber) {
      mockDatabase.bannedIdentifiers.phoneNumbers.add(user.phoneNumber);
    }

    if (user?.email) {
      mockDatabase.bannedIdentifiers.emails.add(user.email.toLocaleLowerCase("tr-TR"));
    }

    return ban;
  }

  async unbanUser(userId: string): Promise<void> {
    const index = bans.findIndex((ban) => ban.userId === userId);

    if (index >= 0) {
      bans.splice(index, 1);
    }
  }

  async listUserBanHistory(userId: string): Promise<Ban[]> {
    return bans.filter((ban) => ban.userId === userId);
  }

  async logAction(log: AuditLogPayload): Promise<AuditLog> {
    const auditLog: AuditLog = {
      id: createId("audit"),
      ...log,
      action: log.action as AuditLog["action"],
      createdAt: new Date().toISOString(),
    };

    auditLogs.push(auditLog);
    return auditLog;
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    return auditLogs;
  }

  async getUserActivityLogs(userId: string): Promise<AuditLog[]> {
    return auditLogs.filter((log) => log.userId === userId);
  }

  async getUserRole(): Promise<UserRole> {
    return "user";
  }

  async assignRole(): Promise<void> {
    return Promise.resolve();
  }

  async removeRole(): Promise<void> {
    return Promise.resolve();
  }

  async listModerators(): Promise<{ userId: string; role: UserRole }[]> {
    return [];
  }
}
