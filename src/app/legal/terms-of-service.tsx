// Terms Of Service hukuki dokuman ekranini gosterir.
import { LegalDocumentScreen } from "@/shared/components/LegalDocumentScreen";
import { legalDocuments } from "@/shared/constants/legal";

export default function TermsOfServiceScreen() {
  return <LegalDocumentScreen document={legalDocuments.termsOfService} />;
}
