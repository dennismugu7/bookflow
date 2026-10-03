/** Design-system tokens (docs/design/bookflow-design-system.png). */

export const colors = {
  brand: "#3A1FA8",
  select: "#5B45E0",
  ink: "#16131F",
  muted: "#5E5A6B",
  surface: "#F6F5FA",
  success: "#1E7F4F",
  attention: "#F0A030",
  danger: "#B42318",
  white: "#FFFFFF",
  border: "#E2E0EA",
  borderStrong: "#C9C5D6",
  // Badge and soft-button tints, paired with readable text colours.
  successTint: "#E3F3EA",
  attentionTint: "#FCEFD9",
  attentionText: "#7A4A00",
  brandTint: "#ECE8FB",
  dangerTint: "#FCE8E6",
} as const;

/** Plus Jakarta Sans; React Native needs one family per weight. */
export const fonts = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semibold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  extrabold: "PlusJakartaSans_800ExtraBold",
} as const;

export const type = {
  display: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34 },
  title: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28 },
  heading: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  figure: { fontFamily: fonts.extrabold, fontSize: 32, lineHeight: 38 },
} as const;

export const radius = 12;

/** 4 px grid: space(4) = 16. */
export const space = (steps: number) => steps * 4;

/** Inputs and main buttons are 52 px; every touch target is at least 44 px. */
export const controlHeight = 52;
export const minTouch = 44;
