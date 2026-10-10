import { useSignUp } from "@clerk/clerk-expo";
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

type Step = "form" | "verify";

export default function SignUpScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);

  async function handleSignUp() {
    if (!isLoaded || loading) return;
    if (!email.trim() || !password.trim()) { setError("Please fill in all fields."); return; }
    setLoading(true); setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await signUp.create({ emailAddress: email.trim(), password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep("verify");
    } catch (err: any) {
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || "Sign up failed. Try again.";
      setError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally { setLoading(false); }
  }

  async function handleVerify() {
    if (!isLoaded || loading) return;
    if (!code.trim()) { setError("Enter your verification code."); return; }
    setLoading(true); setError("");

    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || "Invalid code. Try again.";
      setError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally { setLoading(false); }
  }

  return (
    <View style={styles.root}>
      <SignalBackdrop />
      <KeyboardAwareScrollViewCompat
        style={styles.scroll}
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 32 }]}
        bottomOffset={28}
          keyboardShouldPersistTaps="handled"
        >
          <Link href={step === "verify" ? null! : "/(auth)"} asChild>
            <Pressable style={styles.backBtn} onPress={() => step === "verify" ? setStep("form") : null} testID="auth-sign-up-back">
              <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.5)" />
            </Pressable>
          </Link>

          <View style={styles.header}>
             <View style={styles.logoSmall}><SignalMark size={60} /></View>
            <Text style={styles.title}>{step === "form" ? "Create account" : "Verify email"}</Text>
            <Text style={styles.subtitle}>
              {step === "form"
                ? "Join THERYN — the elite AI command center"
                : `We sent a code to ${email}`}
            </Text>
          </View>

          <View style={styles.form}>
            {error ? (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={14} color="#f87171" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {step === "form" ? (
              <>
                <View>
                  <Text style={styles.fieldLabel}>EMAIL</Text>
                  <View style={styles.inputWrap}>
                    <Feather name="mail" size={16} color="rgba(255,255,255,0.25)" style={styles.inputIcon} />
                    <TextInput style={styles.input} value={email} onChangeText={setEmail}
                      placeholder="you@example.com" placeholderTextColor="rgba(255,255,255,0.2)"
                      keyboardType="email-address" autoCapitalize="none" autoComplete="email" returnKeyType="next" />
                  </View>
                </View>
                <View>
                  <Text style={styles.fieldLabel}>PASSWORD</Text>
                  <View style={styles.inputWrap}>
                    <Feather name="lock" size={16} color="rgba(255,255,255,0.25)" style={styles.inputIcon} />
                    <TextInput style={[styles.input, { flex: 1 }]} value={password} onChangeText={setPassword}
                      placeholder="Create a password" placeholderTextColor="rgba(255,255,255,0.2)"
                      secureTextEntry={!showPw} autoComplete="new-password" returnKeyType="done"
                      onSubmitEditing={handleSignUp} />
                    <Pressable onPress={() => setShowPw(v => !v)} style={styles.eyeBtn} testID="sign-up-toggle-password" accessibilityLabel={showPw ? "Hide password" : "Show password"}>
                      <Feather name={showPw ? "eye-off" : "eye"} size={16} color="rgba(255,255,255,0.3)" />
                    </Pressable>
                  </View>
                </View>
                <Pressable onPress={handleSignUp} disabled={loading}
                  testID="sign-up-submit"
                  style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.85 }, loading && { opacity: 0.6 }]}>
                  <LinearGradient colors={["#dc2626", "#b91c1c"]} style={styles.submitGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitText}>Create Account</Text>}
                  </LinearGradient>
                </Pressable>
              </>
            ) : (
              <>
                <View>
                  <Text style={styles.fieldLabel}>VERIFICATION CODE</Text>
                  <View style={styles.inputWrap}>
                    <Feather name="shield" size={16} color="rgba(255,255,255,0.25)" style={styles.inputIcon} />
                    <TextInput style={styles.input} value={code} onChangeText={setCode}
                      placeholder="6-digit code" placeholderTextColor="rgba(255,255,255,0.2)"
                      keyboardType="number-pad" returnKeyType="done" onSubmitEditing={handleVerify} />
                  </View>
                </View>
                <Pressable onPress={handleVerify} disabled={loading}
                  testID="sign-up-verify"
                  style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.85 }, loading && { opacity: 0.6 }]}>
                  <LinearGradient colors={["#dc2626", "#b91c1c"]} style={styles.submitGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitText}>Verify & Continue</Text>}
                  </LinearGradient>
                </Pressable>
              </>
            )}
          </View>

          {step === "form" && (
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Link href="/(auth)/sign-in" asChild>
                <Pressable><Text style={styles.footerLink}>Sign in</Text></Pressable>
              </Link>
            </View>
          )}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0a0a" },
  scroll: { flex: 1 },
  container: { paddingHorizontal: 24, gap: 0, width: "100%", maxWidth: 480, alignSelf: "center" },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center", marginBottom: 32 },
  header: { alignItems: "center", gap: 10, marginBottom: 32 },
  logoSmall: { width: 60, height: 60, borderRadius: 18, overflow: "hidden" },
  logoGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
  logoLetter: { fontFamily: "Inter_700Bold", fontSize: 26, color: "#fff" },
  title: { fontFamily: "Inter_700Bold", fontSize: 26, color: "#fff" },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 14, color: "rgba(255,255,255,0.35)", textAlign: "center" },
  form: { gap: 16, backgroundColor: "rgba(255,255,255,0.025)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", borderRadius: 24, padding: 18 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, backgroundColor: "rgba(239,68,68,0.08)", borderWidth: 1, borderColor: "rgba(239,68,68,0.2)" },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 12, color: "#f87171", flex: 1, lineHeight: 17 },
  fieldLabel: { fontFamily: "Inter_600SemiBold", fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: 1.5, marginBottom: 8 },
  inputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#141414", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", paddingHorizontal: 14, paddingVertical: 14 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15, color: "#fff" },
  eyeBtn: { padding: 4 },
  submitBtn: { borderRadius: 16, overflow: "hidden", marginTop: 8 },
  submitGrad: { paddingVertical: 18, alignItems: "center", justifyContent: "center" },
  submitText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 24 },
  footerText: { fontFamily: "Inter_400Regular", fontSize: 14, color: "rgba(255,255,255,0.4)" },
  footerLink: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#dc2626" },
});
