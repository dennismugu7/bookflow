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
  // Sampled from Dennis's owner designs (design-ref/original-owner, ADR 0009).
  blue: "#0075FF",
  inputBlue: "#1A73E8",
  sheetInput: "#93C5F2",
  welcomeGreen: "#2EE07E",
  fabTeal: "#4DD0D9",
  fabBlue: "#2196F3",
  openDot: "#7ACC48",
  avatarGreen: "#3CC42A",
  forest: "#2E4A27",
  band: "#F4F4F4",
  cardBorder: "#E6E6E6",
  text: "#333333",
  placeholder: "#9AA5B4",
  chipBlueTint: "#D3E6FC",
  chipBlueText: "#2A63B8",
  // Approved redesign (docs/design/owner-v2, Dennis 2026-10-04), sampled from the mockups.
  action: "#1E7BF2",
  actionTint: "#EEF5FF",
  field: "#DAD8E0",
  hairline: "#EEEDF2",
  cardLine: "#E7E6EC",
  softFill: "#F4F3F7",
  subtle: "#6B6878",
  faint: "#9A97A6",
  required: "#D92D20",
  openDotV2: "#5BC236",
  closedDot: "#CFCDD6",
  menuGreen: "#3DBE29",
  // Phase 4a Today (docs/design/owner-v3, Dennis 2026-10-04), sampled from the mockups.
  doneTint: "#DDF3E6",
  newTint: "#F1EEFB",
  attentionSoft: "#FDF1DC",
  attentionInk: "#6B3E00",
  scrim: "rgba(22, 19, 31, 0.45)",
} as const;

/** Urbanist (400–700; see docs/design/README.md); React Native needs one family per weight. */
export const fonts = {
  regular: "Urbanist_400Regular",
  medium: "Urbanist_500Medium",
  semibold: "Urbanist_600SemiBold",
  bold: "Urbanist_700Bold",
} as const;

export const type = {
  display: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34 },
  title: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28 },
  heading: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  figure: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 38 },
} as const;

export const radius = 12;

/** 4 px grid: space(4) = 16. */
export const space = (steps: number) => steps * 4;

/** Inputs and main buttons are 52 px; every touch target is at least 44 px. */
export const controlHeight = 52;
export const minTouch = 44;
