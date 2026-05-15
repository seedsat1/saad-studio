import { useMemo, useRef, useState } from "react";
import {
  Animated,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import {
  Aperture,
  AudioLines,
  ChevronDown,
  Clock3,
  Image as ImageIcon,
  Play,
  Plus,
  SlidersHorizontal,
  Sparkles,
  WandSparkles
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BottomNav } from "@/components/BottomNav";
import { Glass } from "@/components/Glass";
import { SegmentedControl } from "@/components/SegmentedControl";
import { colors, radii, shadow } from "@/constants/theme";

const heroFrames = [
  "https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=1400&q=85",
  "https://images.unsplash.com/photo-1604076913837-52ab5629fba9?auto=format&fit=crop&w=1400&q=85"
];

const sceneShots = [
  { id: "01", label: "Opener", duration: "3s", tone: "blue hour" },
  { id: "02", label: "Product orbit", duration: "5s", tone: "chrome" },
  { id: "03", label: "Hero reveal", duration: "4s", tone: "gold rim" }
];

const modelPills = ["Veo 3.1", "Kling 2.1", "Seedance", "Nano Banana"];

export default function HomeScreen() {
  const [tab, setTab] = useState("create");
  const [mode, setMode] = useState("video");
  const [aspect, setAspect] = useState("9:16");
  const [quality, setQuality] = useState("pro");
  const [duration, setDuration] = useState("8s");
  const [sound, setSound] = useState(true);
  const [prompt, setPrompt] = useState(
    "Cinematic luxury perfume reveal, macro glass reflections, slow orbit camera, rain-lit neon street, premium commercial lighting"
  );
  const pulse = useRef(new Animated.Value(1)).current;

  const heroImage = useMemo(() => heroFrames[mode === "video" ? 0 : 1], [mode]);

  const tap = (action: () => void) => {
    Haptics.selectionAsync().catch(() => undefined);
    action();
  };

  const pulseGenerate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    Animated.sequence([
      Animated.timing(pulse, { toValue: 0.97, duration: 90, useNativeDriver: true }),
      Animated.spring(pulse, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true })
    ]).start();
  };

  return (
    <ImageBackground source={{ uri: heroImage }} resizeMode="cover" style={styles.root}>
      <LinearGradient colors={["rgba(5,7,17,0.46)", colors.ink, "#070d16"]} locations={[0, 0.42, 1]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboard}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <View>
                <Text style={styles.kicker}>SAAD STUDIO MOBILE</Text>
                <Text style={styles.title}>Cinematic AI Console</Text>
              </View>
              <Pressable style={styles.avatar}>
                <Sparkles size={18} color={colors.lime} />
              </Pressable>
            </View>

            <View style={styles.hero}>
              <Glass style={styles.liveBadge} intensity={18}>
                <Aperture size={15} color={colors.cyan} />
                <Text style={styles.liveBadgeText}>Scene-ready</Text>
              </Glass>
              <Text style={styles.heroTitle}>Design the shot, not just the prompt.</Text>
              <View style={styles.modelRow}>
                {modelPills.map((item) => (
                  <View key={item} style={styles.modelPill}>
                    <Text style={styles.modelPillText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>

            <Glass style={styles.composer}>
              <View style={styles.composerTop}>
                <SegmentedControl
                  value={mode}
                  onChange={(value) => tap(() => setMode(value))}
                  items={[
                    { label: "Video", value: "video" },
                    { label: "Image", value: "image" },
                    { label: "Audio", value: "audio" }
                  ]}
                />
                <Pressable style={styles.modelSelect}>
                  <Text style={styles.modelSelectText}>{mode === "image" ? "Nano Pro" : "Veo 3.1"}</Text>
                  <ChevronDown size={14} color={colors.muted} />
                </Pressable>
              </View>

              <TextInput
                value={prompt}
                onChangeText={setPrompt}
                multiline
                placeholder="Describe camera, subject, light, mood, lens, action..."
                placeholderTextColor={colors.dim}
                style={styles.prompt}
              />

              <View style={styles.toolRow}>
                <Pressable style={styles.toolButton}>
                  <WandSparkles size={16} color={colors.lime} />
                  <Text style={styles.toolText}>Enhance</Text>
                </Pressable>
                <Pressable style={styles.toolButton}>
                  <ImageIcon size={16} color={colors.cyan} />
                  <Text style={styles.toolText}>Reference</Text>
                </Pressable>
                <Pressable style={styles.toolButton}>
                  <SlidersHorizontal size={16} color={colors.amber} />
                  <Text style={styles.toolText}>Negative</Text>
                </Pressable>
              </View>
            </Glass>

            <View style={styles.controlsGrid}>
              <Glass style={styles.controlCard}>
                <Text style={styles.cardLabel}>Aspect</Text>
                <SegmentedControl
                  value={aspect}
                  onChange={(value) => tap(() => setAspect(value))}
                  items={[
                    { label: "9:16", value: "9:16" },
                    { label: "1:1", value: "1:1" },
                    { label: "16:9", value: "16:9" }
                  ]}
                />
              </Glass>

              <Glass style={styles.controlCard}>
                <Text style={styles.cardLabel}>Quality</Text>
                <SegmentedControl
                  value={quality}
                  onChange={(value) => tap(() => setQuality(value))}
                  items={[
                    { label: "Fast", value: "fast" },
                    { label: "Pro", value: "pro" },
                    { label: "Ultra", value: "ultra" }
                  ]}
                />
              </Glass>

              <Glass style={styles.controlCard}>
                <View style={styles.inlineHeader}>
                  <Clock3 size={15} color={colors.rose} />
                  <Text style={styles.cardLabel}>Duration</Text>
                </View>
                <SegmentedControl
                  value={duration}
                  onChange={(value) => tap(() => setDuration(value))}
                  items={[
                    { label: "5s", value: "5s" },
                    { label: "8s", value: "8s" },
                    { label: "12s", value: "12s" }
                  ]}
                />
              </Glass>

              <Glass style={styles.controlCard}>
                <View style={styles.switchLine}>
                  <View style={styles.inlineHeader}>
                    <AudioLines size={15} color={colors.cyan} />
                    <Text style={styles.cardLabel}>Sound</Text>
                  </View>
                  <Switch
                    value={sound}
                    onValueChange={(value: boolean) => tap(() => setSound(value))}
                    trackColor={{ false: "rgba(255,255,255,0.12)", true: "rgba(33,212,253,0.45)" }}
                    thumbColor={sound ? colors.cyan : "#6b7280"}
                  />
                </View>
              </Glass>
            </View>

            <Glass style={styles.timeline}>
              <View style={styles.timelineHead}>
                <Text style={styles.sectionTitle}>Scene Studio Timeline</Text>
                <Pressable style={styles.addShot}>
                  <Plus size={16} color={colors.text} />
                </Pressable>
              </View>
              <View style={styles.shotRail}>
                {sceneShots.map((shot, index) => (
                  <View key={shot.id} style={styles.shotCard}>
                    <Text style={styles.shotId}>{shot.id}</Text>
                    <View style={styles.shotPreview}>
                      <LinearGradient
                        colors={index === 1 ? ["#21d4fd", "#0f172a"] : index === 2 ? ["#f8c156", "#40151f"] : ["#8b5cf6", "#07111e"]}
                        style={StyleSheet.absoluteFill}
                      />
                    </View>
                    <Text style={styles.shotLabel}>{shot.label}</Text>
                    <Text style={styles.shotMeta}>{shot.duration} / {shot.tone}</Text>
                  </View>
                ))}
              </View>
            </Glass>

            <Animated.View style={{ transform: [{ scale: pulse }] }}>
              <Pressable style={styles.generateButton} onPress={pulseGenerate}>
                <LinearGradient colors={[colors.lime, colors.cyan]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                <Play size={18} color={colors.ink} fill={colors.ink} />
                <Text style={styles.generateText}>Generate cinematic run</Text>
              </Pressable>
            </Animated.View>
          </ScrollView>
          <BottomNav value={tab} onChange={(value) => tap(() => setTab(value))} />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  safe: { flex: 1 },
  keyboard: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 110 },
  header: { height: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  kicker: { color: colors.cyan, fontSize: 11, fontWeight: "800", letterSpacing: 0 },
  title: { color: colors.text, fontSize: 25, lineHeight: 31, fontWeight: "900" },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.line
  },
  hero: { minHeight: 250, justifyContent: "flex-end", paddingBottom: 18 },
  liveBadge: { alignSelf: "flex-start", height: 34, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 12 },
  liveBadgeText: { color: colors.text, fontSize: 12, fontWeight: "800" },
  heroTitle: { color: colors.text, fontSize: 37, lineHeight: 42, fontWeight: "900", maxWidth: 330 },
  modelRow: { marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  modelPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)"
  },
  modelPillText: { color: colors.text, fontSize: 12, fontWeight: "800" },
  composer: { padding: 14, ...shadow },
  composerTop: { flexDirection: "row", gap: 10, alignItems: "center" },
  modelSelect: {
    height: 46,
    minWidth: 102,
    paddingHorizontal: 11,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "rgba(255,255,255,0.055)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5
  },
  modelSelectText: { color: colors.text, fontSize: 12, fontWeight: "800" },
  prompt: {
    marginTop: 14,
    minHeight: 128,
    color: colors.text,
    fontSize: 16,
    lineHeight: 23,
    textAlignVertical: "top",
    padding: 14,
    borderRadius: radii.md,
    backgroundColor: "rgba(0,0,0,0.28)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)"
  },
  toolRow: { marginTop: 12, flexDirection: "row", gap: 8 },
  toolButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.line
  },
  toolText: { color: colors.text, fontSize: 12, fontWeight: "800" },
  controlsGrid: { marginTop: 12, gap: 10 },
  controlCard: { padding: 12 },
  cardLabel: { color: colors.muted, fontSize: 12, fontWeight: "800", marginBottom: 9 },
  inlineHeader: { flexDirection: "row", alignItems: "center", gap: 7 },
  switchLine: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  timeline: { marginTop: 12, padding: 14 },
  timelineHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "900" },
  addShot: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.line
  },
  shotRail: { flexDirection: "row", gap: 10 },
  shotCard: { flex: 1, minWidth: 0 },
  shotId: { color: colors.dim, fontSize: 11, fontWeight: "900", marginBottom: 7 },
  shotPreview: { height: 86, borderRadius: radii.md, overflow: "hidden", borderWidth: 1, borderColor: colors.line, marginBottom: 8 },
  shotLabel: { color: colors.text, fontSize: 12, fontWeight: "900" },
  shotMeta: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 2 },
  generateButton: {
    marginTop: 14,
    height: 58,
    overflow: "hidden",
    borderRadius: radii.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    ...shadow
  },
  generateText: { color: colors.ink, fontSize: 15, fontWeight: "900" }
});
