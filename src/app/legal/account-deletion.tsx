// Account Deletion talep ekraninin hukuki metnini gosterir.
import { LegalDocumentScreen } from "@/shared/components/LegalDocumentScreen";
import { legalDocuments } from "@/shared/constants/legal";

export default function AccountDeletionScreen() {
  return <LegalDocumentScreen document={legalDocuments.accountDeletion} />;
}
