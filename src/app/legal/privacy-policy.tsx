// Privacy Policy hukuki dokuman ekranini gosterir.
import { LegalDocumentScreen } from "@/shared/components/LegalDocumentScreen";
import { legalDocuments } from "@/shared/constants/legal";

export default function PrivacyPolicyScreen() {
  return <LegalDocumentScreen document={legalDocuments.privacyPolicy} />;
}
