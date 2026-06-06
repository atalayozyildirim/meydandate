import React, { useMemo } from "react";
import { View, ScrollView, StyleSheet, FlatList } from "react-native";
import { Text } from "@/shared/components/Text";
import { Card } from "@/shared/components/Card/Card";
import { Button } from "@/shared/components/Button";
import {
  useModerationReports,
  useBannedUsers,
  useAuditLogs,
  useModerators,
} from "../hooks/useModerationService";
import type { Report, Ban, AuditLog } from "@/domain/entities/Moderation";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#fff",
    alignItems: "center",
    borderLeftWidth: 4,
  },
  statNumberHigh: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#e74c3c",
  },
  statNumberMedium: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#f39c12",
  },
  statNumberLow: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#27ae60",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
  tabsContainer: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#e8e8e8",
  },
  tabActive: {
    backgroundColor: "#3498db",
  },
  tabText: {
    fontSize: 14,
    color: "#333",
  },
  tabTextActive: {
    color: "#fff",
  },
  reportCard: {
    marginBottom: 12,
    padding: 12,
  },
  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  reportStatus: {
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: "#fff3cd",
    color: "#856404",
  },
  reportStatusResolved: {
    backgroundColor: "#d4edda",
    color: "#155724",
  },
  reportCategory: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  reportDescription: {
    fontSize: 13,
    color: "#333",
    marginTop: 8,
    lineHeight: 18,
  },
  actionButton: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: "#3498db",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  banList: {
    marginBottom: 12,
  },
  banItem: {
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#e74c3c",
  },
  banReason: {
    fontSize: 13,
    color: "#333",
    marginTop: 4,
  },
  auditLog: {
    padding: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 2,
    borderLeftColor: "#3498db",
  },
  auditAction: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  auditMeta: {
    fontSize: 11,
    color: "#999",
    marginTop: 4,
  },
  loadingText: {
    textAlign: "center",
    color: "#999",
    marginTop: 20,
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    fontSize: 14,
    marginTop: 20,
    marginBottom: 20,
  },
});

type TabType = "pending" | "resolved" | "banned" | "warnings" | "activity";

export function ModeratorDashboard() {
  const [activeTab, setActiveTab] = React.useState<TabType>("pending");
  const { data: reports = [] } = useModerationReports();
  const { data: bannedUsers = [] } = useBannedUsers();
  const { data: auditLogs = [] } = useAuditLogs();
  const { data: moderators = [] } = useModerators();

  const stats = useMemo(
    () => ({
      total: reports.length,
      pending: reports.filter((r) => r.status === "pending").length,
      resolved: reports.filter((r) => r.status === "resolved").length,
      banned: bannedUsers.filter((b) => b.banType === "permanent").length,
      temporary: bannedUsers.filter((b) => b.banType === "temporary").length,
    }),
    [reports, bannedUsers],
  );

  const pendingReports = reports.filter((r) => r.status === "pending");
  const resolvedReports = reports.filter((r) => r.status === "resolved");

  const renderPendingReports = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        Beklemede olan Şikayetler ({pendingReports.length})
      </Text>
      {pendingReports.length === 0 ? (
        <Text style={styles.emptyText}>Şu anda beklemede şikayet yok</Text>
      ) : (
        pendingReports.map((report) => (
          <ReportCard key={report.id} report={report} />
        ))
      )}
    </View>
  );

  const renderResolvedReports = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        Çözümlenen Şikayetler ({resolvedReports.length})
      </Text>
      {resolvedReports.length === 0 ? (
        <Text style={styles.emptyText}>Çözümlenen şikayet yok</Text>
      ) : (
        resolvedReports.map((report) => (
          <ReportCard key={report.id} report={report} />
        ))
      )}
    </View>
  );

  const renderBannedUsers = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        Yasaklı Kullanıcılar ({bannedUsers.length})
      </Text>
      {bannedUsers.length === 0 ? (
        <Text style={styles.emptyText}>Yasaklı kullanıcı yok</Text>
      ) : (
        bannedUsers.map((ban) => <BanCard key={ban.id} ban={ban} />)
      )}
    </View>
  );

  const renderActivityLog = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Son Aktiviteler</Text>
      {auditLogs.slice(0, 20).map((log) => (
        <AuditLogCard key={log.id} log={log} />
      ))}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.scrollContent}>
        {/* Stats */}
        <View style={styles.statsGrid}>
          <StatCard
            number={stats.pending}
            label="Bekleme"
            severity="high"
            color="#e74c3c"
          />
          <StatCard
            number={stats.resolved}
            label="Çözümlenen"
            severity="low"
            color="#27ae60"
          />
          <StatCard
            number={stats.banned}
            label="Yasaklı"
            severity="medium"
            color="#f39c12"
          />
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {(
            ["pending", "resolved", "banned", "warnings", "activity"] as const
          ).map((tab) => (
            <Button
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive,
                ]}
              >
                {tab === "pending" && "Bekleme"}
                {tab === "resolved" && "Çözümlenen"}
                {tab === "banned" && "Yasaklı"}
                {tab === "warnings" && "Uyarılar"}
                {tab === "activity" && "Aktivite"}
              </Text>
            </Button>
          ))}
        </View>

        {/* Content */}
        {activeTab === "pending" && renderPendingReports()}
        {activeTab === "resolved" && renderResolvedReports()}
        {activeTab === "banned" && renderBannedUsers()}
        {activeTab === "activity" && renderActivityLog()}
      </View>
    </ScrollView>
  );
}

