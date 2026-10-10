import { useSignIn } from "@clerk/clerk-expo";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { SignalBackdrop } from "@/components/SignalBackdrop";
import { SignalMark } from "@/components/SignalMark";

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);

  async function handleSignIn() {
    if (!isLoaded || loading) return;
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await signIn.create({ identifier: email.trim(), password });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || "Sign in failed. Try again.";
      setError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <SignalBackdrop />
      <KeyboardAwareScrollViewCompat
        style={styles.scroll}
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 32 }]}
        bottomOffset={28}
        keyboardShouldPersistTaps="handled"
      >

          {/* Back */}
          <Link href="/(auth)" asChild>
            <Pressable style={styles.backBtn} testID="auth-sign-in-back">
              <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.5)" />
            </Pressable>
          </Link>

          {/* Header */}
          <View style={styles.header}>
             <View style={styles.logoSmall}><SignalMark size={60} /></View>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to your THERYN account</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {error ? (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={14} color="#f87171" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View>
              <Text style={styles.fieldLabel}>EMAIL</Text>
              <View style={styles.inputWrap}>
                <Feather name="mail" size={16} color="rgba(255,255,255,0.25)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  returnKeyType="next"
                  testID="sign-in-email"
                />
              </View>
            </View>

            <View>
              <Text style={styles.fieldLabel}>PASSWORD</Text>
              <View style={styles.inputWrap}>
                <Feather name="lock" size={16} color="rgba(255,255,255,0.25)" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Your password"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  secureTextEntry={!showPw}
                  autoComplete="current-password"
                  returnKeyType="done"
                  onSubmitEditing={handleSignIn}
                  testID="sign-in-password"
                />
                <Pressable onPress={() => setShowPw(v => !v)} style={styles.eyeBtn} testID="sign-in-toggle-password" accessibilityLabel={showPw ? "Hide password" : "Show password"}>
                  <Feather name={showPw ? "eye-off" : "eye"} size={16} color="rgba(255,255,255,0.3)" />
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={handleSignIn}
              disabled={loading}
              testID="sign-in-submit"
              style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.85 }, loading && { opacity: 0.6 }]}
            >
              <LinearGradient colors={["#dc2626", "#b91c1c"]} style={styles.submitGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitText}>Sign In</Text>
                )}
              </LinearGradient>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/(auth)/sign-up" asChild>
              <Pressable testID="sign-in-sign-up">
                <Text style={styles.footerLink}>Sign up</Text>
              </Pressable>
            </Link>
          </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0a0a" },
  scroll: { flex: 1 },
  container: { paddingHorizontal: 24, gap: 0, width: "100%", maxWidth: 480, alignSelf: "center" },
  backBtn: {
    width: 40, height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 32,
  },
  header: { alignItems: "center", gap: 10, marginBottom: 32 },
  logoSmall: { width: 60, height: 60, borderRadius: 18, overflow: "hidden" },
  logoGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
  logoLetter: { fontFamily: "Inter_700Bold", fontSize: 26, color: "#fff" },
  title: { fontFamily: "Inter_700Bold", fontSize: 26, color: "#fff" },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 14, color: "rgba(255,255,255,0.35)", textAlign: "center" },
  form: { gap: 16, backgroundColor: "rgba(255,255,255,0.025)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", borderRadius: 24, padding: 18 },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 12, borderRadius: 12,
    backgroundColor: "rgba(239,68,68,0.08)",
    borderWidth: 1, borderColor: "rgba(239,68,68,0.2)",
  },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 12, color: "#f87171", flex: 1, lineHeight: 17 },
  fieldLabel: {
    fontFamily: "Inter_600SemiBold", fontSize: 9,
    color: "rgba(255,255,255,0.25)", letterSpacing: 1.5, marginBottom: 8,
  },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#141414",
    borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)",
    paddingHorizontal: 14, paddingVertical: 14,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontFamily: "Inter_400Regular", fontSize: 15, color: "#fff",
  },
  eyeBtn: { padding: 4 },
  submitBtn: { borderRadius: 16, overflow: "hidden", marginTop: 8 },
  submitGrad: { paddingVertical: 18, alignItems: "center", justifyContent: "center" },
  submitText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 24 },
  footerText: { fontFamily: "Inter_400Regular", fontSize: 14, color: "rgba(255,255,255,0.4)" },
  footerLink: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#dc2626" },
});
