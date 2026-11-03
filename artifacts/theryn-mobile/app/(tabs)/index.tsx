import { useUser } from "@clerk/clerk-expo";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { fetch as expoFetch } from "expo/fetch";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { SignalBackdrop } from "@/components/SignalBackdrop";
import { SignalMark } from "@/components/SignalMark";
import { useTabScreenTransition } from "@/hooks/useTabScreenTransition";

type Provider = "openai" | "anthropic" | "openrouter";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

const PROVIDERS: { id: Provider; name: string; model: string; color: string; dot: string }[] = [
  { id: "openai",     name: "Theryn",  model: "GPT-5",    color: "#e5e5e5", dot: "#e5e5e5" },
  { id: "anthropic",  name: "Vesper",  model: "Claude",   color: "#c4c4c4", dot: "#c4c4c4" },
  { id: "openrouter", name: "Prism",   model: "Grok 4.3", color: "#a3a3a3", dot: "#a3a3a3" },
];

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

const TAB_HEIGHT = Platform.OS === "web" ? 84 : 83;
const QUICK_PROMPTS = [
  { label: "Plan a project", icon: "clipboard" },
  { label: "Write something", icon: "edit-3" },
  { label: "Explore an idea", icon: "compass" },
] as const;

export default function ChatScreen() {
  const transitionStyle = useTabScreenTransition();
  const { user } = useUser();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [provider, setProvider] = useState<Provider>("openai");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [convId, setConvId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [recent, setRecent] = useState<{ id: number; title: string }[]>([]);
  const flatRef = useRef<FlatList>(null);
  const p = PROVIDERS.find(x => x.id === provider)!;

  const switchProvider = (id: Provider) => {
    Haptics.selectionAsync();
    setProvider(id);
    setMessages([]);
    setConvId(null);
  };

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const uid = Date.now().toString();
    const aid = (Date.now() + 1).toString();
    setMessages(prev => [
      { id: aid, role: "assistant", content: "", streaming: true },
      { id: uid, role: "user", content: text },
      ...prev,
    ]);

    try {
      let cid = convId;
      if (!cid) {
        const r = await expoFetch(`${API_BASE}/api/${provider}/conversations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: text.slice(0, 50) }),
        });
        const d = await r.json() as { id: number };
        cid = d.id;
        setConvId(d.id);
        setRecent(prev => [{ id: d.id, title: text.slice(0, 42) }, ...prev.filter(item => item.id !== d.id)]);
      }

      const res = await expoFetch(
        `${API_BASE}/api/${provider}/conversations/${cid}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text }),
        }
      );

      if (!res.body) throw new Error("No stream");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6)) as { content?: string };
            if (parsed.content) {
              acc += parsed.content;
              const snap = acc;
              setMessages(prev => prev.map(m => m.id === aid ? { ...m, content: snap } : m));
            }
          } catch { /* skip */ }
        }
      }
      setMessages(prev => prev.map(m => m.id === aid ? { ...m, streaming: false } : m));
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === aid ? { ...m, content: "Something went wrong. Please try again.", streaming: false } : m
      ));
    } finally {
      setLoading(false);
    }
  }, [input, loading, provider, convId]);

  const openConversation = useCallback(async (id: number) => {
    setHistoryOpen(false);
    setLoading(true);
    try {
      const res = await expoFetch(`${API_BASE}/api/${provider}/conversations/${id}`);
      const data = await res.json() as { messages?: { id: number | string; role: string; content: string }[] };
      setConvId(id);
      setMessages((data.messages ?? []).reverse().map(m => ({
        id: String(m.id), role: m.role === "user" ? "user" : "assistant", content: m.content,
      })));
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [provider]);

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAI]}>
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: p.color + "20", borderColor: p.color + "40" }]}>
            <View style={[styles.avatarDot, { backgroundColor: p.color }]} />
          </View>
        )}
        <View style={[
          styles.bubble,
          isUser ? styles.userBubble : [styles.aiBubble, { borderColor: p.color + "18" }],
        ]}>
          {isUser ? (
            <LinearGradient colors={["#3f3f3f", "#222222"]} style={styles.userGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={styles.userText}>{item.content}</Text>
            </LinearGradient>
          ) : (
            <View style={styles.aiContent}>
              {item.content ? (
                <Text style={styles.aiText}>{item.content}</Text>
              ) : item.streaming ? (
                <View style={styles.typing}>
                  {[0, 1, 2].map(i => (
                    <View key={i} style={[styles.typingDot, { backgroundColor: p.color, opacity: 0.4 + i * 0.3 }]} />
                  ))}
                </View>
              ) : null}
            </View>
          )}
        </View>
      </View>
    );
  };

  const firstName = user?.firstName ?? "there";

  return (
    <Animated.View style={[styles.root, { backgroundColor: colors.background }, transitionStyle]}>
      <SignalBackdrop />
      {/* Compact, touch-first workspace header */}
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
        <Pressable onPress={() => setHistoryOpen(true)} style={styles.menuBtn} accessibilityLabel="Open conversations">
          <Feather name="menu" size={19} color="rgba(255,255,255,0.7)" />
        </Pressable>
        <View style={styles.brandGroup}>
           <View style={styles.headerMark}><SignalMark size={30} /></View>
          <View style={styles.greetingWrap}>
            <Text style={styles.kicker}>THERYN</Text>
            <Text style={styles.headerMode}>AI workspace</Text>
          </View>
        </View>
        <Pressable
          onPress={() => Haptics.selectionAsync()}
          style={[styles.providerBadge, { backgroundColor: p.color + "18", borderColor: p.color + "30" }]}
          accessibilityLabel={`Current engine ${p.name}`}
        >
          <View style={[styles.badgeDot, { backgroundColor: p.color }]} />
          <Text style={[styles.badgeText, { color: p.color }]}>{p.name}</Text>
          <Feather name="chevron-down" size={13} color={p.color} />
        </Pressable>
      </View>

      {/* Engine switcher */}
      <View style={styles.providerRow}>
        <Text style={styles.engineLabel}>ENGINE</Text>
        {PROVIDERS.map(pr => (
          <Pressable
            key={pr.id}
            onPress={() => switchProvider(pr.id)}
            style={({ pressed }) => [
              styles.providerChip,
              pr.id === provider && { borderColor: pr.color, backgroundColor: pr.color + "15" },
              pressed && { opacity: 0.7 },
            ]}
          >
            <View style={[styles.chipDot, { backgroundColor: pr.color }]} />
            <View>
              <Text style={[styles.chipName, pr.id === provider && { color: "#fff" }]}>{pr.name}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Messages */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <FlatList
          ref={flatRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={m => m.id}
          inverted
          contentContainerStyle={[
            styles.list,
            { paddingBottom: TAB_HEIGHT + insets.bottom + (Platform.OS === "web" ? 34 : 8) + 72 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { borderColor: p.color + "45", backgroundColor: p.color + "12" }]}>
                 <View style={styles.emptyIconCore}><SignalMark size={46} /></View>
              </View>
              <Text style={styles.emptyKicker}>READY WHEN YOU ARE</Text>
              <Text style={styles.emptyTitle}>What are we working on, {firstName}?</Text>
              <Text style={styles.emptySub}>Ask {p.name} anything. Your ideas start here.</Text>
              <View style={styles.quickPromptGrid}>
                {QUICK_PROMPTS.map((prompt) => (
                  <Pressable
                    key={prompt.label}
                    onPress={() => { setInput(prompt.label + " "); Haptics.selectionAsync(); }}
                    style={({ pressed }) => [styles.quickPrompt, pressed && { opacity: 0.7 }]}
                  >
                    <Feather name={prompt.icon as any} size={14} color={p.color} />
                    <Text style={styles.quickPromptText}>{prompt.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          }
        />

        {/* Input */}
        <View style={[
          styles.inputBar,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 8) + TAB_HEIGHT },
        ]}>
          <View style={styles.composerMeta}>
            <Text style={styles.composerHint}>NEW SESSION</Text>
            <Text style={styles.composerModel}>{p.model}</Text>
          </View>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={`Ask ${p.name}...`}
              placeholderTextColor="rgba(255,255,255,0.18)"
              multiline
              maxLength={4000}
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={Platform.OS === "web" ? sendMessage : undefined}
            />
            <Pressable
              onPress={sendMessage}
              disabled={!input.trim() || loading}
              style={({ pressed }) => [
                styles.sendBtn,
                { backgroundColor: p.color },
                (!input.trim() || loading) && styles.sendDisabled,
                pressed && { opacity: 0.75 },
              ]}
            >
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Feather name="arrow-up" size={16} color="#fff" />}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={historyOpen} transparent animationType="slide" onRequestClose={() => setHistoryOpen(false)}>
        <View style={styles.sheetBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setHistoryOpen(false)} />
          <View style={[styles.historySheet, { paddingBottom: insets.bottom + 18 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetTitleRow}>
              <View>
                <Text style={styles.sheetKicker}>WORKSPACE</Text>
                <Text style={styles.sheetTitle}>Conversations</Text>
              </View>
              <Pressable onPress={() => setHistoryOpen(false)} style={styles.closeBtn} accessibilityLabel="Close conversations">
                <Feather name="x" size={18} color="rgba(255,255,255,0.65)" />
              </Pressable>
            </View>
            <Pressable onPress={() => { setConvId(null); setMessages([]); setHistoryOpen(false); }} style={styles.newSession}>
              <View style={styles.newSessionIcon}><Feather name="plus" size={17} color="#fff" /></View>
              <View><Text style={styles.newSessionTitle}>New session</Text><Text style={styles.newSessionSub}>Start with a clean context</Text></View>
            </Pressable>
            <Text style={styles.historyLabel}>RECENT</Text>
            {recent.length === 0 ? (
              <View style={styles.historyEmpty}><Feather name="inbox" size={18} color="rgba(255,255,255,0.2)" /><Text style={styles.historyEmptyText}>Your new conversations will appear here.</Text></View>
            ) : recent.map(item => (
              <Pressable key={item.id} onPress={() => openConversation(item.id)} style={[styles.historyItem, convId === item.id && styles.historyItemActive]}>
                <Feather name="message-square" size={15} color={convId === item.id ? "#ffffff" : "rgba(255,255,255,0.28)"} />
                <Text numberOfLines={1} style={styles.historyItemText}>{item.title}</Text>
                <Feather name="chevron-right" size={14} color="rgba(255,255,255,0.16)" />
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  menuBtn: { width: 38, height: 38, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center", marginRight: 10 },
  brandGroup: { flex: 1, flexDirection: "row", alignItems: "center", gap: 9 },
  headerMark: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  headerMarkText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },
  greetingWrap: { flex: 1 },
  kicker: { fontFamily: "Inter_700Bold", fontSize: 11, color: "#fff", letterSpacing: 1.8 },
  headerMode: { fontFamily: "Inter_400Regular", fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: "#0a0a0a",
  },
  providerBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14, borderWidth: 1,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.025)",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  engineLabel: { fontFamily: "Inter_600SemiBold", fontSize: 8, color: "rgba(255,255,255,0.24)", letterSpacing: 1.2, marginRight: 2 },
  providerChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  chipDot: { width: 7, height: 7, borderRadius: 3.5 },
  chipName: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "rgba(255,255,255,0.45)" },
  chipModel: { display: "none" },
  list: { paddingHorizontal: 16, paddingTop: 12 },
  msgRow: { marginBottom: 12, flexDirection: "row", alignItems: "flex-end", gap: 8 },
  msgRowUser: { justifyContent: "flex-end" },
  msgRowAI: { justifyContent: "flex-start" },
  avatar: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, flexShrink: 0,
  },
  avatarDot: { width: 8, height: 8, borderRadius: 4 },
  bubble: { maxWidth: "80%", borderRadius: 20 },
  userBubble: { borderBottomRightRadius: 4, overflow: "hidden" },
  aiBubble: {
    backgroundColor: "#181818",
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  userGrad: { paddingHorizontal: 14, paddingVertical: 10 },
  userText: { fontFamily: "Inter_400Regular", fontSize: 14, color: "#fff", lineHeight: 20 },
  aiContent: { paddingHorizontal: 14, paddingVertical: 10 },
  aiText: { fontFamily: "Inter_400Regular", fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 21 },
  typing: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4 },
  typingDot: { width: 7, height: 7, borderRadius: 3.5 },
  empty: {
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 74,
    gap: 9,
    transform: [{ scaleY: -1 }],
  },
  emptyIcon: {
    width: 76, height: 76, borderRadius: 26,
    borderWidth: 1,
    alignItems: "center", justifyContent: "center",
    marginBottom: 8,
  },
  emptyIconCore: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  emptyIconLetter: { fontFamily: "Inter_700Bold", fontSize: 22, color: "#fff" },
  emptyKicker: { fontFamily: "Inter_600SemiBold", fontSize: 9, color: "rgba(255,255,255,0.78)", letterSpacing: 1.6 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: "#fff", textAlign: "center", lineHeight: 29, marginTop: 2 },
  emptySub: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.38)", textAlign: "center" },
  quickPromptGrid: { width: "100%", gap: 8, marginTop: 14 },
  quickPrompt: { flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 13, paddingVertical: 11, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.045)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  quickPromptText: { fontFamily: "Inter_500Medium", fontSize: 12, color: "rgba(255,255,255,0.68)" },
  inputBar: {
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: "#0a0a0a",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
  },
  composerMeta: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 7, paddingBottom: 7 },
  composerHint: { fontFamily: "Inter_600SemiBold", fontSize: 8, color: "rgba(255,255,255,0.24)", letterSpacing: 1.4 },
  composerModel: { fontFamily: "Inter_400Regular", fontSize: 9, color: "rgba(255,255,255,0.28)" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    backgroundColor: "#171515",
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "#fff",
    maxHeight: 120,
    paddingVertical: 4,
  },
  sendBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  sendDisabled: { opacity: 0.3 },
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.68)", justifyContent: "flex-end" },
  historySheet: { backgroundColor: "#151313", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 18, paddingTop: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.18)", alignSelf: "center", marginBottom: 18 },
  sheetTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  sheetKicker: { fontFamily: "Inter_600SemiBold", fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 1.5 },
  sheetTitle: { fontFamily: "Inter_700Bold", fontSize: 24, color: "#fff", marginTop: 3 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  newSession: { flexDirection: "row", alignItems: "center", gap: 12, padding: 13, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", marginBottom: 20 },
  newSessionIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: "#333333", alignItems: "center", justifyContent: "center" },
  newSessionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
  newSessionSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 },
  historyLabel: { fontFamily: "Inter_600SemiBold", fontSize: 9, color: "rgba(255,255,255,0.24)", letterSpacing: 1.5, marginBottom: 8 },
  historyItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 13, borderRadius: 13, marginBottom: 5 },
  historyItemActive: { backgroundColor: "rgba(255,255,255,0.07)" },
  historyItemText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.7)" },
  historyEmpty: { alignItems: "center", gap: 9, paddingVertical: 25 },
  historyEmptyText: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center" },
});
