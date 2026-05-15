import { LucideIcon, Clapperboard, Compass, Layers3, Sparkles, UserRound } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, shadow } from "@/constants/theme";

const tabs: Array<{ id: string; label: string; Icon: LucideIcon }> = [
  { id: "create", label: "Create", Icon: Sparkles },
  { id: "explore", label: "Explore", Icon: Compass },
  { id: "scene", label: "Scene", Icon: Clapperboard },
  { id: "assets", label: "Assets", Icon: Layers3 },
  { id: "profile", label: "Profile", Icon: UserRound }
];

type BottomNavProps = {
  value: string;
  onChange: (value: string) => void;
};

export function BottomNav({ value, onChange }: BottomNavProps) {
  return (
    <View style={styles.wrap}>
      {tabs.map(({ id, label, Icon }) => {
        const active = value === id;
        return (
          <Pressable key={id} onPress={() => onChange(id)} style={[styles.tab, active && styles.activeTab]}>
            <Icon size={active ? 19 : 18} color={active ? colors.ink : colors.muted} strokeWidth={2.4} />
            {active && <Text style={styles.activeLabel}>{label}</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 14,
    height: 66,
    padding: 8,
    borderRadius: radii.xl,
    backgroundColor: "rgba(8, 13, 25, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...shadow
  },
  tab: {
    height: 48,
    minWidth: 46,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
    borderRadius: 18
  },
  activeTab: {
    backgroundColor: colors.text
  },
  activeLabel: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800"
  }
});

