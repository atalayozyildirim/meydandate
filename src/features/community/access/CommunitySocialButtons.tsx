import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import Svg, { Path } from "react-native-svg";
import { Icon, colors, fonts } from "../ui";
import type { SocialProvider } from "./CommunityAccessService";

export function CommunitySocialButtons({ busy, onSignIn }: { busy: boolean; onSignIn: (provider: SocialProvider) => void }) {
  const [nativeApple, setNativeApple] = useState(false);
  useEffect(() => {
    let active = true;
    if (Platform.OS === "ios") AppleAuthentication.isAvailableAsync().then(value => { if (active) setNativeApple(value); }).catch(() => {});
    return () => { active = false; };
  }, []);

  return <View style={s.stack}>
    {nativeApple ? <View pointerEvents={busy ? "none" : "auto"} style={{ opacity: busy ? 0.5 : 1 }} accessibilityState={{ disabled: busy }}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={12} style={{ width: "100%", height: 56 }}
        onPress={() => onSignIn("apple")}
      />
    </View> : <Pressable accessibilityRole="button" accessibilityLabel="Apple ile devam et" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => onSignIn("apple")} style={[s.button, s.apple, busy && s.disabled]}>
      <Icon name="logo-apple" color="#FFFFFF" size={23} /><Text style={[s.text, { color: "#FFFFFF" }]}>Apple ile devam et</Text>
    </Pressable>}
    <Pressable accessibilityRole="button" accessibilityLabel="Google ile devam et" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => onSignIn("google")} style={[s.button, s.google, busy && s.disabled]}>
      <Svg width={22} height={22} viewBox="0 0 48 48" accessibilityElementsHidden>
        <Path fill="#4285F4" d="M43.6 24.5c0-1.5-.1-2.8-.4-4.2H24v8h11a9.4 9.4 0 0 1-4.1 6.2v5.2h6.6c3.9-3.6 6.1-8.8 6.1-15.2z" />
        <Path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.2c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.5H5.8v5.3A20.4 20.4 0 0 0 24 44z" />
        <Path fill="#FBBC05" d="M12.6 27.4a12.2 12.2 0 0 1 0-7.8v-5.3H5.8a20 20 0 0 0 0 18.4l6.8-5.3z" />
        <Path fill="#EA4335" d="M24 11.9c3 0 5.7 1 7.9 3.1l5.9-5.8A19.8 19.8 0 0 0 24 4 20.4 20.4 0 0 0 5.8 14.3l6.8 5.3c1.6-4.9 6.1-7.7 11.4-7.7z" />
      </Svg>
      <Text style={s.text}>Google ile devam et</Text>
    </Pressable>
  </View>;
}

const s = StyleSheet.create({
  stack: { gap: 14 },
  button: { minHeight: 56, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 20 },
  apple: { backgroundColor: "#000000" },
  google: { backgroundColor: "#FFFFFF", borderColor: colors.line, borderWidth: 1 },
  text: { color: colors.ink, fontFamily: fonts.semi, fontSize: 16 },
  disabled: { opacity: 0.5 },
});
