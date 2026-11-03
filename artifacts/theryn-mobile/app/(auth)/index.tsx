import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SignalBackdrop } from "@/components/SignalBackdrop";
import { SignalMark } from "@/components/SignalMark";

const { width, height } = Dimensions.get("window");

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();

  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, damping: 12, mass: 0.8, stiffness: 100, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 1, duration: 800, delay: 200, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(contentY, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <SignalBackdrop />
      <LinearGradient
        colors={["#000000", "#111111", "#000000"]}
        style={StyleSheet.absoluteFill}
        locations={[0, 0.5, 1]}
      />

      {/* Background glow */}
      <Animated.View style={[styles.bgGlow, { opacity: glowOpacity }]} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Compact brand bar */}
        <View style={[styles.topBar, { paddingTop: insets.top + 18 }]}>
          <View style={styles.topBrand}>
             <View style={styles.topBrandMark}><SignalMark size={26} /></View>
            <Text style={styles.topBrandName}>THERYN</Text>
          </View>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>PRIVATE AI</Text>
          </View>
        </View>

        {/* Focused mobile hero */}
        <View style={[styles.logoSection, { paddingTop: 84 }]}>
          <Animated.View style={{ transform: [{ scale: logoScale }], opacity: logoOpacity }}>
             <Animated.View style={[styles.logoOuter, { transform: [{ scale: pulseAnim }] }]}>
              <LinearGradient
                colors={["rgba(255,255,255,0.12)", "rgba(255,255,255,0.015)"]}
                style={styles.logoGlow}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.logoInner}>
                   <SignalMark size={76} />
                </View>
              </LinearGradient>
            </Animated.View>
          </Animated.View>

          <Animated.View style={[styles.logoText, { opacity: logoOpacity }]}>
            <Text style={styles.heroTitle}>Your ideas,{"\n"}with more range.</Text>
            <Text style={styles.heroSub}>One calm workspace for conversation, creation, and the next thing you build.</Text>
          </Animated.View>
        </View>

        {/* Middle — capability panel */}
        <Animated.View style={[styles.features, { opacity: 1 }]}>
          <Text style={styles.featureKicker}>YOUR TOOLKIT</Text>
          {[
            { icon: "message-circle", label: "Three AI engines", sub: "GPT, Claude & Grok" },
            { icon: "image", label: "Create visuals", sub: "Generate images in seconds" },
            { icon: "mic", label: "Use your voice", sub: "Talk, listen, and move faster" },
          ].map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Feather name={f.icon as any} size={16} color="#e5e5e5" />
              </View>
              <View>
                <Text style={styles.featureLabel}>{f.label}</Text>
                <Text style={styles.featureSub}>{f.sub}</Text>
              </View>
            </View>
          ))}
        </Animated.View>

        {/* Bottom — CTAs */}
        <Animated.View
          style={[
            styles.ctas,
            { opacity: 1, paddingBottom: insets.bottom + (Platform.OS === "web" ? 40 : 20) },
          ]}
        >
          <Link href="/(auth)/sign-up" asChild>
            <Pressable
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
            >
              <LinearGradient
                colors={["#ffffff", "#777777"]}
                style={styles.primaryBtnGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.primaryBtnText}>Get Started</Text>
                <Feather name="arrow-right" size={18} color="#000000" />
              </LinearGradient>
            </Pressable>
          </Link>

          <Link href="/(auth)/sign-in" asChild>
            <Pressable
              onPress={() => Haptics.selectionAsync()}
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryBtnText}>I already have an account</Text>
            </Pressable>
          </Link>

          <Text style={styles.legalText}>
            By continuing you agree to our Terms of Service and Privacy Policy
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0a0a" },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24 },
  topBrand: { flexDirection: "row", alignItems: "center", gap: 9 },
  topBrandMark: { width: 26, height: 26, borderRadius: 8, backgroundColor: "#171717", alignItems: "center", justifyContent: "center" },
  topBrandLetter: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#fff" },
  topBrandName: { fontFamily: "Inter_700Bold", fontSize: 13, color: "#fff", letterSpacing: 2.4 },
  livePill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#e5e5e5" },
  liveText: { fontFamily: "Inter_600SemiBold", fontSize: 8, color: "rgba(255,255,255,0.42)", letterSpacing: 1 },
  bgGlow: {
    position: "absolute",
    top: "20%",
    left: "50%",
    marginLeft: -150,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(255,255,255,0.07)",
    transform: [{ scaleX: 2 }],
  },
  logoSection: {
    flex: 0,
    flexGrow: 0,
    flexShrink: 0,
    marginTop: 8,
    marginBottom: 92,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    paddingBottom: 22,
  },
  logoOuter: {
    width: 104,
    height: 104,
    alignItems: "center",
    justifyContent: "center",
  },
  logoGlow: {
    position: "absolute",
    width: 104,
    height: 104,
    borderRadius: 30,
  },
  logoInner: {
    width: 76,
    height: 76,
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#ffffff",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  logoBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoLetter: {
    fontFamily: "Inter_700Bold",
    fontSize: 38,
    color: "#000000",
    letterSpacing: 2,
  },
  logoText: { alignItems: "center", gap: 10, paddingHorizontal: 26 },
  heroTitle: { fontFamily: "Inter_700Bold", fontSize: 29, lineHeight: 34, color: "#fff", textAlign: "center", letterSpacing: -0.4 },
  heroSub: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20, color: "rgba(255,255,255,0.42)", textAlign: "center", maxWidth: 320 },
  brandName: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
    color: "#fff",
    letterSpacing: 8,
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tagDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#f5f5f5",
  },
  tagline: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 3,
  },
  features: {
    marginHorizontal: 20,
    gap: 11,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.035)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  featureKicker: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    color: "rgba(255,255,255,0.28)",
    letterSpacing: 1.6,
    marginBottom: 2,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
  },
  featureSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
    marginTop: 1,
  },
  ctas: {
    paddingHorizontal: 24,
    paddingTop: 28,
    gap: 14,
  },
  primaryBtn: { borderRadius: 16, overflow: "hidden" },
  primaryBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  primaryBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#fff",
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
  },
  secondaryBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: "rgba(255,255,255,0.55)",
  },
  legalText: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: "rgba(255,255,255,0.2)",
    textAlign: "center",
    lineHeight: 15,
    paddingHorizontal: 16,
  },
  pressed: { opacity: 0.8 },
});
