export const depth = {
  subtle: {
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 2,
  },
  elevated: {
    shadowOpacity: 0.09,
    shadowRadius: 24,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    elevation: 4,
  },
  floating: {
    shadowOpacity: 0.14,
    shadowRadius: 32,
    shadowOffset: {
      width: 0,
      height: 14,
    },
    elevation: 7,
  },
} as const;
