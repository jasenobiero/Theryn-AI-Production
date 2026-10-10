import { Feather } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { SignalBackdrop } from "@/components/SignalBackdrop";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

const TAB_HEIGHT = Platform.OS === "web" ? 84 : 83;

const VOICES = [
  { id: "rachel", name: "Rachel", desc: "Warm & natural" },
  { id: "adam",   name: "Adam",   desc: "Deep & authoritative" },
  { id: "bella",  name: "Bella",  desc: "Soft & calm" },
];

const PRESETS = [
  "Welcome to THERYN — your elite AI command center.",
  "Ask me anything. I process knowledge across every domain.",
  "The future of artificial intelligence is multi-model and always on.",
];

export default function VoiceScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [text, setText] = useState("");
  const [voice, setVoice] = useState("rachel");
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const pulse = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (playing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.12, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start();
      Animated.loop(
        Animated.timing(waveAnim, { toValue: 1, duration: 1500, easing: Easing.linear, useNativeDriver: false })
      ).start();
    } else {
      pulse.stopAnimation();
      waveAnim.stopAnimation();
      pulse.setValue(1);
      waveAnim.setValue(0);
    }
  }, [playing]);

  async function synthesize() {
    const t = text.trim();
    if (!t || loading) return;
    setLoading(true);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const res = await fetch(`${API_BASE}/api/elevenlabs/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t, voiceId: voice }),
      });
      const data = await res.json() as { audio_base64?: string; error?: string };
      if (data.error) throw new Error(data.error);
      if (!data.audio_base64) throw new Error("No audio returned");

      if (soundRef.current) await soundRef.current.unloadAsync();

      const { sound } = await Audio.Sound.createAsync(
        { uri: `data:audio/mpeg;base64,${data.audio_base64}` }
      );
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate(s => {
        if (!s.isLoaded) return;
        setPlaying(!!s.isPlaying);
        if (s.didJustFinish) setPlaying(false);
      });
      await sound.playAsync();
      setPlaying(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "TTS failed");
    } finally {
      setLoading(false);
    }
  }

  async function stopPlayback() {
    if (soundRef.current) { await soundRef.current.stopAsync(); setPlaying(false); }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <SignalBackdrop />
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
        <View>
          <Text style={styles.kicker}>THERYN / AUDIO</Text>
          <Text style={styles.title}>Voice TTS</Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>ElevenLabs</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: TAB_HEIGHT + insets.bottom + (Platform.OS === "web" ? 34 : 8) + 16 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Visualizer + play button */}
        <View style={styles.visualizerCard}>
          <View style={styles.bars}>
            {Array.from({ length: 24 }).map((_, i) => {
              const h = playing
                ? 8 + Math.abs(Math.sin((i / 24) * Math.PI * 3)) * 36
                : 4 + Math.abs(Math.sin((i / 24) * Math.PI)) * 10;
              return (
                <View
                  key={i}
                  style={[
                    styles.bar,
                    {
                      height: h,
                      backgroundColor: playing
                        ? `rgba(220,38,38,${0.3 + Math.abs(Math.sin((i / 24) * Math.PI * 2)) * 0.7})`
                        : "rgba(255,255,255,0.08)",
                    },
                  ]}
                />
              );
            })}
          </View>

          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <Pressable
              onPress={playing ? stopPlayback : synthesize}
              disabled={(!text.trim() && !playing) || loading}
              style={({ pressed }) => [pressed && { opacity: 0.8 }]}
            >
              <LinearGradient
                colors={playing ? ["#7f1d1d", "#991b1b"] : ["#dc2626", "#b91c1c"]}
                style={styles.playBtn}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                {loading
                  ? <ActivityIndicator size="large" color="#fff" />
                  : <Feather name={playing ? "square" : "play"} size={26} color="#fff" />}
              </LinearGradient>
            </Pressable>
          </Animated.View>

          <Text style={styles.vizLabel}>{playing ? "Playing..." : loading ? "Synthesizing..." : "Tap play to speak"}</Text>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={14} color="#f87171" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Voice selector */}
        <Text style={styles.sectionLabel}>VOICE</Text>
        <View style={styles.voiceRow}>
          {VOICES.map(v => (
            <Pressable
              key={v.id}
              onPress={() => { setVoice(v.id); Haptics.selectionAsync(); }}
              style={[
                styles.voiceChip,
                v.id === voice && { borderColor: "#dc2626", backgroundColor: "rgba(220,38,38,0.1)" },
              ]}
            >
              <Text style={[styles.voiceName, v.id === voice && { color: "#fff" }]}>{v.name}</Text>
              <Text style={styles.voiceDesc}>{v.desc}</Text>
            </Pressable>
          ))}
        </View>

        {/* Text input */}
        <Text style={styles.sectionLabel}>SCRIPT</Text>
        <View style={styles.textCard}>
          <TextInput
            style={styles.textInput}
            value={text}
            onChangeText={setText}
            placeholder="Type something to synthesize..."
            placeholderTextColor="rgba(255,255,255,0.18)"
            multiline
            maxLength={5000}
          />
          <Pressable
            onPress={synthesize}
            disabled={!text.trim() || loading || playing}
            style={({ pressed }) => [
              styles.synthBtn,
              (!text.trim() || loading || playing) && { opacity: 0.4 },
              pressed && { opacity: 0.75 },
            ]}
          >
            <LinearGradient colors={["#dc2626", "#b91c1c"]} style={styles.synthBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Feather name="volume-2" size={14} color="#fff" />
              <Text style={styles.synthBtnText}>Speak</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Presets */}
        <Text style={styles.sectionLabel}>QUICK PHRASES</Text>
        {PRESETS.map((p, i) => (
          <Pressable key={i} onPress={() => { setText(p); Haptics.selectionAsync(); }}
            style={({ pressed }) => [styles.preset, pressed && { opacity: 0.7 }]}>
            <Feather name="chevron-right" size={13} color="rgba(220,38,38,0.7)" />
            <Text style={styles.presetText}>{p}</Text>
          </Pressable>
        ))}

        <View style={styles.note}>
          <Feather name="info" size={13} color="rgba(255,255,255,0.2)" />
          <Text style={styles.noteText}>Requires ELEVENLABS_API_KEY on the server to generate audio.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)",
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 20, color: "#fff" },
  kicker: { fontFamily: "Inter_600SemiBold", fontSize: 9, color: "rgba(224,59,59,0.8)", letterSpacing: 1.6, marginBottom: 3 },
  headerBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, backgroundColor: "rgba(168,85,247,0.15)",
    borderWidth: 1, borderColor: "rgba(168,85,247,0.2)",
  },
  headerBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 9, color: "#a855f7", letterSpacing: 1 },
  scroll: { padding: 16, gap: 12 },
  visualizerCard: {
    backgroundColor: "#111",
    borderRadius: 20,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
    padding: 24,
    alignItems: "center", gap: 20,
    marginBottom: 4,
  },
  bars: { flexDirection: "row", alignItems: "center", gap: 3, height: 60 },
  bar: { width: 3, borderRadius: 1.5 },
  playBtn: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#dc2626", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 12,
  },
  vizLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.3)" },
  errorBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 12, backgroundColor: "rgba(239,68,68,0.08)", borderWidth: 1, borderColor: "rgba(239,68,68,0.2)" },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 12, color: "#f87171", flex: 1, lineHeight: 17 },
  sectionLabel: { fontFamily: "Inter_600SemiBold", fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: 1.5, marginTop: 4 },
  voiceRow: { flexDirection: "row", gap: 8 },
  voiceChip: {
    flex: 1, padding: 12, borderRadius: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.07)",
    backgroundColor: "rgba(255,255,255,0.02)",
    alignItems: "center", gap: 2,
  },
  voiceName: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "rgba(255,255,255,0.4)" },
  voiceDesc: { fontFamily: "Inter_400Regular", fontSize: 10, color: "rgba(255,255,255,0.2)" },
  textCard: {
    backgroundColor: "#131313",
    borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)",
    padding: 16, gap: 12,
  },
  textInput: { fontFamily: "Inter_400Regular", fontSize: 14, color: "#fff", minHeight: 80, lineHeight: 22 },
  synthBtn: { borderRadius: 12, overflow: "hidden", alignSelf: "flex-end" },
  synthBtnGrad: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10 },
  synthBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },
  preset: { flexDirection: "row", alignItems: "center", gap: 10, padding: 13, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.02)", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  presetText: { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.5)", flex: 1 },
  note: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.02)", borderWidth: 1, borderColor: "rgba(255,255,255,0.04)", marginTop: 4 },
  noteText: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.2)", flex: 1, lineHeight: 16 },
});
