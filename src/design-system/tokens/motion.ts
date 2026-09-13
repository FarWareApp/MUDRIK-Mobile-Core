export const motion = {
  duration: {
    instant: 0,
    quick: 120,
    fast: 160,
    standard: 220,
    deliberate: 320,
  },

  stagger: {
    compact: 24,
    standard: 36,
  },

  spring: {
    responsive: {
      damping: 22,
      stiffness: 280,
      mass: 0.8,
    },

    gentle: {
      damping: 24,
      stiffness: 210,
      mass: 0.9,
    },
  },

  press: {
    scale: 0.97,
    subtleScale: 0.985,
  },
} as const;
