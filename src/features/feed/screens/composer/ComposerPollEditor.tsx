import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/theme";
import type { createFeedComposerStyles } from "./feedComposerStyles";

interface ComposerPollEditorProps {
  styles: ReturnType<typeof createFeedComposerStyles>;
  question: string;
  onQuestionChange: (value: string) => void;
  options: string[];
  onOptionsChange: (updater: (current: string[]) => string[]) => void;
  onClose: () => void;
}

export function ComposerPollEditor({
  styles,
  question,
  onQuestionChange,
  options,
  onOptionsChange,
  onClose,
}: ComposerPollEditorProps) {
  const theme = useTheme();

  return (
    <View style={styles.pollPanel}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Ionicons
            name="bar-chart-outline"
            size={18}
            color={theme.colors.text}
          />
          <Text style={styles.sectionTitle}>Anket</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Anketi kaldır"
          onPress={onClose}
          style={styles.smallIconButton}
        >
          <Ionicons name="trash-outline" size={18} color={theme.colors.muted} />
        </Pressable>
      </View>
      <TextInput
        value={question}
        onChangeText={onQuestionChange}
        placeholder="Anket sorusu"
        placeholderTextColor={theme.colors.muted}
        style={styles.pollInput}
      />
      {options.map((option, index) => (
        <View key={index} style={styles.pollOptionRow}>
          <Text style={styles.pollOptionNumber}>{index + 1}</Text>
          <TextInput
            value={option}
            onChangeText={(value) =>
              onOptionsChange((current) =>
                current.map((item, itemIndex) =>
                  itemIndex === index ? value : item,
                ),
              )
            }
            placeholder={`Seçenek ${index + 1}`}
            placeholderTextColor={theme.colors.muted}
            style={styles.pollOptionInput}
          />
          {options.length > 2 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${index + 1}. seçeneği kaldır`}
              onPress={() =>
                onOptionsChange((current) =>
                  current.filter((_, itemIndex) => itemIndex !== index),
                )
              }
              style={styles.smallIconButton}
            >
              <Ionicons name="close" size={17} color={theme.colors.muted} />
            </Pressable>
          ) : null}
        </View>
      ))}
      {options.length < 5 ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => onOptionsChange((current) => [...current, ""])}
          style={styles.addOptionButton}
        >
          <Ionicons name="add" size={18} color={theme.colors.text} />
          <Text style={styles.addOptionText}>Seçenek ekle</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
