import {
  Compass,
  Users,
  Gauge,
  BellRing,
  FileText,
  Activity,
  Clock,
  SlidersHorizontal,
  BadgeCheck,
  Globe,
  ShieldAlert,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";

// Maps the icon name stored on a training module to its Lucide component.
// Falls back to GraduationCap for any unknown name.
const ICON_MAP: Record<string, LucideIcon> = {
  Compass,
  Users,
  Gauge,
  BellRing,
  FileText,
  Activity,
  Clock,
  SlidersHorizontal,
  BadgeCheck,
  Globe,
  ShieldAlert,
  GraduationCap,
};

export const TRAINING_ICON_NAMES = Object.keys(ICON_MAP);

export function trainingIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? GraduationCap;
}
