declare module "lucide-react-native" {
  import type { ComponentType } from "react";
  import type { SvgProps } from "react-native-svg";

  export type LucideIcon = ComponentType<
    SvgProps & {
      size?: number;
      color?: string;
      strokeWidth?: number;
      fill?: string;
    }
  >;

  export const Aperture: LucideIcon;
  export const AudioLines: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const Clapperboard: LucideIcon;
  export const Clock3: LucideIcon;
  export const Compass: LucideIcon;
  export const Image: LucideIcon;
  export const Layers3: LucideIcon;
  export const Play: LucideIcon;
  export const Plus: LucideIcon;
  export const SlidersHorizontal: LucideIcon;
  export const Sparkles: LucideIcon;
  export const UserRound: LucideIcon;
  export const WandSparkles: LucideIcon;
}

