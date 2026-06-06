// Consent Management tercih ekraninin hukuki metnini gosterir.
import { LegalDocumentScreen } from "@/shared/components/LegalDocumentScreen";
import { legalDocuments } from "@/shared/constants/legal";

export default function ConsentManagementScreen() {
  return <LegalDocumentScreen document={legalDocuments.consentManagement} />;
}
