import C from "@/constants/colors";

const extended = {
  ...C,
  primary: C.gold,
  primaryForeground: C.bgDark,
  background: C.bg,
  foreground: C.white,
  mutedForeground: C.textMuted,
  radius: 8,
};

export function useColors() {
  return extended;
}
