import { useQuery, useMutation } from "@tanstack/react-query";
import { container } from "@/infrastructure/config/Container";
import type {
  Report,
  Warning,
  Ban,
  AuditLog,
} from "@/domain/entities/Moderation";

export function useModerationReports(filters?: { status?: string }) {
  return useQuery({
    queryKey: ["moderation", "reports", filters],
    queryFn: () => container.moderationRepository.listReports(filters),
    enabled: !!container.moderationRepository,
  });
}

export function useReportDetail(reportId: string) {
  return useQuery({
    queryKey: ["moderation", "report", reportId],
    queryFn: () => container.moderationRepository.getReportDetail(reportId),
    enabled: !!reportId && !!container.moderationRepository,
  });
}

export function useCreateReport() {
  return useMutation({
    mutationFn: (
      payload: Parameters<
        typeof container.moderationRepository.createReport
      >[0],
    ) => container.moderationRepository.createReport(payload),
  });
}

export function useUpdateReportStatus() {
  return useMutation({
    mutationFn: ({
      reportId,
      status,
      resolution,
    }: {
      reportId: string;
      status: string;
      resolution?: string;
    }) =>
      container.moderationRepository.updateReportStatus(
        reportId,
        status,
        resolution,
      ),
  });
}

export function useBannedUsers() {
  return useQuery({
    queryKey: ["moderation", "banned-users"],
    queryFn: () => container.moderationRepository.getBannedUsers(),
    enabled: !!container.moderationRepository,
  });
}

export function useCheckBan(userId: string) {
  return useQuery({
    queryKey: ["moderation", "ban-status", userId],
    queryFn: () => container.moderationRepository.checkIfBanned(userId),
    enabled: !!userId && !!container.moderationRepository,
  });
}

export function useBanUser() {
  return useMutation({
    mutationFn: ({
      userId,
      banType,
      reason,
      expiresAt,
    }: {
      userId: string;
      banType: string;
      reason: string;
      expiresAt?: string;
    }) =>
      container.moderationRepository.banUser(
        userId,
        banType,
        reason,
        expiresAt,
      ),
  });
}

export function useUnbanUser() {
  return useMutation({
    mutationFn: (userId: string) =>
      container.moderationRepository.unbanUser(userId),
  });
}

export function useUserWarnings(userId: string) {
  return useQuery({
    queryKey: ["moderation", "warnings", userId],
    queryFn: () => container.moderationRepository.listWarnings(userId),
    enabled: !!userId && !!container.moderationRepository,
  });
}

export function useIssueWarning() {
  return useMutation({
    mutationFn: ({
      userId,
      reason,
      severity,
    }: {
      userId: string;
      reason: string;
      severity: string;
    }) => container.moderationRepository.issueWarning(userId, reason, severity),
  });
}

export function useAuditLogs(filters?: Record<string, any>) {
  return useQuery({
    queryKey: ["moderation", "audit-logs", filters],
    queryFn: () => container.moderationRepository.getAuditLogs(filters),
    enabled: !!container.moderationRepository,
  });
}

export function useUserRole(userId: string) {
  return useQuery({
    queryKey: ["moderation", "user-role", userId],
    queryFn: () => container.moderationRepository.getUserRole(userId),
    enabled: !!userId && !!container.moderationRepository,
  });
}

export function useAssignRole() {
  return useMutation({
    mutationFn: ({
      userId,
      role,
      assignedBy,
    }: {
      userId: string;
      role: string;
      assignedBy: string;
    }) =>
      container.moderationRepository.assignRole(
        userId,
        role as any,
        assignedBy,
      ),
  });
}

export function useModerators() {
  return useQuery({
    queryKey: ["moderation", "moderators"],
    queryFn: () => container.moderationRepository.listModerators(),
    enabled: !!container.moderationRepository,
  });
}
