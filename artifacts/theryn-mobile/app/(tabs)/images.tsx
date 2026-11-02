import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { SignalBackdrop } from "@/components/SignalBackdrop";
import { useTabScreenTransition } from "@/hooks/useTabScreenTransition";

interface GeneratedImage {
  id: string;
  prompt: string;
  b64: string;
}

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

const TAB_HEIGHT = Platform.OS === "web" ? 84 : 83;

const SUGGESTIONS = [
  "A glowing red circuit board in dark space",
  "Cyberpunk cityscape at midnight, neon lights",
  "Abstract AI neural network visualization",
  "A futuristic robot in a minimalist studio",
];

export default function ImagesScreen() {
  const transitionStyle = useTabScreenTransition();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    const text = prompt.trim();
    if (!text || loading) return;
    setLoading(true);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const res = await fetch(`${API_BASE}/api/openai/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      const data = await res.json() as { b64_json?: string; error?: string };
      if (data.error) throw new Error(data.error);
      if (!data.b64_json) throw new Error("No image returned");

      setImages(prev => [{ id: Date.now().toString(), prompt: text, b64: data.b64_json! }, ...prev]);
      setPrompt("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Animated.View style={[styles.root, { backgroundColor: colors.background }, transitionStyle]}>
      <SignalBackdrop />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
        <View style={styles.headerLeft}>
          <View>
            <Text style={styles.kicker}>THERYN / VISUALS</Text>
            <Text style={styles.title}>Image Gen</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>DALL-E</Text>
          </View>
        </View>
        <Text style={styles.headerSub}>Powered by THERYN</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: TAB_HEIGHT + insets.bottom + (Platform.OS === "web" ? 34 : 8) + 16 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Prompt box */}
        <View style={styles.promptCard}>
          <TextInput
            style={styles.promptInput}
            value={prompt}
            onChangeText={setPrompt}
            placeholder="Describe your image in detail..."
            placeholderTextColor="rgba(255,255,255,0.18)"
            multiline
            maxLength={1000}
          />
          <View style={styles.promptActions}>
            {prompt.trim() ? (
              <Pressable onPress={() => setPrompt("")} style={styles.clearBtn}>
                <Feather name="x" size={14} color="rgba(255,255,255,0.3)" />
              </Pressable>
            ) : null}
            <Pressable
              onPress={generate}
              disabled={!prompt.trim() || loading}
              style={({ pressed }) => [
                styles.genBtn,
                (!prompt.trim() || loading) && { opacity: 0.4 },
                pressed && { opacity: 0.75 },
              ]}
            >
              <LinearGradient
                colors={["#38d9ff", "#168ca8"]}
                style={styles.genBtnGrad}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                {loading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <><Feather name="zap" size={14} color="#fff" /><Text style={styles.genBtnText}>Generate</Text></>}
              </LinearGradient>
            </Pressable>
          </View>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={14} color="#f87171" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Suggestions */}
        {images.length === 0 && !loading && (
          <>
            <Text style={styles.sectionLabel}>TRY THESE</Text>
            {SUGGESTIONS.map((s, i) => (
              <Pressable
                key={i}
                onPress={() => { setPrompt(s); Haptics.selectionAsync(); }}
                style={({ pressed }) => [styles.suggestion, pressed && { opacity: 0.7 }]}
              >
                <Feather name="chevron-right" size={13} color="rgba(56,217,255,0.8)" />
                <Text style={styles.suggestionText}>{s}</Text>
              </Pressable>
            ))}
          </>
        )}

        {/* Gallery */}
        {images.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>GENERATED</Text>
            {images.map(img => (
              <View key={img.id} style={styles.imageCard}>
                <Image
                  source={{ uri: `data:image/png;base64,${img.b64}` }}
                  style={styles.image}
                  contentFit="cover"
                  transition={300}
                />
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.7)"]}
                  style={styles.imageOverlay}
                >
                  <Text style={styles.imageCaption} numberOfLines={2}>{img.prompt}</Text>
                </LinearGradient>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontFamily: "Inter_700Bold", fontSize: 20, color: "#fff" },
  kicker: { fontFamily: "Inter_600SemiBold", fontSize: 9, color: "rgba(154,239,255,0.8)", letterSpacing: 1.6, marginBottom: 3 },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, backgroundColor: "rgba(56,217,255,0.12)",
    borderWidth: 1, borderColor: "rgba(56,217,255,0.24)",
  },
  badgeText: { fontFamily: "Inter_600SemiBold", fontSize: 9, color: "#9aefff", letterSpacing: 1 },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.25)" },
  scroll: { padding: 16, gap: 12 },
  promptCard: {
    backgroundColor: "#131313",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    padding: 16,
    gap: 12,
  },
  promptInput: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "#fff",
    minHeight: 80,
    lineHeight: 22,
  },
  promptActions: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8 },
  clearBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center", justifyContent: "center",
  },
  genBtn: { borderRadius: 12, overflow: "hidden" },
  genBtnGrad: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  genBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 12, borderRadius: 12,
    backgroundColor: "rgba(239,68,68,0.08)",
    borderWidth: 1, borderColor: "rgba(239,68,68,0.2)",
  },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 12, color: "#f87171", flex: 1 },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold", fontSize: 9,
    color: "rgba(255,255,255,0.2)", letterSpacing: 1.5,
    marginTop: 4,
  },
  suggestion: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 14, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.05)",
  },
  suggestionText: {
    fontFamily: "Inter_400Regular", fontSize: 13,
    color: "rgba(255,255,255,0.5)", flex: 1,
  },
  imageCard: {
    borderRadius: 18, overflow: "hidden",
    backgroundColor: "#151515",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  image: { width: "100%", aspectRatio: 1 },
  imageOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    padding: 14, paddingTop: 24,
  },
  imageCaption: {
    fontFamily: "Inter_400Regular", fontSize: 12,
    color: "rgba(255,255,255,0.7)", lineHeight: 17,
  },
});
