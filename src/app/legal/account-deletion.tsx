// Account Deletion talep ekraninin hukuki metnini gosterir.
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/shared/components/Button";
import { LegalDocumentScreen } from "@/shared/components/LegalDocumentScreen";
import { legalDocuments } from "@/shared/constants/legal";
import { useSession } from "@/features/auth/hooks/useSession";

export default function AccountDeletionScreen() {
  const router = useRouter();
  const { deleteAccount } = useSession();

  const confirmDeletion = () => {
    Alert.alert(
      "Hesap silinsin mi?",
      "Profilin, eşleşmelerin ve kullanıcıya bağlı kişisel verilerin silme süreci başlatılacak. Bu işlem geri alınamaz.",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Hesabı sil",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccount();
              Alert.alert("Hesap silindi", "Hesabın silindi ve oturumun kapatıldı.");
              router.replace("/auth/login");
            } catch (error) {
              Alert.alert(
                "Hesap silinemedi",
                error instanceof Error ? error.message : "Tekrar deneyin.",
              );
            }
          },
        },
      ],
    );
  };

  return (
    <LegalDocumentScreen document={legalDocuments.accountDeletion}>
      <Button
        label="Hesabımı sil"
        variant="danger"
        onPress={confirmDeletion}
      />
    </LegalDocumentScreen>
  );
}
