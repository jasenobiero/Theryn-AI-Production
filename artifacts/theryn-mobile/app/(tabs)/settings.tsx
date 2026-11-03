import { useAuth, useUser } from "@clerk/clerk-expo";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useColors } from "@/hooks/useColors";
import { SignalBackdrop } from "@/components/SignalBackdrop";
import { SignalMark } from "@/components/SignalMark";
import { useTabScreenTransition } from "@/hooks/useTabScreenTransition";

type Settings = {
  displayName: string | null;
  bio: string | null;
  elevenlabsApiKey: string | null;
  openaiApiKey: string | null;
  anthropicApiKey: string | null;
  openrouterApiKey: string | null;
  defaultProvider: string | null;
  defaultModel: string | null;
  streamingEnabled: string | null;
};

type KeyField = {
  key: keyof Pick<Settings, "elevenlabsApiKey" | "openaiApiKey" | "anthropicApiKey" | "openrouterApiKey">;
  label: string;
  detail: string;
  placeholder: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
};

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "";
const TAB_HEIGHT = Platform.OS === "web" ? 84 : 83;
const KEY_FIELDS: KeyField[] = [
  { key: "openaiApiKey", label: "Theryn", detail: "OpenAI engine", placeholder: "sk-••••••••", icon: "cpu", color: "#e5e5e5" },
  { key: "anthropicApiKey", label: "Vesper", detail: "Anthropic engine", placeholder: "sk-ant-••••", icon: "zap", color: "#c4c4c4" },
  { key: "openrouterApiKey", label: "Prism", detail: "OpenRouter engine", placeholder: "sk-or-v1-••••", icon: "layers", color: "#a3a3a3" },
  { key: "elevenlabsApiKey", label: "Voice", detail: "ElevenLabs synthesis", placeholder: "el_••••••••", icon: "mic", color: "#808080" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  onPress,
  color,
  right,
  testID,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  color?: string;
  right?: React.ReactNode;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      testID={testID}
      style={({ pressed }) => [styles.row, pressed && onPress && styles.pressed]}
    >
      <View style={[styles.rowIcon, color ? { backgroundColor: `${color}20` } : null]}>
        <Feather name={icon} size={15} color={color ?? "rgba(255,255,255,0.46)"} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowFill} />
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {right}
      {onPress && !right ? <Feather name="chevron-right" size={15} color="rgba(255,255,255,0.2)" /> : null}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const transitionStyle = useTabScreenTransition();
  const { signOut, getToken } = useAuth();
  const { user } = useUser();
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [keyEditor, setKeyEditor] = useState<string | null>(null);
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [keyVisible, setKeyVisible] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean } | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  React.useEffect(() => {
    let alive = true;
    async function loadSettings() {
      try {
        const token = await getToken();
        const response = await fetch(`${API_BASE}/api/settings`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!response.ok) throw new Error("Unable to load settings");
        const data = (await response.json()) as Settings;
        if (alive) setSettings(data);
      } catch {
        if (alive) setFeedback({ text: "Settings could not be loaded. Pull to retry.", error: true });
      } finally {
        if (alive) setSettingsLoading(false);
      }
    }
    void loadSettings();
    return () => {
      alive = false;
    };
  }, [getToken]);

  const saveSettings = async (patch: Partial<Settings>, label: string) => {
    setSaving(label);
    setFeedback(null);
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE}/api/settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(patch),
      });
      if (!response.ok) throw new Error("Save failed");
      setSettings((current) => current ? { ...current, ...patch } : current);
      setFeedback({ text: `${label} saved` });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return true;
    } catch {
      setFeedback({ text: `Could not save ${label.toLowerCase()}. Try again.`, error: true });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return false;
    } finally {
      setSaving(null);
    }
  };

  const saveKey = async (field: KeyField) => {
    const value = keyInputs[field.key]?.trim();
    if (!value) {
      setFeedback({ text: "Enter a provider key before saving.", error: true });
      return;
    }
    const saved = await saveSettings({ [field.key]: value } as Partial<Settings>, `${field.label} key`);
    if (saved) {
      setKeyEditor(null);
      setKeyInputs((current) => ({ ...current, [field.key]: "" }));
      setSettings((current) => current ? { ...current, [field.key]: maskKey(value) } : current);
    }
  };

  const removeKey = (field: KeyField) => {
    const remove = () => void saveSettings({ [field.key]: null }, `${field.label} key removed`);
    if (Platform.OS === "web") remove();
    else Alert.alert("Remove provider key?", `Remove the saved ${field.label} key from THERYN?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: remove },
    ]);
  };

  async function handleSignOut() {
    if (signingOut) return;
    const perform = async () => {
      setSigningOut(true);
      await signOut();
      router.replace("/(auth)");
      setSigningOut(false);
    };
    if (Platform.OS === "web") void perform();
    else Alert.alert("Sign out", "End this THERYN session on this device?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void perform() },
    ]);
  }

  const displayName = user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress || "THERYN user";
  const email = user?.primaryEmailAddress?.emailAddress;
  const initials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}` || displayName[0]?.toUpperCase() || "T";
  const webUrl = API_BASE || "https://theryn.app";

  return (
    <Animated.View style={[styles.root, { backgroundColor: colors.background }, transitionStyle]}>
      <SignalBackdrop />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.kicker}>THERYN / CONTROL</Text>
          <Text style={styles.title}>Account</Text>
        </View>
         <View style={styles.headerMark}><SignalMark size={34} /></View>
      </View>

      <KeyboardAwareScrollViewCompat
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, paddingBottom: TAB_HEIGHT + insets.bottom + 28, gap: 18 }}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={["#171717", "#080808"]} style={styles.profileCard}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initials.toUpperCase()}</Text><View style={styles.online} /></View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
            {email ? <Text style={styles.profileEmail} numberOfLines={1}>{email}</Text> : null}
            <View style={styles.activePill}><View style={styles.activeDot} /><Text style={styles.activeText}>SESSION ACTIVE</Text></View>
          </View>
        </LinearGradient>

        <Section title="PROVIDER KEYS">
          <View style={styles.keyIntro}>
            <View style={styles.keyIntroIcon}><Feather name="shield" size={15} color="#e5e5e5" /></View>
            <Text style={styles.keyIntroText}>Connect your own keys. Saved values are only shown here in masked form after saving.</Text>
          </View>
          {settingsLoading ? (
            <View style={styles.loadingRow}><View style={styles.skeletonWide} /><View style={styles.skeletonShort} /></View>
          ) : (
            KEY_FIELDS.map((field, index) => {
              const current = settings?.[field.key];
              const editing = keyEditor === field.key;
              return (
                <View key={field.key}>
                  {index > 0 ? <View style={styles.divider} /> : null}
                  <View style={styles.keyRow}>
                    <View style={[styles.keyIcon, { backgroundColor: `${field.color}18` }]}><Feather name={field.icon} size={15} color={field.color} /></View>
                    <View style={styles.keyCopy}>
                      <Text style={styles.keyLabel}>{field.label}</Text>
                      <Text style={styles.keyDetail}>{field.detail}</Text>
                    </View>
                    {current && !editing ? <View style={styles.connected}><View style={styles.connectedDot} /><Text style={styles.connectedText}>SET</Text></View> : null}
                  </View>
                  {editing ? (
                    <View style={styles.editor}>
                      <View style={styles.secretInputWrap}>
                        <TextInput
                          style={styles.secretInput}
                          value={keyInputs[field.key] ?? ""}
                          onChangeText={(value) => setKeyInputs((currentInputs) => ({ ...currentInputs, [field.key]: value }))}
                          placeholder={field.placeholder}
                          placeholderTextColor="rgba(255,255,255,0.2)"
                          secureTextEntry={!keyVisible[field.key]}
                          autoCapitalize="none"
                          autoCorrect={false}
                          testID={`settings-key-input-${field.key}`}
                        />
                        <Pressable onPress={() => setKeyVisible((currentVisible) => ({ ...currentVisible, [field.key]: !currentVisible[field.key] }))} testID={`settings-key-toggle-${field.key}`} style={styles.eyeButton} accessibilityLabel={keyVisible[field.key] ? "Hide key" : "Show key"}>
                          <Feather name={keyVisible[field.key] ? "eye-off" : "eye"} size={16} color="rgba(255,255,255,0.4)" />
                        </Pressable>
                      </View>
                      <View style={styles.editorActions}>
                        <Pressable onPress={() => void saveKey(field)} disabled={saving === field.label} style={styles.saveButton} testID={`settings-key-save-${field.key}`}>
                          {saving === field.label ? <ActivityIndicator size="small" color="#fff" /> : <><Feather name="check" size={14} color="#fff" /><Text style={styles.saveButtonText}>Save key</Text></>}
                        </Pressable>
                        <Pressable onPress={() => setKeyEditor(null)} style={styles.cancelButton} testID={`settings-key-cancel-${field.key}`}><Text style={styles.cancelText}>Cancel</Text></Pressable>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.keyValueRow}>
                      <Text style={styles.keyValue} numberOfLines={1}>{current ?? "Not connected"}</Text>
                      <Pressable onPress={() => setKeyEditor(field.key)} style={styles.smallButton} testID={`settings-key-edit-${field.key}`}><Feather name={current ? "edit-2" : "plus"} size={13} color="rgba(255,255,255,0.65)" /><Text style={styles.smallButtonText}>{current ? "Update" : "Connect"}</Text></Pressable>
                      {current ? <Pressable onPress={() => removeKey(field)} style={styles.removeButton} testID={`settings-key-remove-${field.key}`}><Feather name="trash-2" size={13} color="#d4d4d4" /></Pressable> : null}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </Section>

        {feedback ? <View style={[styles.feedback, feedback.error && styles.feedbackError]}><Feather name={feedback.error ? "alert-circle" : "check-circle"} size={15} color={feedback.error ? "#d4d4d4" : "#a3a3a3"} /><Text style={styles.feedbackText}>{feedback.text}</Text></View> : null}

        <Section title="AI ENGINES">
          <Row icon="cpu" label="Theryn" value="GPT-5" color="#e5e5e5" />
          <View style={styles.divider} />
          <Row icon="zap" label="Vesper" value="Claude" color="#c4c4c4" />
          <View style={styles.divider} />
          <Row icon="layers" label="Prism" value="Grok 4.3" color="#a3a3a3" />
        </Section>

        <Section title="RESOURCES">
          <Row icon="globe" label="Open web command center" color="#e5e5e5" onPress={() => { Haptics.selectionAsync(); void Linking.openURL(webUrl); }} testID="settings-open-web" />
          <View style={styles.divider} />
          <Row icon="download" label="Download for desktop" color="#e5e5e5" onPress={() => { Haptics.selectionAsync(); void Linking.openURL(`${webUrl}/downloads`); }} testID="settings-download" />
        </Section>

        <Section title="APP">
          <Row icon="info" label="Version" value="1.0.0" />
          <View style={styles.divider} />
          <Row icon="server" label="API server" value="Connected" color="#d4d4d4" />
          <View style={styles.divider} />
          <Row icon="shield" label="Authentication" value="Clerk" color="#a3a3a3" />
        </Section>

        <Pressable onPress={() => void handleSignOut()} disabled={signingOut} style={({ pressed }) => [styles.signOut, pressed && styles.pressed]} testID="settings-sign-out">
          {signingOut ? <ActivityIndicator size="small" color="#d4d4d4" /> : <><Feather name="log-out" size={16} color="#d4d4d4" /><Text style={styles.signOutText}>Sign out</Text></>}
        </Pressable>
      </KeyboardAwareScrollViewCompat>
    </Animated.View>
  );
}

function maskKey(value: string) {
  return value.length <= 8 ? "••••••••" : `${value.slice(0, 4)}••••••••${value.slice(-4)}`;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" },
  kicker: { fontFamily: "Inter_600SemiBold", fontSize: 9, color: "#d4d4d4", letterSpacing: 1.7, marginBottom: 3 },
  title: { fontFamily: "Inter_700Bold", fontSize: 22, color: "#f0eeee", letterSpacing: -0.3 },
  headerMark: { width: 34, height: 34, borderRadius: 11, backgroundColor: "#171717", alignItems: "center", justifyContent: "center" },
  headerMarkText: { fontFamily: "Inter_700Bold", fontSize: 17, color: "#fff" },
  profileCard: { flexDirection: "row", alignItems: "center", padding: 18, borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", gap: 14 },
  avatar: { width: 55, height: 55, borderRadius: 18, backgroundColor: "#303030", alignItems: "center", justifyContent: "center", position: "relative" },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 20, color: "#fff" },
  online: { width: 11, height: 11, borderRadius: 6, backgroundColor: "#e5e5e5", borderWidth: 2, borderColor: "#111111", position: "absolute", right: -1, bottom: -1 },
  profileInfo: { flex: 1, gap: 3 },
  profileName: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },
  profileEmail: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.43)" },
  activePill: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  activeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#d4d4d4" },
  activeText: { fontFamily: "Inter_600SemiBold", fontSize: 8, letterSpacing: 1.1, color: "#d4d4d4" },
  section: { gap: 8 },
  sectionLabel: { fontFamily: "Inter_600SemiBold", fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 1.6, marginLeft: 4 },
  card: { backgroundColor: "#161414", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 15, paddingVertical: 13 },
  rowIcon: { width: 30, height: 30, borderRadius: 9, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  rowLabel: { fontFamily: "Inter_500Medium", fontSize: 14, color: "rgba(255,255,255,0.82)" },
  rowFill: { flex: 1 },
  rowValue: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.35)" },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.055)", marginLeft: 57 },
  keyIntro: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, backgroundColor: "rgba(255,255,255,0.05)", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.12)" },
  keyIntroIcon: { width: 28, height: 28, borderRadius: 9, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  keyIntroText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 16, color: "rgba(255,255,255,0.48)" },
  keyRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingTop: 14 },
  keyIcon: { width: 31, height: 31, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  keyCopy: { flex: 1, gap: 2 },
  keyLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "rgba(255,255,255,0.86)" },
  keyDetail: { fontFamily: "Inter_400Regular", fontSize: 10, color: "rgba(255,255,255,0.32)" },
  connected: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.08)" },
  connectedDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#d4d4d4" },
  connectedText: { fontFamily: "Inter_600SemiBold", fontSize: 8, letterSpacing: 0.8, color: "#d4d4d4" },
  keyValueRow: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14 },
  keyValue: { flex: 1, fontFamily: "SpaceMono", fontSize: 11, color: "rgba(255,255,255,0.38)" },
  smallButton: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 9, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.09)" },
  smallButtonText: { fontFamily: "Inter_500Medium", fontSize: 10, color: "rgba(255,255,255,0.65)" },
  removeButton: { width: 31, height: 31, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.07)" },
  editor: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14, gap: 9 },
  secretInputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#101010", borderWidth: 1, borderColor: "rgba(255,255,255,0.24)", borderRadius: 11, paddingLeft: 12 },
  secretInput: { flex: 1, minHeight: 42, fontFamily: "Inter_400Regular", fontSize: 13, color: "#fff" },
  eyeButton: { padding: 12 },
  editorActions: { flexDirection: "row", gap: 8 },
  saveButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 10, backgroundColor: "#333333" },
  saveButtonText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#fff" },
  cancelButton: { justifyContent: "center", paddingHorizontal: 12, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.06)" },
  cancelText: { fontFamily: "Inter_500Medium", fontSize: 12, color: "rgba(255,255,255,0.55)" },
  feedback: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: -8, padding: 12, borderRadius: 11, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" },
  feedbackError: { backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.14)" },
  feedbackText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 12, color: "rgba(255,255,255,0.7)" },
  loadingRow: { gap: 10, padding: 16 },
  skeletonWide: { height: 44, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.06)" },
  skeletonShort: { height: 12, width: "45%", borderRadius: 6, backgroundColor: "rgba(255,255,255,0.04)" },
  signOut: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" },
  signOutText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#d4d4d4" },
  pressed: { opacity: 0.68 },
});