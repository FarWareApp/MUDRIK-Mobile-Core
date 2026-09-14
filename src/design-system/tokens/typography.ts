export const typography = {
  title: 22,
  heading: 18,
  body: 16,
  secondary: 14,
  caption: 12,
  micro: 11,
} as const;

export const typeScale = {
  title: {
    fontSize: typography.title,
    lineHeight: 28,
  },
  heading: {
    fontSize: typography.heading,
    lineHeight: 24,
  },
  body: {
    fontSize: typography.body,
    lineHeight: 23,
  },
  secondary: {
    fontSize: typography.secondary,
    lineHeight: 20,
  },
  caption: {
    fontSize: typography.caption,
    lineHeight: 16,
  },
  micro: {
    fontSize: typography.micro,
    lineHeight: 15,
  },
} as const;
