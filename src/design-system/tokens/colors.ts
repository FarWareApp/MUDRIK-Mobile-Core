export const lightColors = {
  background: '#F2F0EA',
  surface: '#FBFAF6',
  surfaceElevated: '#EAE8E1',
  surfaceInput: '#EFEEE8',
  surfacePressed: '#E2E0D8',
  textPrimary: '#151714',
  textSecondary: '#686B64',
  border: '#D9D6CD',
  accent: '#0E6B57',
  accentSoft: 'rgba(14,107,87,0.13)',
  accentText: '#F8FFF9',
  success: '#2A8C65',
  warning: '#A7742C',
  error: '#C94A3C',
  overlay: 'rgba(10,12,10,0.42)',
  shadow: 'rgba(29,31,27,0.18)',
} as const;

export const darkColors = {
  background: '#070907',
  surface: '#101411',
  surfaceElevated: '#171D19',
  surfaceInput: '#131814',
  surfacePressed: '#1B231E',
  textPrimary: '#F4F1E9',
  textSecondary: '#A9ADA5',
  border: '#29312B',
  accent: '#59CBA4',
  accentSoft: 'rgba(89,203,164,0.16)',
  accentText: '#06100C',
  success: '#62D3A4',
  warning: '#D1A25E',
  error: '#F07A68',
  overlay: 'rgba(0,0,0,0.68)',
  shadow: 'rgba(0,0,0,0.52)',
} as const;

export type AppColors = {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceInput: string;
  surfacePressed: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  success: string;
  warning: string;
  error: string;
  overlay: string;
  shadow: string;
};
