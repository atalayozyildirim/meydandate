import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Copy, Heading, colors } from "../../ui";
import type { LegalDocument } from "../contracts";
import { accessGateStyles as s } from "./accessGateStyles";

export function Field({
  label,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View style={s.field}>
      <Copy small>{label}</Copy>
      <TextInput
        {...props}
        accessibilityLabel={label}
        autoCapitalize={
          props.textContentType === "name" ||
          props.textContentType === "addressCity"
            ? "words"
            : "none"
        }
        placeholderTextColor={colors.muted}
        style={s.input}
      />
    </View>
  );
}

export function Consent({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled: boolean;
}) {
  return (
    <View style={s.consent}>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: colors.wine }}
      />
      <Copy small style={{ flex: 1 }}>
        {label}
      </Copy>
    </View>
  );
}

export function DocumentLinks({
  documents,
  onOpen,
}: {
  documents: LegalDocument[];
  onOpen: (document: LegalDocument) => void;
}) {
  return (
    <View>
      {documents.map((document) => (
        <Pressable
          key={document.kind}
          accessibilityRole="button"
          onPress={() => onOpen(document)}
          style={s.documentLink}
        >
          <Copy
            small
            style={{ color: colors.wine, textDecorationLine: "underline" }}
          >
            {document.title}
          </Copy>
        </Pressable>
      ))}
    </View>
  );
}

export function LegalDocumentModal({
  document,
  onClose,
}: {
  document: LegalDocument | null;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={Boolean(document)}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.content}>
          <Button secondary onPress={onClose}>
            Kapat
          </Button>
          <Heading>{document?.title}</Heading>
          <Copy small muted>
            Sürüm: {document?.version}
          </Copy>
          <Text selectable style={s.document}>
            {document?.body}
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
