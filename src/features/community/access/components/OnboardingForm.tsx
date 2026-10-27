import React from "react";
import { Pressable, View } from "react-native";
import { Button, Copy, colors } from "../../ui";
import type { LegalDocument } from "../contracts";
import { Field, Consent, DocumentLinks } from "./AccessGatePrimitives";
import { accessGateStyles as s } from "./accessGateStyles";

interface OnboardingFormProps {
  name: string;
  setName: (name: string) => void;
  birthDate: string;
  setBirthDate: (birthDate: string) => void;
  city: string;
  setCity: (city: string) => void;
  interests: readonly string[];
  selectedInterests: string[];
  setSelectedInterests: React.Dispatch<React.SetStateAction<string[]>>;
  documents: LegalDocument[];
  termsAccepted: boolean;
  setTermsAccepted: (accepted: boolean) => void;
  rulesAccepted: boolean;
  setRulesAccepted: (accepted: boolean) => void;
  busy: boolean;
  onOpenDocument: (doc: LegalDocument) => void;
  onRefreshDocuments: () => void;
  onSubmit: () => void;
  onSignOut: () => void;
}

export function OnboardingForm({
  name,
  setName,
  birthDate,
  setBirthDate,
  city,
  setCity,
  interests,
  selectedInterests,
  setSelectedInterests,
  documents,
  termsAccepted,
  setTermsAccepted,
  rulesAccepted,
  setRulesAccepted,
  busy,
  onOpenDocument,
  onRefreshDocuments,
  onSubmit,
  onSignOut,
}: OnboardingFormProps) {
  return (
    <View style={s.form}>
      <Field
        label="Görünen adın"
        value={name}
        onChangeText={setName}
        placeholder="Adın"
        maxLength={80}
        editable={!busy}
        textContentType="name"
      />
      <Field
        label="Doğum tarihin (yıl-ay-gün)"
        value={birthDate}
        onChangeText={setBirthDate}
        placeholder="YYYY-AA-GG"
        maxLength={10}
        keyboardType="numbers-and-punctuation"
        editable={!busy}
      />
      <Copy small muted>
        Doğum tarihin yaş uygunluğunu kontrol etmek için kullanılır.
      </Copy>
      <Field
        label="Yaşadığın şehir"
        value={city}
        onChangeText={setCity}
        placeholder="Şehir"
        maxLength={80}
        editable={!busy}
        textContentType="addressCity"
      />
      <Copy>İlgi alanların (isteğe bağlı)</Copy>
      <View style={s.chips}>
        {interests.map((interest) => (
          <Pressable
            key={interest}
            accessibilityRole="button"
            accessibilityState={{
              selected: selectedInterests.includes(interest),
              disabled: busy,
            }}
            disabled={busy}
            onPress={() =>
              setSelectedInterests((current) =>
                current.includes(interest)
                  ? current.filter((item) => item !== interest)
                  : [...current, interest],
              )
            }
            style={[
              s.chip,
              selectedInterests.includes(interest) && s.selected,
            ]}
          >
            <Copy
              small
              style={
                selectedInterests.includes(interest)
                  ? { color: colors.white }
                  : undefined
              }
            >
              {interest}
            </Copy>
          </Pressable>
        ))}
      </View>
      <DocumentLinks documents={documents} onOpen={onOpenDocument} />
      <Button
        secondary
        disabled={busy}
        onPress={onRefreshDocuments}
      >
        {documents.length === 0
          ? "Bilgilendirme metinlerini yeniden yükle"
          : "Metinleri yenile"}
      </Button>
      <Consent
        label="Hizmet koşullarını kabul ediyorum."
        value={termsAccepted}
        onChange={setTermsAccepted}
        disabled={busy || documents.length !== 4}
      />
      <Consent
        label="Topluluk kurallarını kabul ediyorum."
        value={rulesAccepted}
        onChange={setRulesAccepted}
        disabled={busy || documents.length !== 4}
      />
      <Copy small muted>
        Gizlilik ve KVKK metinleri verilerinin nasıl işlendiğini
        açıklar. Pazarlama veya takip izni bu adımda istenmez.
      </Copy>
      <Button
        disabled={
          busy ||
          documents.length !== 4 ||
          !termsAccepted ||
          !rulesAccepted
        }
        onPress={onSubmit}
      >
        {busy ? "Kaydediliyor…" : "Profilimi tamamla"}
      </Button>
      <Button secondary disabled={busy} onPress={onSignOut}>
        Çıkış yap
      </Button>
    </View>
  );
}
