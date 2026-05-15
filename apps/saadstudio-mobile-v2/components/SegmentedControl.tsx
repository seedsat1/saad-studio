import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii } from "@/constants/theme";

type Item = {
  label: string;
  value: string;
};

type SegmentedControlProps = {
  items: Item[];
  value: string;
  onChange: (value: string) => void;
};

export function SegmentedControl({ items, value, onChange }: SegmentedControlProps) {
  return (
    <View style={styles.track}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <Pressable key={item.value} onPress={() => onChange(item.value)} style={[styles.item, active && styles.activeItem]}>
            <Text style={[styles.label, active && styles.activeLabel]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    gap: 6,
    padding: 5,
    borderRadius: radii.md,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)"
  },
  item: {
    flex: 1,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9
  },
  activeItem: {
    backgroundColor: "#f6f8ff"
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  activeLabel: {
    color: "#090d18"
  }
});

