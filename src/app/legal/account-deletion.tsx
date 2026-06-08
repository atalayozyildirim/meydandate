// Account Deletion talep ekraninin hukuki metnini gosterir.
import { Alert } from "react-native";
import { Button } from "@/shared/components/Button";
import { LegalDocumentScreen } from "@/shared/components/LegalDocumentScreen";
import { legalDocuments } from "@/shared/constants/legal";

export default function AccountDeletionScreen() {
  return (
    <LegalDocumentScreen document={legalDocuments.accountDeletion}>
      <Button
        label="Hesap silme talebi oluştur"
        variant="danger"
        onPress={() => {
          Alert.alert(
            "Talep ekranı hazır",
            "Backend hesap silme endpoint'i bağlandığında bu buton talebi doğrudan gönderecek.",
          );
        }}
      />
    </LegalDocumentScreen>
  );
}
