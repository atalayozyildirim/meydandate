import React, { useState } from "react";
import { View, ScrollView, StyleSheet, Modal, TextInput } from "react-native";
import { Text } from "@/shared/components/Text";
import { Card } from "@/shared/components/Card/Card";
import { Button } from "@/shared/components/Button";
import {
  useModerators,
  useBannedUsers,
  useAuditLogs,
} from "../hooks/useModerationService";

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
    backgroundColor: "#e74c3c",
  },
  tabText: {
    fontSize: 14,
    color: "#333",
  },
  tabTextActive: {
    color: "#fff",
  },
  moderatorCard: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  moderatorInfo: {
    flex: 1,
  },
  moderatorName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  moderatorRole: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  roleActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: "#e74c3c",
  },
  actionButtonRemove: {
    backgroundColor: "#95a5a6",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  banUserCard: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#e74c3c",
  },
  banUserHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  banUserName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  banType: {
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: "#ffebee",
    color: "#c62828",
  },
  banReason: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    fontSize: 14,
    marginTop: 20,
  },
  modal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 14,
  },
  buttonGroup: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  buttonFlex: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonPrimary: {
    backgroundColor: "#e74c3c",
  },
  buttonSecondary: {
    backgroundColor: "#bdc3c7",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  settingItem: {
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingLabel: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#bdc3c7",
    justifyContent: "center",
    alignItems: "center",
  },
  toggleSwitchOn: {
    backgroundColor: "#27ae60",
  },
  toggleDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
});

type AdminTabType = "moderators" | "banned" | "logs" | "settings";

export function AdminDashboard() {
  const [activeTab, setActiveTab] = React.useState<AdminTabType>("moderators");
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"add_mod" | "delete_user">(
    "add_mod",
  );
  const { data: moderators = [] } = useModerators();
  const { data: bannedUsers = [] } = useBannedUsers();
  const { data: auditLogs = [] } = useAuditLogs();

  const renderModerators = () => (
    <View style={styles.section}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <Text style={styles.sectionTitle}>
          Moderatörler ({moderators.length})
        </Text>
        <Button
          onPress={() => {
            setModalType("add_mod");
            setShowModal(true);
          }}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            backgroundColor: "#3498db",
            borderRadius: 4,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
            Ekle
          </Text>
        </Button>
      </View>
      {moderators.length === 0 ? (
        <Text style={styles.emptyText}>Moderatör yok</Text>
      ) : (
        moderators.map((mod) => (
          <View key={mod.userId} style={styles.moderatorCard}>
            <View style={styles.moderatorInfo}>
              <Text style={styles.moderatorName}>{mod.userId}</Text>
              <Text style={styles.moderatorRole}>
                {mod.role === "admin" ? "Admin" : "Moderatör"}
              </Text>
            </View>
            <View style={styles.roleActions}>
              {mod.role === "moderator" && (
                <Button style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>Promosyon</Text>
                </Button>
              )}
              <Button style={[styles.actionButton, styles.actionButtonRemove]}>
                <Text style={styles.actionButtonText}>Kaldır</Text>
              </Button>
            </View>
          </View>
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
        bannedUsers.map((ban) => (
          <View key={ban.id} style={styles.banUserCard}>
            <View style={styles.banUserHeader}>
              <Text style={styles.banUserName}>{ban.userId}</Text>
              <Text style={styles.banType}>
                {ban.banType === "permanent" ? "Kalıcı" : "Geçici"}
              </Text>
            </View>
            <Text style={styles.banReason}>{ban.reason}</Text>
            {ban.expiresAt && (
              <Text style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
                Bitiş: {new Date(ban.expiresAt).toLocaleDateString("tr-TR")}
              </Text>
            )}
            <Button
              style={[
                styles.actionButton,
                styles.actionButtonRemove,
                { marginTop: 8 },
              ]}
            >
              <Text style={styles.actionButtonText}>Yasağı Kaldır</Text>
            </Button>
          </View>
        ))
      )}
    </View>
  );

  const renderSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Sistem Ayarları</Text>
      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Otomatik Profanity Filtreleme</Text>
        <View style={[styles.toggleSwitch, styles.toggleSwitchOn]}>
          <View style={styles.toggleDot} />
        </View>
      </View>
      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Cinsel İçerik Filtreleme</Text>
        <View style={[styles.toggleSwitch, styles.toggleSwitchOn]}>
          <View style={styles.toggleDot} />
        </View>
      </View>
      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Otomatik Ban (Şiddetli İçerik)</Text>
        <View style={[styles.toggleSwitch, styles.toggleSwitchOn]}>
          <View style={styles.toggleDot} />
        </View>
      </View>
      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Denetim Günlüğü Kayıt</Text>
        <View style={[styles.toggleSwitch, styles.toggleSwitchOn]}>
          <View style={styles.toggleDot} />
        </View>
      </View>
    </View>
  );

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.scrollContent}>
          {/* Tabs */}
          <View style={styles.tabsContainer}>
            {(["moderators", "banned", "logs", "settings"] as const).map(
              (tab) => (
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
                    {tab === "moderators" && "Moderatörler"}
                    {tab === "banned" && "Yasaklı"}
                    {tab === "logs" && "Günlükler"}
                    {tab === "settings" && "Ayarlar"}
                  </Text>
                </Button>
              ),
            )}
          </View>

          {/* Content */}
          {activeTab === "moderators" && renderModerators()}
          {activeTab === "banned" && renderBannedUsers()}
          {activeTab === "settings" && renderSettings()}
        </View>
      </ScrollView>

      {/* Modal */}
      {showModal && (
        <Modal visible={showModal} transparent animationType="fade">
          <View style={styles.modal}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {modalType === "add_mod" ? "Moderatör Ekle" : "Kullanıcı Sil"}
              </Text>
              <TextInput
                placeholder={
                  modalType === "add_mod"
                    ? "Kullanıcı ID"
                    : "Silinecek Kullanıcı ID"
                }
                style={styles.input}
              />
              {modalType === "delete_user" && (
                <TextInput
                  placeholder="Silme Nedeni"
                  style={styles.input}
                  multiline
                  numberOfLines={3}
                />
              )}
              <View style={styles.buttonGroup}>
                <Button
                  onPress={() => setShowModal(false)}
                  style={[styles.buttonFlex, styles.buttonSecondary]}
                >
                  <Text style={styles.buttonText}>İptal</Text>
                </Button>
                <Button
                  onPress={() => setShowModal(false)}
                  style={[styles.buttonFlex, styles.buttonPrimary]}
                >
                  <Text style={styles.buttonText}>Onayla</Text>
                </Button>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}