function StatCard({
  number,
  label,
  severity,
  color,
}: {
  number: number;
  label: string;
  severity: "high" | "medium" | "low";
  color: string;
}) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text
        style={[
          severity === "high" && styles.statNumberHigh,
          severity === "medium" && styles.statNumberMedium,
          severity === "low" && styles.statNumberLow,
        ]}
      >
        {number}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ReportCard({ report }: { report: Report }) {
  return (
    <Card style={styles.reportCard}>
      <View style={styles.reportHeader}>
        <Text
          style={[
            styles.reportStatus,
            report.status === "resolved" && styles.reportStatusResolved,
          ]}
        >
          {report.status === "pending" && "Bekleme"}
          {report.status === "resolved" && "Çözümlendi"}
          {report.status === "in_review" && "İnceleme"}
          {report.status === "dismissed" && "Reddedildi"}
        </Text>
      </View>
      <Text style={styles.reportCategory}>
        {report.category === "profanity" && "Küfür"}
        {report.category === "sexual_content" && "Cinsel İçerik"}
        {report.category === "harassment" && "Taciz"}
        {report.category === "spam" && "Spam"}
        {report.category === "fraud" && "Dolandırıcılık"}
        {report.category === "other" && "Diğer"}
      </Text>
      <Text style={styles.reportDescription}>{report.description}</Text>
      {report.status === "pending" && (
        <Button style={styles.actionButton}>
          <Text style={styles.actionButtonText}>İncele</Text>
        </Button>
      )}
    </Card>
  );
}

function BanCard({ ban }: { ban: Ban }) {
  return (
    <View style={styles.banItem}>
      <View style={styles.reportHeader}>
        <Text style={styles.reportStatus}>
          {ban.banType === "permanent" ? "Kalıcı" : "Geçici"}
        </Text>
        {ban.expiresAt && (
          <Text style={styles.reportCategory}>
            {new Date(ban.expiresAt).toLocaleDateString("tr-TR")}
          </Text>
        )}
      </View>
      <Text style={styles.banReason}>{ban.reason}</Text>
    </View>
  );
}

function AuditLogCard({ log }: { log: AuditLog }) {
  return (
    <View style={styles.auditLog}>
      <Text style={styles.auditAction}>
        {log.action.replace(/_/g, " ").toUpperCase()}
      </Text>
      <Text style={styles.auditMeta}>
        {new Date(log.createdAt).toLocaleString("tr-TR")}
      </Text>
      {log.details && Object.keys(log.details).length > 0 && (
        <Text style={styles.auditMeta}>
          {JSON.stringify(log.details).substring(0, 100)}...
        </Text>
      )}
    </View>
  );
}
