import type {
  ModerationRepository,
  CreateReportPayload,
  AuditLogPayload,
} from "@/domain/repositories/ModerationRepository";
import type {
  Report,
  Warning,
  Ban,
  AuditLog,
  UserRole,
} from "@/domain/entities/Moderation";
import { supabase } from "./client";
import { createId } from "@/shared/utils/id";

export class SupabaseModerationRepository implements ModerationRepository {
  // Reports
  async listReports(filters?: {
    status?: string;
    userId?: string;
  }): Promise<Report[]> {
    let query = supabase.from("reports").select("*");

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.userId) {
      query = query.eq("reportedUserId", filters.userId);
    }

    const { data, error } = await query.order("createdAt", {
      ascending: false,
    });

    if (error) throw new Error("Raporlar yüklenemedi");
    return data || [];
  }

  async getReportDetail(reportId: string): Promise<Report> {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (error) throw new Error("Rapor yüklenemedi");
    return data;
  }

  async createReport(payload: CreateReportPayload): Promise<Report> {
    const { data, error } = await supabase
      .from("reports")
      .insert({
        id: createId("report"),
        ...payload,
        status: "pending",
        createdAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error("Rapor oluşturulamadı");

    // Log action
    await this.logAction({
      userId: payload.reporterId,
      action: "report_created",
      targetType: "report",
      targetId: data.id,
      details: {
        reportedUserId: payload.reportedUserId,
        category: payload.category,
      },
    });

    return data;
  }

  async updateReportStatus(
    reportId: string,
    status: string,
    resolution?: string,
  ): Promise<Report> {
    const { data, error } = await supabase
      .from("reports")
      .update({
        status,
        resolution,
        resolvedAt: new Date().toISOString(),
      })
      .eq("id", reportId)
      .select()
      .single();

    if (error) throw new Error("Rapor güncellenemedi");

    // Log action
    const report = await this.getReportDetail(reportId);
    await this.logAction({
      userId: report.resolvedBy || "",
      action: "report_updated",
      targetType: "report",
      targetId: reportId,
      details: { newStatus: status, resolution },
    });

    return data;
  }

  async assignReport(reportId: string, moderatorId: string): Promise<Report> {
    const { data, error } = await supabase
      .from("reports")
      .update({ assignedTo: moderatorId })
      .eq("id", reportId)
      .select()
      .single();

    if (error) throw new Error("Rapor atanamadı");
    return data;
  }

  // Warnings
  async listWarnings(userId: string): Promise<Warning[]> {
    const { data, error } = await supabase
      .from("warnings")
      .select("*")
      .eq("userId", userId)
      .order("createdAt", { ascending: false });

    if (error) throw new Error("Uyarılar yüklenemedi");
    return data || [];
  }

  async issueWarning(
    userId: string,
    reason: string,
    severity: string,
  ): Promise<Warning> {
    const { data, error } = await supabase
      .from("warnings")
      .insert({
        id: createId("warning"),
        userId,
        reason,
        severity,
        type: severity === "high" ? "permanent_ban" : "warning",
        createdAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error("Uyarı verilemedi");

    // Auto ban if severity is high
    if (severity === "high") {
      await this.banUser(userId, "permanent", `Otomatik ban: ${reason}`);
    }

    return data;
  }

  async getWarningHistory(userId: string): Promise<Warning[]> {
    return this.listWarnings(userId);
  }

  // Bans
  async getBannedUsers(): Promise<Ban[]> {
    const { data, error } = await supabase
      .from("banned_users")
      .select("*")
      .order("createdAt", { ascending: false });

    if (error) throw new Error("Yasaklı kullanıcılar yüklenemedi");
    return data || [];
  }

  async checkIfBanned(userId: string): Promise<Ban | null> {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("banned_users")
      .select("*")
      .eq("userId", userId)
      .or(`banType.eq.permanent,expiresAt.gt.${now}`)
      .single();

    if (error) return null;
    return data;
  }

  async banUser(
    userId: string,
    banType: string,
    reason: string,
    expiresAt?: string,
  ): Promise<Ban> {
    const { data: authData } = await supabase.auth.getUser();

    if (authData.user?.id === userId && banType === "permanent") {
      const { data, error } = await supabase
        .rpc("auto_ban_current_user", { reason_text: reason })
        .single();

      if (error || !data) {
        throw new Error("Kullanıcı yasaklanamadı");
      }

      return data as Ban;
    }

    const { data, error } = await supabase
      .from("banned_users")
      .insert({
        id: createId("ban"),
        userId,
        banType,
        reason,
        expiresAt,
        createdAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error("Kullanıcı yasaklanamadı");

    // Update user status
    await supabase.rpc("set_user_active", { target_user_id: userId, active: false });

    // Log action
    await this.logAction({
      userId: "",
      action: banType === "permanent" ? "permanent_ban" : "temporary_ban",
      targetType: "ban",
      targetId: data.id,
      details: { userId, reason, expiresAt },
    });

    return data;
  }

  async unbanUser(userId: string): Promise<void> {
    const { error } = await supabase
      .from("banned_users")
      .delete()
      .eq("userId", userId);

    if (error) throw new Error("Yasaklama kaldırılamadı");

    // Update user status
    await supabase.rpc("set_user_active", { target_user_id: userId, active: true });

    // Log action
    await this.logAction({
      userId: "",
      action: "user_unbanned",
      targetType: "user",
      targetId: userId,
      details: { userId },
    });
  }

  async listUserBanHistory(userId: string): Promise<Ban[]> {
    const { data, error } = await supabase
      .from("banned_users")
      .select("*")
      .eq("userId", userId)
      .order("createdAt", { ascending: false });

    if (error) throw new Error("Yasaklama geçmişi yüklenemedi");
    return data || [];
  }

  // Audit Logs
  async logAction(log: AuditLogPayload): Promise<AuditLog> {
    const { data, error } = await supabase
      .from("audit_logs")
      .insert({
        id: createId("audit"),
        ...log,
        createdAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error("İşlem kaydedilmedi");
    return data;
  }

  async getAuditLogs(filters?: Record<string, any>): Promise<AuditLog[]> {
    let query = supabase.from("audit_logs").select("*");

    if (filters?.userId) {
      query = query.eq("userId", filters.userId);
    }
    if (filters?.action) {
      query = query.eq("action", filters.action);
    }
    if (filters?.targetType) {
      query = query.eq("targetType", filters.targetType);
    }

    const { data, error } = await query.order("createdAt", {
      ascending: false,
    });

    if (error) throw new Error("Denetim günlükleri yüklenemedi");
    return data || [];
  }

  async getUserActivityLogs(userId: string): Promise<AuditLog[]> {
    return this.getAuditLogs({ userId });
  }

  // Role Management
  async getUserRole(userId: string): Promise<UserRole> {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("userId", userId)
      .single();

    if (error) return "user";
    return data?.role || "user";
  }

  async assignRole(
    userId: string,
    role: UserRole,
    assignedBy: string,
  ): Promise<void> {
    const { error } = await supabase.from("user_roles").insert({
      id: createId("role"),
      userId,
      role,
      assignedAt: new Date().toISOString(),
      assignedBy,
    });

    if (error) throw new Error("Rol atanmadı");

    await this.logAction({
      userId: assignedBy,
      action: "role_assigned",
      targetType: "user",
      targetId: userId,
      details: { newRole: role },
    });
  }

  async removeRole(userId: string, assignedBy: string): Promise<void> {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("userId", userId);

    if (error) throw new Error("Rol kaldırılamadı");

    await this.logAction({
      userId: assignedBy,
      action: "role_assigned",
      targetType: "user",
      targetId: userId,
      details: { newRole: "user" },
    });
  }

  async listModerators(): Promise<{ userId: string; role: UserRole }[]> {
    const { data, error } = await supabase
      .from("user_roles")
      .select("userId, role")
      .in("role", ["moderator", "admin"]);

    if (error) throw new Error("Moderatörler yüklenemedi");
    return data || [];
  }
}
