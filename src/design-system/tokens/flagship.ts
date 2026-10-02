export const flagshipPalette = {
  light: {
    canvas: [
      '#F3F0E9',
      '#ECEEE8',
      '#E8ECE6',
    ] as const,
    canvasGlowPrimary:
      'rgba(16,104,84,0.16)',
    canvasGlowSecondary:
      'rgba(171,138,81,0.10)',
    canvasGlowTertiary:
      'rgba(41,59,48,0.06)',
    hero: [
      '#FBFAF6',
      '#F2F0EA',
      '#E9ECE7',
    ] as const,
    heroStrong: [
      '#FEFCF7',
      '#F0EFE8',
      '#E4EAE5',
    ] as const,
    primaryAction: [
      '#0A4035',
      '#0D5646',
      '#156A55',
    ] as const,
    primaryActionPressed: [
      '#072F28',
      '#0A4438',
      '#115545',
    ] as const,
    primaryActionText:
      '#F7F4EC',
    secondaryAction: [
      '#F7F4EC',
      '#E9ECE6',
    ] as const,
    card: [
      '#FAF8F2',
      '#F1F0EA',
      '#EAECE7',
    ] as const,
    hairline:
      'rgba(21,67,54,0.20)',
    shine:
      'rgba(255,255,255,0.88)',
    glow:
      'rgba(20,128,103,0.22)',
    warmGlow:
      'rgba(183,146,84,0.15)',
    metal:
      '#B89A67',
  },
  dark: {
    canvas: [
      '#050706',
      '#08100C',
      '#0B0E0B',
    ] as const,
    canvasGlowPrimary:
      'rgba(41,139,109,0.20)',
    canvasGlowSecondary:
      'rgba(177,139,78,0.10)',
    canvasGlowTertiary:
      'rgba(88,109,93,0.08)',
    hero: [
      '#131A16',
      '#0E1511',
      '#0A0D0B',
    ] as const,
    heroStrong: [
      '#17211C',
      '#0E1813',
      '#090D0A',
    ] as const,
    primaryAction: [
      '#092F28',
      '#0C493B',
      '#12614D',
    ] as const,
    primaryActionPressed: [
      '#06251F',
      '#09392F',
      '#0E4D3E',
    ] as const,
    primaryActionText:
      '#F6F2E8',
    secondaryAction: [
      '#18201B',
      '#101612',
    ] as const,
    card: [
      '#151B17',
      '#101612',
      '#0C100D',
    ] as const,
    hairline:
      'rgba(100,168,140,0.22)',
    shine:
      'rgba(255,250,239,0.10)',
    glow:
      'rgba(72,187,147,0.26)',
    warmGlow:
      'rgba(196,157,92,0.16)',
    metal:
      '#C3A56F',
  },
} as const;

export type FlagshipPalette =
  (typeof flagshipPalette)[
    keyof typeof flagshipPalette
  ];
