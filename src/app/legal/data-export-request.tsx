// Data Export Request hukuki ve operasyonel bilgi ekranini gosterir.
import { LegalDocumentScreen } from "@/shared/components/LegalDocumentScreen";
import { legalDocuments } from "@/shared/constants/legal";

export default function DataExportRequestScreen() {
  return <LegalDocumentScreen document={legalDocuments.dataExport} />;
}
