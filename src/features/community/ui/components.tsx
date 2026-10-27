import type { PropsWithChildren } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors, fonts, ui, type IconName } from "./theme";
import { Ionicons } from "@expo/vector-icons";
import { imagery, type CommunityEvent } from "../data";

export const Icon = ({
  name,
  size = 22,
  color = colors.ink,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) => <Ionicons name={name} size={size} color={color} />;

export const Copy = ({
  children,
  small,
  muted,
  style,
}: PropsWithChildren<{
  small?: boolean;
  muted?: boolean;
  style?: StyleProp<any>;
}>) => (
  <Text
    style={[
      ui.copy,
      small && ui.small,
      muted && { color: colors.muted },
      style,
    ]}
  >
    {children}
  </Text>
);

export const Heading = ({
  children,
  large,
  style,
}: PropsWithChildren<{ large?: boolean; style?: StyleProp<any> }>) => (
  <Text
    accessibilityRole="header"
    style={[ui.heading, large && ui.pageTitle, style]}
  >
    {children}
  </Text>
);

export const Eyebrow = ({ children }: PropsWithChildren) => (
  <Text style={ui.eyebrow}>{children}</Text>
);

export function IconButton({
  name,
  label,
  onPress,
  selected,
}: {
  name: IconName;
  label: string;
  onPress: () => void;
  selected?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        ui.iconButton,
        pressed && ui.pressed && ui.focus,
      ]}
    >
      <Icon name={name} color={selected ? colors.wine : colors.ink} />
    </Pressable>
  );
}

export function Button({
  children,
  onPress,
  secondary,
  icon,
  disabled,
  style,
}: PropsWithChildren<{
  onPress: () => void;
  secondary?: boolean;
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        ui.button,
        secondary && ui.secondaryButton,
        disabled && { opacity: 0.45 },
        pressed && ui.pressed && ui.focus,
        style,
      ]}
    >
      <Text style={[ui.buttonText, secondary && { color: colors.wine }]}>
        {children}
      </Text>
      {icon && (
        <Icon
          name={icon}
          size={20}
          color={secondary ? colors.wine : colors.white}
        />
      )}
    </Pressable>
  );
}

export function SectionTitle({
  children,
  action,
  onPress,
}: PropsWithChildren<{ action?: string; onPress?: () => void }>) {
  return (
    <View style={ui.sectionTitle}>
      <Heading>{children}</Heading>
      {action && (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={() => [ui.linkButton]}
        >
          <Text style={ui.link}>{action}</Text>
          <Icon name="arrow-forward" size={16} color={colors.wine} />
        </Pressable>
      )}
    </View>
  );
}

export function Brand() {
  return (
    <View style={ui.brand}>
      <View style={ui.mark}>
        <Image
          source={imagery.brand}
          accessibilityLabel="Ehlibyte"
          style={ui.logoSource}
          resizeMode="contain"
        />
      </View>
      <Text style={ui.wordmark}>ehlibyte</Text>
    </View>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <View style={ui.search}>
      <Icon name="search-outline" size={20} color={colors.muted} />
      <TextInput
        accessibilityLabel={placeholder}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        value={value}
        onChangeText={onChange}
        style={ui.searchInput}
      />
      {Boolean(value) && (
        <IconButton
          name="close"
          label="Aramayı temizle"
          onPress={() => onChange("")}
        />
      )}
    </View>
  );
}

export function Chips({
  values,
  value,
  onChange,
  scrollable = false,
  containerStyle,
  contentContainerStyle,
}: {
  values: readonly string[];
  value: string;
  onChange: (value: string) => void;
  scrollable?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  const items = values.map((item) => {
    const isSelected = item === value;
    return (
      <Pressable
        key={item}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        onPress={() => onChange(item)}
        style={({ pressed }) => [
          ui.chip,
          isSelected && ui.chipSelected,
          pressed && ui.pressed && ui.focus,
        ]}
      >
        <Text
          style={[
            ui.chipText,
            isSelected && { color: colors.white, fontFamily: fonts.semi },
          ]}
        >
          {item}
        </Text>
      </Pressable>
    );
  });

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={containerStyle}
        contentContainerStyle={[ui.chipsScroll, contentContainerStyle]}
      >
        {items}
      </ScrollView>
    );
  }

  return <View style={[ui.chips, containerStyle]}>{items}</View>;
}

export function Empty({
  icon = "leaf-outline",
  title,
  description,
  action,
  onPress,
}: {
  icon?: IconName;
  title: string;
  description: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={ui.empty}>
      <Icon name={icon} size={32} color={colors.wine} />
      <Heading style={{ textAlign: "center", fontSize: 26 }}>{title}</Heading>
      <Copy muted style={{ textAlign: "center" }}>
        {description}
      </Copy>
      {action && onPress && (
        <Button secondary onPress={onPress}>
          {action}
        </Button>
      )}
    </View>
  );
}

export function EventCard({
  event,
  onPress,
  joined,
}: {
  event: CommunityEvent;
  onPress: () => void;
  joined?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${event.date}, ${event.city}. Etkinliği incele`}
      onPress={onPress}
      style={({ pressed }) => [ui.eventRow, pressed && ui.pressed && ui.focus]}
    >
      <Image
        source={event.image}
        style={ui.eventThumb}
        accessibilityLabel={
          event.category === "Atölye"
            ? "Bağlama çalan eller"
            : "Topluluk buluşması"
        }
      />
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={ui.eventDate}>
          {event.date} · {event.time.split(" – ")[0]}
        </Text>
        <Text style={ui.eventTitle}>{event.title}</Text>
        <Copy small muted>
          {event.city} · {event.district}
        </Copy>
        <Text style={[ui.tag, joined && { color: colors.green }]}>
          {joined
            ? "Katılımın kaydedildi"
            : `${event.category} · Ücretsiz`}
        </Text>
      </View>
      <Icon name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}
