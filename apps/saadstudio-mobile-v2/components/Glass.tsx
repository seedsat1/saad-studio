import { PropsWithChildren } from "react";
import { StyleSheet, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { colors, radii } from "@/constants/theme";

type GlassProps = PropsWithChildren<{
  style?: ViewStyle;
  intensity?: number;
}>;

export function Glass({ children, style, intensity = 24 }: GlassProps) {
  return (
    <BlurView intensity={intensity} tint="dark" style={[styles.glass, style]}>
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  glass: {
    overflow: "hidden",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel
  }
});

